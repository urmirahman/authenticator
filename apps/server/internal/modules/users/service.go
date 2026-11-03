package users

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
)

var (
	ErrInvalidName    = errors.New("displayName must be 1-80 characters")
	ErrConfirmPhrase  = errors.New(`type "DELETE" to confirm`)
	ErrReauthRequired = errors.New("please sign in again before deleting your account")
)

// DeleteConfirmPhrase must be sent in the body of DELETE /users/me.
const DeleteConfirmPhrase = "DELETE"

// ReauthWindow: account deletion needs a sign-in at most this old (ADR 35).
const ReauthWindow = 10 * time.Minute

type Service struct {
	repo Repository
	now  func() time.Time
}

func NewService(repo Repository) *Service { return &Service{repo: repo, now: time.Now} }

func (s *Service) Me(ctx context.Context, id uuid.UUID) (User, error) {
	u, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return User{}, err
	}
	return fromDB(u), nil
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, req UpdateRequest) (User, error) {
	name := strings.TrimSpace(req.DisplayName)
	if name == "" || len([]rune(name)) > 80 {
		return User{}, ErrInvalidName
	}
	u, err := s.repo.UpdateProfile(ctx, id, name)
	if err != nil {
		return User{}, err
	}
	return fromDB(u), nil
}

// Delete permanently removes the account. Two guards (ADR 35):
//  1. an explicit confirmation phrase, so a stray request can't do it;
//  2. a recent sign-in (re-auth): a stolen long-lived refresh token alone is not enough,
//     the attacker would also need to pass Google/Apple/passkey sign-in again.
//
// ON DELETE CASCADE then removes identities, sessions, devices, passkeys, vaults, items,
// sync log, backups and audit rows.
func (s *Service) Delete(ctx context.Context, id, sessionFamily uuid.UUID, confirm string) error {
	if confirm != DeleteConfirmPhrase {
		return ErrConfirmPhrase
	}
	at, err := s.repo.SignedInAt(ctx, id, sessionFamily)
	if err != nil || at.IsZero() || s.now().Sub(at) > ReauthWindow {
		return ErrReauthRequired
	}
	return s.repo.Delete(ctx, id)
}

// SignInMethods lists linked providers (oldest first) and the passkey count.
func (s *Service) SignInMethods(ctx context.Context, id uuid.UUID) (SignInMethods, error) {
	ids, err := s.repo.Identities(ctx, id)
	if err != nil {
		return SignInMethods{}, err
	}
	n, err := s.repo.PasskeyCount(ctx, id)
	if err != nil {
		return SignInMethods{}, err
	}
	out := SignInMethods{Providers: make([]LinkedProvider, 0, len(ids)), Passkeys: n}
	for _, i := range ids {
		out.Providers = append(out.Providers, LinkedProvider{Provider: i.Provider, Email: i.Email.String, LinkedAt: i.CreatedAt})
	}
	return out, nil
}
