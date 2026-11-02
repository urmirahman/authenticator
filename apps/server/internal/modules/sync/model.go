// Package sync stores encrypted vault items (accounts and folders) and moves them between
// devices using an append-only change log and a cursor. The server never decrypts anything.
package sync

import (
	"time"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

// Item is an encrypted account or folder. []byte fields are base64 in JSON.
type Item struct {
	ID         uuid.UUID `json:"id"`
	VaultID    uuid.UUID `json:"vaultId"`
	Kind       string    `json:"kind"` // "account" | "folder"
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

// Change is one client edit. Version must be exactly (server version + 1); new items start at 1.
// A delete is a change with Deleted=true (a "tombstone") so other devices learn about it.
type Change struct {
	ID         uuid.UUID `json:"id"`
	Kind       string    `json:"kind,omitempty"`
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

func fromDB(i db.VaultItem) Item {
	return Item{ID: i.ID, VaultID: i.VaultID, Kind: i.Kind, Ciphertext: i.Ciphertext, Nonce: i.Nonce, Version: i.Version, Deleted: i.Deleted, UpdatedAt: i.UpdatedAt}
}
