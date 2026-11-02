// Package passkeys implements WebAuthn passkey registration, sign-in and management (go-webauthn).
package passkeys

import (
	"encoding/json"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

// webauthnUser adapts our user to the webauthn.User interface the library expects.
// WebAuthnID is the "user handle" stored inside the passkey: our user id's 16 bytes.
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

func newWebauthnUser(u db.User, rows []db.PasskeyCredential) *webauthnUser {
	wu := &webauthnUser{id: u.ID, name: u.Email, displayName: u.DisplayName}
	if wu.displayName == "" {
		wu.displayName = u.Email
	}
	for _, r := range rows {
		var c webauthn.Credential
		if json.Unmarshal(r.Credential, &c) == nil && len(c.ID) > 0 {
			wu.credentials = append(wu.credentials, c)
		}
	}
	return wu
}

// BeginResponse: pass options.publicKey to navigator.credentials.create()/get() (or the
// native passkey API), then send the result to the matching /finish with challengeId.
type BeginResponse struct {
	ChallengeID uuid.UUID `json:"challengeId"`
	Options     any       `json:"options"`
}

type FinishRequest struct {
	ChallengeID uuid.UUID       `json:"challengeId"`
	Credential  json.RawMessage `json:"credential"`
	Name        string          `json:"name,omitempty"` // register only, e.g. "iPhone passkey"
}

type RenameRequest struct {
	Name string `json:"name"`
}

type Passkey struct {
	ID             uuid.UUID  `json:"id"`
	Name           string     `json:"name"`
	BackupEligible bool       `json:"backupEligible"` // true = synced passkey (iCloud/Google)
	CreatedAt      time.Time  `json:"createdAt"`
	LastUsedAt     *time.Time `json:"lastUsedAt,omitempty"`
}

func fromDB(p db.PasskeyCredential) Passkey {
	return Passkey{ID: p.ID, Name: p.Name, BackupEligible: p.BackupEligible, CreatedAt: p.CreatedAt, LastUsedAt: p.LastUsedAt}
}
