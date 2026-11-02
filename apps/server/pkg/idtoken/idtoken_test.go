package idtoken

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"testing"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/golang-jwt/jwt/v5"
)

// We sign tokens with a locally generated RSA key and give the verifier the matching public key,
// exactly like Google/Apple would, but offline.
func TestVerify(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	other, _ := rsa.GenerateKey(rand.Reader, 2048)
	v := New(&oidc.StaticKeySet{PublicKeys: []crypto.PublicKey{&key.PublicKey}}, AppleIssuers, []string{"dev.urmi.app"})

	sign := func(k *rsa.PrivateKey, mod func(jwt.MapClaims)) string {
		c := jwt.MapClaims{
			"iss": "https://appleid.apple.com", "aud": "dev.urmi.app", "sub": "apple-123",
			"exp": time.Now().Add(time.Hour).Unix(), "iat": time.Now().Unix(),
			"email": "u@example.com", "email_verified": "true", "nonce": sha256Hex("n0nce"),
		}
		if mod != nil {
			mod(c)
		}
		s, err := jwt.NewWithClaims(jwt.SigningMethodRS256, c).SignedString(k)
		if err != nil {
			t.Fatal(err)
		}
		return s
	}

	tests := []struct {
		name    string
		token   string
		nonce   string
		wantErr bool
	}{
		{"valid, hashed nonce", sign(key, nil), "n0nce", false},
		{"wrong signing key", sign(other, nil), "n0nce", true},
		{"wrong audience", sign(key, func(c jwt.MapClaims) { c["aud"] = "someone.else" }), "n0nce", true},
		{"wrong issuer", sign(key, func(c jwt.MapClaims) { c["iss"] = "https://evil.example" }), "n0nce", true},
		{"expired", sign(key, func(c jwt.MapClaims) { c["exp"] = time.Now().Add(-time.Hour).Unix() }), "n0nce", true},
		{"nonce mismatch", sign(key, nil), "different", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, err := v.Verify(context.Background(), tt.token, tt.nonce)
			if (err != nil) != tt.wantErr {
				t.Fatalf("err = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && (c.Subject != "apple-123" || !c.EmailVerified) {
				t.Fatalf("unexpected claims %+v", c)
			}
		})
	}
}
