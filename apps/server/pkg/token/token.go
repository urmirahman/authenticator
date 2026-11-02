// Package token issues short-lived JWT access tokens and opaque refresh tokens.
package token

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type Issuer struct {
	secret []byte
	ttl    time.Duration
}

func NewIssuer(secret string, ttl time.Duration) *Issuer {
	return &Issuer{secret: []byte(secret), ttl: ttl}
}

// Claims: sub = user id, sid = the refresh-token family ("session") this access token belongs to.
type Claims struct {
	SessionID string `json:"sid"`
	jwt.RegisteredClaims
}

// Subject is what the auth middleware puts in the request context.
type Subject struct {
	UserID    uuid.UUID
	SessionID uuid.UUID
}

func (i *Issuer) TTL() time.Duration { return i.ttl }

// Access creates a signed HS256 JWT.
func (i *Issuer) Access(s Subject, now time.Time) (string, error) {
	c := Claims{SessionID: s.SessionID.String(), RegisteredClaims: jwt.RegisteredClaims{
		Subject:   s.UserID.String(),
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(i.ttl)),
		ID:        uuid.NewString(),
	}}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(i.secret)
}

// Verify checks signature + expiry and returns who the token is for.
func (i *Issuer) Verify(raw string) (Subject, error) {
	var c Claims
	_, err := jwt.ParseWithClaims(raw, &c, func(*jwt.Token) (any, error) { return i.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return Subject{}, err
	}
	uid, err := uuid.Parse(c.Subject)
	if err != nil {
		return Subject{}, errors.New("invalid subject")
	}
	sid, _ := uuid.Parse(c.SessionID) // may be Nil for tokens without a session
	return Subject{UserID: uid, SessionID: sid}, nil
}

// NewRefresh returns a random opaque token and the SHA-256 hash we store in the DB.
func NewRefresh() (raw string, hash []byte, err error) {
	raw, err = Random(32)
	if err != nil {
		return "", nil, err
	}
	return raw, HashRefresh(raw), nil
}

// Random returns n random bytes, base64url-encoded (used for state, nonce, PKCE, login codes).
func Random(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func HashRefresh(raw string) []byte {
	h := sha256.Sum256([]byte(raw))
	return h[:]
}
