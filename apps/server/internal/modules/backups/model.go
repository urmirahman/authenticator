// Package backups stores encrypted backup files. Like the vault, the server only ever sees
// ciphertext: the client encrypts the export (usually with a separate backup password) first.
package backups

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Meta is what lists show (no ciphertext, so listing stays cheap).
type Meta struct {
	ID        uuid.UUID       `json:"id"`
	Name      string          `json:"name"`
	KDF       json.RawMessage `json:"kdf"`
	ItemCount int32           `json:"itemCount"`
	SizeBytes int32           `json:"sizeBytes"`
	CreatedAt time.Time       `json:"createdAt"`
}

// Backup is the full download.
type Backup struct {
	Meta
	Ciphertext []byte `json:"ciphertext"`
	Nonce      []byte `json:"nonce"`
}

type CreateRequest struct {
	Name       string          `json:"name"`
	Ciphertext []byte          `json:"ciphertext"`
	Nonce      []byte          `json:"nonce"`
	KDF        json.RawMessage `json:"kdf"`
	ItemCount  int32           `json:"itemCount"`
}
