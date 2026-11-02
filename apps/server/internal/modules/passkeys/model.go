// Package passkeys implements WebAuthn registration and login (go-webauthn).
package passkeys

import (
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"
)

// webauthnUser adapts our user to the webauthn.User interface the library expects.
type webauthnUser struct {
	id          uuid.UUID
	name        string
	displayName string
	credentials []webauthn.Credential
}

var _ webauthn.User = (*webauthnUser)(nil)

func (u *webauthnUser) WebAuthnID() []byte                         { return u.id[:] }
func (u *webauthnUser) WebAuthnName() string                       { return u.name }
func (u *webauthnUser) WebAuthnDisplayName() string                { return u.displayName }
func (u *webauthnUser) WebAuthnCredentials() []webauthn.Credential { return u.credentials }

type BeginResponse struct {
	ChallengeID string `json:"challengeId"`
	Options     any    `json:"options"`
}
