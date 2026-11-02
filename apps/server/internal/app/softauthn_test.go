package app

// A tiny software "authenticator" (like a phone's passkey manager) so we can test the full
// WebAuthn register + login ceremonies without a browser. It creates a P-256 key pair, builds
// authenticator data and signs challenges exactly as the spec describes.

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"testing"

	"github.com/fxamacker/cbor/v2"
)

var b64 = base64.RawURLEncoding

type softAuthenticator struct {
	t      *testing.T
	rpID   string
	origin string
	key    *ecdsa.PrivateKey
	credID []byte
	userID []byte
	count  uint32
}

func newSoftAuthenticator(t *testing.T, rpID, origin string) *softAuthenticator {
	k, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		t.Fatal(err)
	}
	id := make([]byte, 16)
	_, _ = rand.Read(id)
	return &softAuthenticator{t: t, rpID: rpID, origin: origin, key: k, credID: id}
}

func (a *softAuthenticator) authData(withCred bool) []byte {
	rp := sha256.Sum256([]byte(a.rpID))
	flags := byte(0x01 | 0x04) // user present + user verified
	if withCred {
		flags |= 0x40 // attested credential data included
	}
	a.count++
	out := append([]byte{}, rp[:]...)
	out = append(out, flags)
	out = binary.BigEndian.AppendUint32(out, a.count)
	if withCred {
		out = append(out, make([]byte, 16)...) // AAGUID (zeros = unknown)
		out = binary.BigEndian.AppendUint16(out, uint16(len(a.credID)))
		out = append(out, a.credID...)
		x, y := make([]byte, 32), make([]byte, 32)
		a.key.X.FillBytes(x)
		a.key.Y.FillBytes(y)
		cose, _ := cbor.Marshal(map[int]any{1: 2, 3: -7, -1: 1, -2: x, -3: y}) // EC2, ES256, P-256
		out = append(out, cose...)
	}
	return out
}

func (a *softAuthenticator) clientData(typ, challenge string) []byte {
	b, _ := json.Marshal(map[string]string{"type": typ, "challenge": challenge, "origin": a.origin})
	return b
}

// challengeOf pulls options.publicKey.challenge out of a /begin response.
func challengeOf(t *testing.T, options map[string]any) string {
	pk, _ := options["publicKey"].(map[string]any)
	ch, _ := pk["challenge"].(string)
	if ch == "" {
		t.Fatalf("no challenge in %v", options)
	}
	return ch
}

// Register answers navigator.credentials.create().
func (a *softAuthenticator) Register(options map[string]any) json.RawMessage {
	pk := options["publicKey"].(map[string]any)
	user := pk["user"].(map[string]any)
	a.userID, _ = b64.DecodeString(user["id"].(string))
	att, _ := cbor.Marshal(map[string]any{"fmt": "none", "attStmt": map[string]any{}, "authData": a.authData(true)})
	b, _ := json.Marshal(map[string]any{
		"id": b64.EncodeToString(a.credID), "rawId": b64.EncodeToString(a.credID), "type": "public-key",
		"response": map[string]string{
			"clientDataJSON":    b64.EncodeToString(a.clientData("webauthn.create", challengeOf(a.t, options))),
			"attestationObject": b64.EncodeToString(att),
		},
	})
	return b
}

// Login answers navigator.credentials.get(): sign(authData || sha256(clientDataJSON)).
func (a *softAuthenticator) Login(options map[string]any) json.RawMessage {
	ad := a.authData(false)
	cd := a.clientData("webauthn.get", challengeOf(a.t, options))
	h := sha256.Sum256(cd)
	digest := sha256.Sum256(append(append([]byte{}, ad...), h[:]...))
	sig, err := ecdsa.SignASN1(rand.Reader, a.key, digest[:])
	if err != nil {
		a.t.Fatal(err)
	}
	b, _ := json.Marshal(map[string]any{
		"id": b64.EncodeToString(a.credID), "rawId": b64.EncodeToString(a.credID), "type": "public-key",
		"response": map[string]string{
			"clientDataJSON":    b64.EncodeToString(cd),
			"authenticatorData": b64.EncodeToString(ad),
			"signature":         b64.EncodeToString(sig),
			"userHandle":        b64.EncodeToString(a.userID),
		},
	})
	return b
}
