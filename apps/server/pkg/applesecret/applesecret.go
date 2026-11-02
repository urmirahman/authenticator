// Package applesecret builds the "client secret" for Sign in with Apple.
//
// Unlike Google/Facebook, Apple doesn't give you a static client secret. You sign a short-lived
// ES256 JWT with the .p8 private key from the Apple Developer portal and send that instead.
// It may live up to 6 months; we generate a fresh one per token exchange.
package applesecret

import (
	"crypto/ecdsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func Generate(teamID, clientID, keyID, privateKeyPEM string, now time.Time) (string, error) {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return "", errors.New("apple: invalid PEM private key")
	}
	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return "", err
	}
	key, ok := parsed.(*ecdsa.PrivateKey)
	if !ok {
		return "", errors.New("apple: key is not ECDSA")
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodES256, jwt.RegisteredClaims{
		Issuer:    teamID,
		Subject:   clientID,
		Audience:  jwt.ClaimStrings{"https://appleid.apple.com"},
		IssuedAt:  jwt.NewNumericDate(now),
		ExpiresAt: jwt.NewNumericDate(now.Add(5 * time.Minute)),
	})
	tok.Header["kid"] = keyID
	return tok.SignedString(key)
}
