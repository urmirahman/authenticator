package passkeys

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/auth"
)

const challengeTTL = 5 * time.Minute

var (
	ErrChallenge   = errors.New("unknown or expired challenge")
	ErrVerify      = errors.New("passkey verification failed")
	ErrNotFound    = errors.New("passkey not found")
	ErrInvalidName = errors.New("name must be 1-60 characters")
)

// TokenIssuer is the slice of the auth service we need (start a session after passkey login).
type TokenIssuer interface {
	IssueForUser(ctx context.Context, userID uuid.UUID, meta auth.SessionMeta) (auth.Tokens, error)
}

// Service runs the two WebAuthn ceremonies:
//
//	register: Begin -> device creates a key pair -> Finish verifies attestation -> store public key
//	login:    Begin (discoverable, no username) -> device signs challenge -> Finish verifies -> tokens
//
// The challenge (SessionData) is stored server-side between begin and finish and used once.
type Service struct {
	wa     *webauthn.WebAuthn
	repo   Repository
	tokens TokenIssuer
	now    func() time.Time
}

func NewService(wa *webauthn.WebAuthn, repo Repository, tokens TokenIssuer) *Service {
	return &Service{wa: wa, repo: repo, tokens: tokens, now: time.Now}
}

// NewWebAuthn builds the relying-party config. RPID is your domain (no scheme/port).
func NewWebAuthn(rpID, rpName string, origins []string) (*webauthn.WebAuthn, error) {
	return webauthn.New(&webauthn.Config{RPID: rpID, RPDisplayName: rpName, RPOrigins: origins})
}

func (s *Service) loadUser(ctx context.Context, userID uuid.UUID) (*webauthnUser, error) {
	u, err := s.repo.GetUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	rows, err := s.repo.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	return newWebauthnUser(u, rows), nil
}

func (s *Service) saveSession(ctx context.Context, userID uuid.UUID, kind string, sd *webauthn.SessionData) (uuid.UUID, error) {
	b, err := json.Marshal(sd)
	if err != nil {
		return uuid.Nil, err
	}
	return s.repo.SaveChallenge(ctx, db.CreateChallengeParams{
		UserID: uuid.NullUUID{UUID: userID, Valid: userID != uuid.Nil}, Kind: kind,
		SessionData: b, ExpiresAt: s.now().Add(challengeTTL),
	})
}

func (s *Service) takeSession(ctx context.Context, id uuid.UUID, kind string) (webauthn.SessionData, uuid.NullUUID, error) {
	ch, err := s.repo.ConsumeChallenge(ctx, id, kind)
	if errors.Is(err, pgx.ErrNoRows) {
		return webauthn.SessionData{}, uuid.NullUUID{}, ErrChallenge
	}
	if err != nil {
		return webauthn.SessionData{}, uuid.NullUUID{}, err
	}
	var sd webauthn.SessionData
	if err := json.Unmarshal(ch.SessionData, &sd); err != nil {
		return webauthn.SessionData{}, uuid.NullUUID{}, err
	}
	return sd, ch.UserID, nil
}

// BeginRegister: requires a signed-in user. Existing passkeys are excluded so the same
// authenticator isn't registered twice. Resident key = discoverable = a real "passkey".
func (s *Service) BeginRegister(ctx context.Context, userID uuid.UUID) (BeginResponse, error) {
	u, err := s.loadUser(ctx, userID)
	if err != nil {
		return BeginResponse{}, err
	}
	exclude := make([]protocol.CredentialDescriptor, 0, len(u.credentials))
	for _, c := range u.credentials {
		exclude = append(exclude, c.Descriptor())
	}
	opts, sd, err := s.wa.BeginRegistration(u,
		webauthn.WithExclusions(exclude),
		webauthn.WithResidentKeyRequirement(protocol.ResidentKeyRequirementRequired),
	)
	if err != nil {
		return BeginResponse{}, err
	}
	id, err := s.saveSession(ctx, userID, "register", sd)
	if err != nil {
		return BeginResponse{}, err
	}
	return BeginResponse{ChallengeID: id, Options: opts}, nil
}

func (s *Service) FinishRegister(ctx context.Context, userID uuid.UUID, req FinishRequest) (Passkey, error) {
	sd, owner, err := s.takeSession(ctx, req.ChallengeID, "register")
	if err != nil {
		return Passkey{}, err
	}
	if !owner.Valid || owner.UUID != userID {
		return Passkey{}, ErrChallenge
	}
	u, err := s.loadUser(ctx, userID)
	if err != nil {
		return Passkey{}, err
	}
	parsed, err := protocol.ParseCredentialCreationResponseBody(bytes.NewReader(req.Credential))
	if err != nil {
		return Passkey{}, errors.Join(ErrVerify, err)
	}
	cred, err := s.wa.CreateCredential(u, sd, parsed)
	if err != nil {
		return Passkey{}, errors.Join(ErrVerify, err)
	}
	raw, _ := json.Marshal(cred)
	transports := make([]string, 0, len(cred.Transport))
	for _, t := range cred.Transport {
		transports = append(transports, string(t))
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = "Passkey"
	}
	row, err := s.repo.Create(ctx, db.CreatePasskeyParams{
		UserID: userID, CredentialID: cred.ID, PublicKey: cred.PublicKey,
		SignCount: int64(cred.Authenticator.SignCount), Aaguid: cred.Authenticator.AAGUID,
		Transports: transports, BackupEligible: cred.Flags.BackupEligible, BackupState: cred.Flags.BackupState,
		Name: name, Credential: raw,
	})
	if err != nil {
		return Passkey{}, err
	}
	return fromDB(row), nil
}

// BeginLogin: no username needed; the device shows the passkeys it has for our RP ID.
func (s *Service) BeginLogin(ctx context.Context) (BeginResponse, error) {
	opts, sd, err := s.wa.BeginDiscoverableLogin()
	if err != nil {
		return BeginResponse{}, err
	}
	id, err := s.saveSession(ctx, uuid.Nil, "login", sd)
	if err != nil {
		return BeginResponse{}, err
	}
	return BeginResponse{ChallengeID: id, Options: opts}, nil
}

// FinishLogin verifies the signature, bumps the sign counter and starts a session.
func (s *Service) FinishLogin(ctx context.Context, req FinishRequest, meta auth.SessionMeta) (auth.Tokens, error) {
	sd, _, err := s.takeSession(ctx, req.ChallengeID, "login")
	if err != nil {
		return auth.Tokens{}, err
	}
	parsed, err := protocol.ParseCredentialRequestResponseBody(bytes.NewReader(req.Credential))
	if err != nil {
		return auth.Tokens{}, errors.Join(ErrVerify, err)
	}
	// The authenticator tells us which user it belongs to via userHandle (our user id bytes).
	lookup := func(_, userHandle []byte) (webauthn.User, error) {
		id, err := uuid.FromBytes(userHandle)
		if err != nil {
			return nil, err
		}
		return s.loadUser(ctx, id)
	}
	user, cred, err := s.wa.ValidatePasskeyLogin(lookup, sd, parsed)
	if err != nil {
		return auth.Tokens{}, errors.Join(ErrVerify, err)
	}
	raw, _ := json.Marshal(cred)
	if err := s.repo.UpdateAfterLogin(ctx, db.UpdatePasskeyAfterLoginParams{
		CredentialID: cred.ID, SignCount: int64(cred.Authenticator.SignCount),
		BackupState: cred.Flags.BackupState, Credential: raw,
	}); err != nil {
		return auth.Tokens{}, err
	}
	uid, _ := uuid.FromBytes(user.WebAuthnID())
	return s.tokens.IssueForUser(ctx, uid, meta)
}

func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]Passkey, error) {
	rows, err := s.repo.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]Passkey, 0, len(rows))
	for _, r := range rows {
		out = append(out, fromDB(r))
	}
	return out, nil
}

func (s *Service) Rename(ctx context.Context, userID, id uuid.UUID, name string) error {
	name = strings.TrimSpace(name)
	if name == "" || len([]rune(name)) > 60 {
		return ErrInvalidName
	}
	n, err := s.repo.Rename(ctx, id, userID, name)
	if err == nil && n == 0 {
		return ErrNotFound
	}
	return err
}

func (s *Service) Delete(ctx context.Context, userID, id uuid.UUID) error {
	n, err := s.repo.Delete(ctx, id, userID)
	if err == nil && n == 0 {
		return ErrNotFound
	}
	return err
}
