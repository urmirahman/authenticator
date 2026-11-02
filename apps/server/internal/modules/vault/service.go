package vault

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

var (
	ErrWeakKDF       = errors.New("kdf must be argon2id, >= 19 MiB memory, >= 2 iterations, 16+ byte salt")
	ErrBadWrappedKey = errors.New("wrappedKey must be 72-512 bytes (nonce + encrypted key + tag)")
)

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]Vault, error) {
	rows, err := s.repo.List(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]Vault, 0, len(rows))
	for _, v := range rows {
		out = append(out, fromDB(v))
	}
	return out, nil
}

func (s *Service) Create(ctx context.Context, userID uuid.UUID, req CreateRequest) (Vault, error) {
	if err := checkEnvelope(req.KDF, req.WrappedKey); err != nil {
		return Vault{}, err
	}
	if req.Name == "" {
		req.Name = "Personal"
	}
	v, err := s.repo.Create(ctx, db.CreateVaultParams{
		UserID: userID, Name: req.Name, KdfAlgorithm: req.KDF.Algorithm, KdfSalt: req.KDF.Salt,
		KdfMemoryKib: req.KDF.MemoryKiB, KdfIterations: req.KDF.Iterations, KdfParallelism: req.KDF.Parallelism,
		WrappedKey: req.WrappedKey,
	})
	if err != nil {
		return Vault{}, err
	}
	return fromDB(v), nil
}

// Get returns the key envelope (KDF params + wrapped key) a device needs to unlock the vault.
func (s *Service) Get(ctx context.Context, userID, id uuid.UUID) (Vault, error) {
	v, err := s.repo.Get(ctx, id, userID)
	if err != nil {
		return Vault{}, err
	}
	return fromDB(v), nil
}

// Rekey replaces the envelope after a master-password change. Items don't change because
// the vault key itself stays the same; only its wrapping does.
func (s *Service) Rekey(ctx context.Context, userID, id uuid.UUID, req RekeyRequest) (Vault, error) {
	if err := checkEnvelope(req.KDF, req.WrappedKey); err != nil {
		return Vault{}, err
	}
	v, err := s.repo.UpdateKey(ctx, db.UpdateVaultKeyParams{
		ID: id, UserID: userID, KdfSalt: req.KDF.Salt, KdfMemoryKib: req.KDF.MemoryKiB,
		KdfIterations: req.KDF.Iterations, KdfParallelism: req.KDF.Parallelism, WrappedKey: req.WrappedKey,
	})
	if err != nil {
		return Vault{}, err
	}
	return fromDB(v), nil
}

// checkEnvelope: the server can't check the key, but it can refuse obviously weak settings.
// 32-byte key + 16-byte Poly1305 tag + 24-byte nonce = 72 bytes minimum for the wrapped key.
func checkEnvelope(k KDF, wrapped []byte) error {
	if k.Algorithm != "argon2id" || k.MemoryKiB < 19*1024 || k.Iterations < 2 || k.Parallelism < 1 || len(k.Salt) < 16 {
		return ErrWeakKDF
	}
	if len(wrapped) < 72 || len(wrapped) > 512 {
		return ErrBadWrappedKey
	}
	return nil
}
