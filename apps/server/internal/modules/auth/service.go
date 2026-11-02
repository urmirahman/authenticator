package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"golang.org/x/oauth2"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
	"github.com/urmirahman/authenticator/apps/server/pkg/token"
)

var (
	ErrUnknownProvider = errors.New("unknown or unconfigured provider")
	ErrInvalidRefresh  = errors.New("invalid refresh token")
)

type Service struct {
	repo       Repository
	issuer     *token.Issuer
	providers  map[string]*oauth2.Config
	refreshTTL time.Duration
	now        func() time.Time
}

func NewService(repo Repository, issuer *token.Issuer, providers map[string]*oauth2.Config, refreshTTL time.Duration) *Service {
	return &Service{repo: repo, issuer: issuer, providers: providers, refreshTTL: refreshTTL, now: time.Now}
}

// AuthCodeURL starts the OAuth redirect. state protects against CSRF and is echoed back by the provider.
func (s *Service) AuthCodeURL(provider string) (url, state string, err error) {
	cfg, ok := s.providers[provider]
	if !ok {
		return "", "", ErrUnknownProvider
	}
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", "", err
	}
	state = base64.RawURLEncoding.EncodeToString(b)
	opts := []oauth2.AuthCodeOption{oauth2.AccessTypeOnline}
	if provider == "apple" {
		// Apple POSTs the result back when name/email scopes are requested.
		opts = append(opts, oauth2.SetAuthURLParam("response_mode", "form_post"))
	}
	return cfg.AuthCodeURL(state, opts...), state, nil
}

// SignIn is called once we trust a provider profile (after code exchange or id_token check).
func (s *Service) SignIn(ctx context.Context, p Profile, meta SessionMeta) (Tokens, error) {
	userID, err := s.repo.FindOrCreateUser(ctx, p)
	if err != nil {
		return Tokens{}, err
	}
	return s.issue(ctx, userID, uuid.New(), meta)
}

// Refresh rotates the refresh token. Reusing an already-rotated token revokes the whole family,
// because that means the token was probably stolen.
func (s *Service) Refresh(ctx context.Context, raw string, meta SessionMeta) (Tokens, error) {
	sess, err := s.repo.SessionByHash(ctx, token.HashRefresh(raw))
	if errors.Is(err, pgx.ErrNoRows) {
		return Tokens{}, ErrInvalidRefresh
	}
	if err != nil {
		return Tokens{}, err
	}
	if sess.RevokedAt != nil {
		_ = s.repo.RevokeFamily(ctx, sess.FamilyID)
		return Tokens{}, ErrInvalidRefresh
	}
	if s.now().After(sess.ExpiresAt) {
		return Tokens{}, ErrInvalidRefresh
	}
	if err := s.repo.RevokeSession(ctx, sess.ID); err != nil {
		return Tokens{}, err
	}
	meta.DeviceID = sess.DeviceID
	return s.issue(ctx, sess.UserID, sess.FamilyID, meta)
}

func (s *Service) Logout(ctx context.Context, raw string) error {
	sess, err := s.repo.SessionByHash(ctx, token.HashRefresh(raw))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil // already gone, logout is idempotent
	}
	if err != nil {
		return err
	}
	return s.repo.RevokeFamily(ctx, sess.FamilyID)
}

func (s *Service) issue(ctx context.Context, userID, familyID uuid.UUID, meta SessionMeta) (Tokens, error) {
	now := s.now()
	access, err := s.issuer.Access(userID, now)
	if err != nil {
		return Tokens{}, err
	}
	raw, hash, err := token.NewRefresh()
	if err != nil {
		return Tokens{}, err
	}
	if _, err := s.repo.CreateSession(ctx, db.CreateSessionParams{
		UserID: userID, DeviceID: meta.DeviceID, FamilyID: familyID, RefreshTokenHash: hash,
		UserAgent: pgtype.Text{String: meta.UserAgent, Valid: meta.UserAgent != ""},
		ExpiresAt: now.Add(s.refreshTTL),
	}); err != nil {
		return Tokens{}, err
	}
	return Tokens{AccessToken: access, RefreshToken: raw, ExpiresIn: int(s.issuer.TTL().Seconds())}, nil
}
