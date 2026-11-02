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

type Claims struct {
	jwt.RegisteredClaims
}

func (i *Issuer) TTL() time.Duration { return i.ttl }

// Access creates a signed HS256 JWT whose subject is the user id.
func (i *Issuer) Access(userID uuid.UUID, now time.Time) (string, error) {
	c := Claims{jwt.RegisteredClaims{
		Subject:   userID.String(),
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(i.ttl)),
		ID:        uuid.NewString(),
	}}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString(i.secret)
}

// Verify checks signature + expiry and returns the user id.
func (i *Issuer) Verify(raw string) (uuid.UUID, error) {
	var c Claims
	_, err := jwt.ParseWithClaims(raw, &c, func(t *jwt.Token) (any, error) { return i.secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))
	if err != nil {
		return uuid.Nil, err
	}
	id, err := uuid.Parse(c.Subject)
	if err != nil {
		return uuid.Nil, errors.New("invalid subject")
	}
	return id, nil
}

// NewRefresh returns a random opaque token and the SHA-256 hash we store in the DB.
func NewRefresh() (raw string, hash []byte, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return "", nil, err
	}
	raw = base64.RawURLEncoding.EncodeToString(b)
	return raw, HashRefresh(raw), nil
}

func HashRefresh(raw string) []byte {
	h := sha256.Sum256([]byte(raw))
	return h[:]
}
