package vault

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

var ErrWeakKDF = errors.New("kdf must be argon2id with >= 19 MiB memory and a 16+ byte salt")

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
	// The server can't check the key, but it can refuse obviously weak KDF settings.
	if req.KDF.Algorithm != "argon2id" || req.KDF.MemoryKiB < 19*1024 || len(req.KDF.Salt) < 16 {
		return Vault{}, ErrWeakKDF
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
