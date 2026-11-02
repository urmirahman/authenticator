// Package idtoken verifies OpenID Connect ID tokens (Google, Apple) against the provider's JWKS.
//
// An ID token is a JWT signed by the provider. To trust it we check:
//   - signature: using the provider's public keys (JWKS), fetched and cached by go-oidc
//   - iss: issued by the provider we expect
//   - aud: issued FOR one of our client ids (web client id, iOS bundle id, ...)
//   - exp: not expired
//   - nonce: matches the one we generated, so a stolen token can't be replayed
package idtoken

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"slices"

	"github.com/coreos/go-oidc/v3/oidc"
)

const (
	GoogleJWKS = "https://www.googleapis.com/oauth2/v3/certs"
	AppleJWKS  = "https://appleid.apple.com/auth/keys"
)

var (
	GoogleIssuers = []string{"https://accounts.google.com", "accounts.google.com"}
	AppleIssuers  = []string{"https://appleid.apple.com"}

	ErrNonce = errors.New("id token nonce mismatch")
)

// Claims we care about. email_verified is a bool for Google but often a string for Apple.
type Claims struct {
	Subject       string
	Email         string
	EmailVerified bool
	Name          string
}

type Verifier struct {
	issuers   []string
	audiences []string
	verifier  *oidc.IDTokenVerifier
}

// New builds a verifier from any key set (remote JWKS in prod, static keys in tests).
func New(keys oidc.KeySet, issuers, audiences []string) *Verifier {
	v := oidc.NewVerifier("", keys, &oidc.Config{SkipClientIDCheck: true, SkipIssuerCheck: true})
	return &Verifier{issuers: issuers, audiences: audiences, verifier: v}
}

// NewRemote fetches/caches keys from a JWKS URL.
func NewRemote(ctx context.Context, jwksURL string, issuers, audiences []string) *Verifier {
	return New(oidc.NewRemoteKeySet(ctx, jwksURL), issuers, audiences)
}

// Verify checks the token. expectedNonce may be the raw nonce or (as Apple's native SDK does)
// its SHA-256 hex digest. Pass "" to skip the nonce check (only for flows without one).
func (v *Verifier) Verify(ctx context.Context, raw, expectedNonce string) (Claims, error) {
	if len(v.audiences) == 0 {
		return Claims{}, errors.New("provider not configured")
	}
	tok, err := v.verifier.Verify(ctx, raw)
	if err != nil {
		return Claims{}, err
	}
	if !slices.Contains(v.issuers, tok.Issuer) {
		return Claims{}, fmt.Errorf("unexpected issuer %q", tok.Issuer)
	}
	if !slices.ContainsFunc(tok.Audience, func(a string) bool { return slices.Contains(v.audiences, a) }) {
		return Claims{}, errors.New("token audience is not one of our client ids")
	}
	if expectedNonce != "" && tok.Nonce != expectedNonce && tok.Nonce != sha256Hex(expectedNonce) {
		return Claims{}, ErrNonce
	}
	var c struct {
		Email         string          `json:"email"`
		EmailVerified json.RawMessage `json:"email_verified"`
		Name          string          `json:"name"`
	}
	if err := tok.Claims(&c); err != nil {
		return Claims{}, err
	}
	verified := string(c.EmailVerified) == "true" || string(c.EmailVerified) == `"true"`
	return Claims{Subject: tok.Subject, Email: c.Email, EmailVerified: verified, Name: c.Name}, nil
}

func sha256Hex(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}
