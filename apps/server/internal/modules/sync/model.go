// Package sync moves encrypted vault items between devices using a change log + cursor.
package sync

import (
	"time"

	"github.com/google/uuid"
)

type Item struct {
	ID         uuid.UUID `json:"id"`
	VaultID    uuid.UUID `json:"vaultId"`
	Ciphertext []byte    `json:"ciphertext"`
	Nonce      []byte    `json:"nonce"`
	Version    int32     `json:"version"`
	Deleted    bool      `json:"deleted"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type PullResponse struct {
	Items   []Item `json:"items"`
	Cursor  string `json:"cursor"`
	HasMore bool   `json:"hasMore"`
}

type Change struct {
	ID         uuid.UUID `json:"id"`
	Ciphertext []byte    `json:"ciphertext"`
	Nonce      []byte    `json:"nonce"`
	Version    int32     `json:"version"`
	Deleted    bool      `json:"deleted"`
}

type PushRequest struct {
	VaultID  uuid.UUID `json:"vaultId"`
	DeviceID uuid.UUID `json:"deviceId"`
	Changes  []Change  `json:"changes"`
}

type PushResponse struct {
	Accepted  []uuid.UUID `json:"accepted"`
	Conflicts []Item      `json:"conflicts"`
	Cursor    string      `json:"cursor"`
}
