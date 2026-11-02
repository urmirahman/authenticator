package passkeys

import (
	"github.com/go-webauthn/webauthn/webauthn"
)

// Service will run the WebAuthn ceremonies:
//
//	register: BeginRegistration -> browser/phone creates key -> FinishRegistration -> save credential
//	login:    BeginDiscoverableLogin -> user picks passkey -> FinishDiscoverableLogin -> issue tokens
//
// Challenges (webauthn.SessionData) must be stored server-side between begin/finish,
// keyed by challengeId, with a short TTL (a table or Redis later; in-memory is fine for dev).
type Service struct {
	wa   *webauthn.WebAuthn
	repo Repository
}

func NewService(wa *webauthn.WebAuthn, repo Repository) *Service {
	return &Service{wa: wa, repo: repo}
}

// NewWebAuthn builds the relying-party config. RPID is your domain (no scheme/port).
func NewWebAuthn(rpID, rpName string, origins []string) (*webauthn.WebAuthn, error) {
	return webauthn.New(&webauthn.Config{RPID: rpID, RPDisplayName: rpName, RPOrigins: origins})
}
