// Package vault stores each user's encrypted vault header (KDF params + wrapped key).
// The server never sees the master password or the plaintext vault key.
package vault

import (
	"time"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

type KDF struct {
	Algorithm   string `json:"algorithm"`
	Salt        []byte `json:"salt"` // []byte is base64 in JSON automatically
	MemoryKiB   int32  `json:"memoryKiB"`
	Iterations  int32  `json:"iterations"`
	Parallelism int32  `json:"parallelism"`
}

type Vault struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	KDF        KDF       `json:"kdf"`
	WrappedKey []byte    `json:"wrappedKey"`
	CreatedAt  time.Time `json:"createdAt"`
}

type CreateRequest struct {
	Name       string `json:"name"`
	KDF        KDF    `json:"kdf"`
	WrappedKey []byte `json:"wrappedKey"`
}

func fromDB(v db.Vault) Vault {
	return Vault{
		ID: v.ID, Name: v.Name, WrappedKey: v.WrappedKey, CreatedAt: v.CreatedAt,
		KDF: KDF{Algorithm: v.KdfAlgorithm, Salt: v.KdfSalt, MemoryKiB: v.KdfMemoryKib, Iterations: v.KdfIterations, Parallelism: v.KdfParallelism},
	}
}

// RekeyRequest is sent after a master-password change: same vault key, new KDF salt + wrapping.
type RekeyRequest struct {
	KDF        KDF    `json:"kdf"`
	WrappedKey []byte `json:"wrappedKey"`
}
