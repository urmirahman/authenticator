package auth

import (
	"context"
	"encoding/json"
	"errors"
	"net/url"
	"strings"
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
	ErrInvalidState    = errors.New("invalid or expired oauth state")
	ErrInvalidCode     = errors.New("invalid or expired login code")
	ErrBadRedirect     = errors.New("redirect_uri is not allowed")
	ErrBadRequest      = errors.New("missing credentials for this provider")
)

const (
	stateTTL     = 10 * time.Minute
	loginCodeTTL = time.Minute
)

type Service struct {
	repo       Repository
	issuer     *token.Issuer
	providers  *Providers
	redirects  []string
	refreshTTL time.Duration
	now        func() time.Time
}

func NewService(repo Repository, issuer *token.Issuer, providers *Providers, allowedRedirects []string, refreshTTL time.Duration) *Service {
	return &Service{repo: repo, issuer: issuer, providers: providers, redirects: allowedRedirects, refreshTTL: refreshTTL, now: time.Now}
}

// ---------- Web OAuth (redirect flow) ----------

// Start begins the OAuth redirect. We store state, a PKCE verifier and an OIDC nonce server-side.
//   - state  -> CSRF protection: the callback must bring back a state we issued
//   - PKCE   -> a stolen authorization code is useless without the verifier
//   - nonce  -> ties the returned id_token to this exact attempt
func (s *Service) Start(ctx context.Context, provider, redirectURI string) (string, error) {
	cfg, ok := s.providers.OAuth[provider]
	if !ok {
		return "", ErrUnknownProvider
	}
	if !s.redirectAllowed(redirectURI) {
		return "", ErrBadRedirect
	}
	state, err := token.Random(24)
	if err != nil {
		return "", err
	}
	nonce, err := token.Random(24)
	if err != nil {
		return "", err
	}
	verifier := oauth2.GenerateVerifier()
	if err := s.repo.SaveState(ctx, OAuthState{
		State: state, Provider: provider, CodeVerifier: verifier, Nonce: nonce,
		RedirectURI: redirectURI, ExpiresAt: s.now().Add(stateTTL),
	}); err != nil {
		return "", err
	}
	opts := []oauth2.AuthCodeOption{oauth2.S256ChallengeOption(verifier)}
	if provider != "facebook" {
		opts = append(opts, oauth2.SetAuthURLParam("nonce", nonce))
	}
	if provider == "apple" {
		// Apple POSTs the result back (form_post) when name/email scopes are requested.
		opts = append(opts, oauth2.SetAuthURLParam("response_mode", "form_post"))
	}
	return cfg.AuthCodeURL(state, opts...), nil
}

// Callback finishes the redirect flow and returns where to send the browser:
// the web app's redirect URI with a one-time ?code= (never tokens in a URL).
// appleUser is Apple's one-time "user" JSON (name), empty for other providers.
func (s *Service) Callback(ctx context.Context, provider, state, code, appleUser string) (string, error) {
	st, err := s.repo.ConsumeState(ctx, state, provider)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrInvalidState
	}
	if err != nil {
		return "", err
	}
	tok, err := s.exchange(ctx, provider, code, st.CodeVerifier, "")
	if err != nil {
		return "", err
	}
	p, err := s.profileFromToken(ctx, provider, tok, st.Nonce)
	if err != nil {
		return "", err
	}
	if p.Name == "" && appleUser != "" {
		p.Name = appleName(appleUser)
	}
	userID, err := s.repo.FindOrCreateUser(ctx, p)
	if err != nil {
		return "", err
	}
	raw, err := token.Random(32)
	if err != nil {
		return "", err
	}
	if err := s.repo.CreateLoginCode(ctx, token.HashRefresh(raw), userID, s.now().Add(loginCodeTTL)); err != nil {
		return "", err
	}
	return withQuery(st.RedirectURI, "code", raw), nil
}

// ExchangeLoginCode swaps the one-time code (from Callback) for real tokens.
func (s *Service) ExchangeLoginCode(ctx context.Context, code string, meta SessionMeta) (Tokens, error) {
	userID, err := s.repo.ConsumeLoginCode(ctx, token.HashRefresh(code))
	if errors.Is(err, pgx.ErrNoRows) {
		return Tokens{}, ErrInvalidCode
	}
	if err != nil {
		return Tokens{}, err
	}
	return s.issue(ctx, userID, uuid.New(), meta)
}

// ---------- Mobile (native SDK) ----------

// NativeSignIn verifies what a native SDK gave the app and returns our tokens.
func (s *Service) NativeSignIn(ctx context.Context, provider string, req NativeRequest, meta SessionMeta) (Tokens, error) {
	var p Profile
	switch provider {
	case "google", "apple":
		v, ok := s.providers.ID[provider]
		if !ok {
			return Tokens{}, ErrUnknownProvider
		}
		idTok := req.IDToken
		if idTok == "" && req.AuthorizationCode != "" {
			// e.g. Apple's authorizationCode: exchange it server-side to get an id_token.
			tok, err := s.exchange(ctx, provider, req.AuthorizationCode, req.CodeVerifier, req.RedirectURI)
			if err != nil {
				return Tokens{}, err
			}
			idTok, _ = tok.Extra("id_token").(string)
		}
		if idTok == "" {
			return Tokens{}, ErrBadRequest
		}
		c, err := v.Verify(ctx, idTok, req.Nonce)
		if err != nil {
			return Tokens{}, err
		}
		p = Profile{Provider: provider, ProviderUserID: c.Subject, Email: c.Email, EmailVerified: c.EmailVerified, Name: c.Name}
	case "facebook":
		if s.providers.Facebook == nil {
			return Tokens{}, ErrUnknownProvider
		}
		if req.AccessToken == "" {
			return Tokens{}, ErrBadRequest
		}
		var err error
		if p, err = s.providers.Facebook.Fetch(ctx, req.AccessToken); err != nil {
			return Tokens{}, err
		}
	default:
		return Tokens{}, ErrUnknownProvider
	}
	if p.Name == "" {
		p.Name = req.Name
	}
	return s.SignIn(ctx, p, meta)
}

// SignIn is called once we trust a provider profile.
func (s *Service) SignIn(ctx context.Context, p Profile, meta SessionMeta) (Tokens, error) {
	userID, err := s.repo.FindOrCreateUser(ctx, p)
	if err != nil {
		return Tokens{}, err
	}
	return s.issue(ctx, userID, uuid.New(), meta)
}

// IssueForUser starts a new session for an already-authenticated user (passkeys, dev login).
func (s *Service) IssueForUser(ctx context.Context, userID uuid.UUID, meta SessionMeta) (Tokens, error) {
	return s.issue(ctx, userID, uuid.New(), meta)
}

// ---------- Sessions ----------

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

// ---------- helpers ----------

func (s *Service) issue(ctx context.Context, userID, familyID uuid.UUID, meta SessionMeta) (Tokens, error) {
	now := s.now()
	access, err := s.issuer.Access(token.Subject{UserID: userID, SessionID: familyID}, now)
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

func (s *Service) exchange(ctx context.Context, provider, code, verifier, redirectURI string) (*oauth2.Token, error) {
	base, ok := s.providers.OAuth[provider]
	if !ok {
		return nil, ErrUnknownProvider
	}
	cfg := *base // copy so we can set per-request fields safely
	if redirectURI != "" {
		cfg.RedirectURL = redirectURI
	}
	if provider == "apple" && s.providers.AppleSecret != nil {
		secret, err := s.providers.AppleSecret()
		if err != nil {
			return nil, err
		}
		cfg.ClientSecret = secret
	}
	var opts []oauth2.AuthCodeOption
	if verifier != "" {
		opts = append(opts, oauth2.VerifierOption(verifier))
	}
	return cfg.Exchange(ctx, code, opts...)
}

func (s *Service) profileFromToken(ctx context.Context, provider string, tok *oauth2.Token, nonce string) (Profile, error) {
	if provider == "facebook" {
		return s.providers.Facebook.Fetch(ctx, tok.AccessToken)
	}
	raw, _ := tok.Extra("id_token").(string)
	v, ok := s.providers.ID[provider]
	if raw == "" || !ok {
		return Profile{}, errors.New("provider did not return an id_token")
	}
	c, err := v.Verify(ctx, raw, nonce)
	if err != nil {
		return Profile{}, err
	}
	return Profile{Provider: provider, ProviderUserID: c.Subject, Email: c.Email, EmailVerified: c.EmailVerified, Name: c.Name}, nil
}

func (s *Service) redirectAllowed(uri string) bool {
	u, err := url.Parse(uri)
	if err != nil || u.Scheme == "" {
		return false
	}
	for _, allowed := range s.redirects {
		if strings.HasPrefix(uri, allowed) {
			return true
		}
	}
	return false
}

func withQuery(uri, k, v string) string {
	u, _ := url.Parse(uri)
	q := u.Query()
	q.Set(k, v)
	u.RawQuery = q.Encode()
	return u.String()
}

// appleName parses Apple's first-sign-in "user" form field: {"name":{"firstName":..,"lastName":..}}.
func appleName(raw string) string {
	var u struct {
		Name struct{ FirstName, LastName string } `json:"name"`
	}
	if json.Unmarshal([]byte(raw), &u) != nil {
		return ""
	}
	return strings.TrimSpace(u.Name.FirstName + " " + u.Name.LastName)
}
