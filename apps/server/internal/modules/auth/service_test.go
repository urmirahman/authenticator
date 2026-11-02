package auth

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"golang.org/x/oauth2"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
	"github.com/urmirahman/authenticator/apps/server/pkg/idtoken"
	"github.com/urmirahman/authenticator/apps/server/pkg/token"
)

// ---- fakes: in-memory stand-ins for the database and providers ----

type fakeRepo struct {
	users    map[string]uuid.UUID // provider:sub -> user
	sessions map[string]*db.Session
	states   map[string]OAuthState
	revoked  []uuid.UUID // families revoked
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{users: map[string]uuid.UUID{}, sessions: map[string]*db.Session{}, states: map[string]OAuthState{}}
}

func (f *fakeRepo) FindOrCreateUser(_ context.Context, p Profile) (uuid.UUID, error) {
	k := p.Provider + ":" + p.ProviderUserID
	if id, ok := f.users[k]; ok {
		return id, nil
	}
	id := uuid.New()
	f.users[k] = id
	return id, nil
}
func (f *fakeRepo) SaveState(_ context.Context, s OAuthState) error { f.states[s.State] = s; return nil }
func (f *fakeRepo) ConsumeState(_ context.Context, st, _ string) (OAuthState, error) {
	s, ok := f.states[st]
	if !ok {
		return OAuthState{}, pgx.ErrNoRows
	}
	delete(f.states, st)
	return s, nil
}
func (f *fakeRepo) CreateLoginCode(context.Context, []byte, uuid.UUID, time.Time) error { return nil }
func (f *fakeRepo) ConsumeLoginCode(context.Context, []byte) (uuid.UUID, error) {
	return uuid.Nil, pgx.ErrNoRows
}
func (f *fakeRepo) CreateSession(_ context.Context, p db.CreateSessionParams) (db.Session, error) {
	s := db.Session{ID: uuid.New(), UserID: p.UserID, FamilyID: p.FamilyID, RefreshTokenHash: p.RefreshTokenHash, ExpiresAt: p.ExpiresAt}
	f.sessions[string(p.RefreshTokenHash)] = &s
	return s, nil
}
func (f *fakeRepo) SessionByHash(_ context.Context, h []byte) (db.Session, error) {
	s, ok := f.sessions[string(h)]
	if !ok {
		return db.Session{}, pgx.ErrNoRows
	}
	return *s, nil
}
func (f *fakeRepo) RevokeSession(_ context.Context, id uuid.UUID) error {
	now := time.Now()
	for _, s := range f.sessions {
		if s.ID == id {
			s.RevokedAt = &now
		}
	}
	return nil
}
func (f *fakeRepo) RevokeFamily(_ context.Context, fam uuid.UUID) error {
	f.revoked = append(f.revoked, fam)
	return nil
}

type fakeVerifier struct {
	claims idtoken.Claims
	err    error
}

func (v fakeVerifier) Verify(context.Context, string, string) (idtoken.Claims, error) { return v.claims, v.err }

type fakeFacebook struct{}

func (fakeFacebook) Fetch(context.Context, string) (Profile, error) {
	return Profile{Provider: "facebook", ProviderUserID: "fb-1", Email: "fb@example.com"}, nil
}

func newTestService(repo *fakeRepo) *Service {
	p := &Providers{
		OAuth: map[string]*oauth2.Config{"google": {ClientID: "web", Endpoint: oauth2.Endpoint{AuthURL: "https://accounts.example/auth"}}},
		ID: map[string]IDVerifier{
			"google": fakeVerifier{claims: idtoken.Claims{Subject: "g-1", Email: "g@example.com", EmailVerified: true}},
			"apple":  fakeVerifier{err: idtoken.ErrNonce},
		},
		Facebook: fakeFacebook{},
	}
	return NewService(repo, token.NewIssuer("secret", time.Minute), p, []string{"http://localhost:3001"}, time.Hour)
}

// ---- tests ----

func TestDecideLink(t *testing.T) {
	tests := []struct {
		name                       string
		identity, emailUser, verif bool
		want                       LinkDecision
	}{
		{"already linked", true, true, false, UseLinkedUser},
		{"verified email matches existing user", false, true, true, LinkToExisting},
		{"unverified email matches existing user", false, true, false, RejectEmailTaken},
		{"new person", false, false, false, CreateNew},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := DecideLink(tt.identity, tt.emailUser, tt.verif); got != tt.want {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestNativeSignIn(t *testing.T) {
	tests := []struct {
		name     string
		provider string
		req      NativeRequest
		wantErr  error // nil = success; errAny = any error
	}{
		{"google id token", "google", NativeRequest{IDToken: "x", Nonce: "n"}, nil},
		{"apple bad nonce", "apple", NativeRequest{IDToken: "x", Nonce: "n"}, idtoken.ErrNonce},
		{"google without token", "google", NativeRequest{}, ErrBadRequest},
		{"facebook access token", "facebook", NativeRequest{AccessToken: "fb"}, nil},
		{"facebook without token", "facebook", NativeRequest{}, ErrBadRequest},
		{"unknown provider", "myspace", NativeRequest{IDToken: "x"}, ErrUnknownProvider},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := newTestService(newFakeRepo())
			tok, err := svc.NativeSignIn(context.Background(), tt.provider, tt.req, SessionMeta{})
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr == nil && (tok.AccessToken == "" || tok.RefreshToken == "") {
				t.Fatal("expected tokens")
			}
		})
	}
}

func TestRefreshRotationAndReuse(t *testing.T) {
	repo := newFakeRepo()
	svc := newTestService(repo)
	ctx := context.Background()

	first, err := svc.IssueForUser(ctx, uuid.New(), SessionMeta{})
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.Refresh(ctx, first.RefreshToken, SessionMeta{})
	if err != nil {
		t.Fatalf("first refresh should work: %v", err)
	}
	if second.RefreshToken == first.RefreshToken {
		t.Fatal("refresh token must rotate")
	}
	// Re-using the old token = theft signal -> rejected and family revoked.
	if _, err := svc.Refresh(ctx, first.RefreshToken, SessionMeta{}); !errors.Is(err, ErrInvalidRefresh) {
		t.Fatalf("reuse should fail, got %v", err)
	}
	if len(repo.revoked) != 1 {
		t.Fatalf("expected family revoked, got %v", repo.revoked)
	}
	if _, err := svc.Refresh(ctx, "never-issued", SessionMeta{}); !errors.Is(err, ErrInvalidRefresh) {
		t.Fatalf("unknown token should fail, got %v", err)
	}
}

func TestStart(t *testing.T) {
	tests := []struct {
		name, provider, redirect string
		wantErr                  error
	}{
		{"allowed", "google", "http://localhost:3001/auth/callback", nil},
		{"evil redirect", "google", "https://evil.example/steal", ErrBadRedirect},
		{"unconfigured provider", "apple", "http://localhost:3001/", ErrUnknownProvider},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newFakeRepo()
			url, err := newTestService(repo).Start(context.Background(), tt.provider, tt.redirect)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if err == nil && (len(repo.states) != 1 || url == "") {
				t.Fatal("expected a saved state and a URL")
			}
		})
	}
}

func TestAppleName(t *testing.T) {
	if got := appleName(`{"name":{"firstName":"Urmi","lastName":"Rahman"}}`); got != "Urmi Rahman" {
		t.Fatalf("got %q", got)
	}
}
