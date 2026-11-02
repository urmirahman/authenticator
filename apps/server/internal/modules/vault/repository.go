package vault

import (
	"context"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

type Repository interface {
	List(ctx context.Context, userID uuid.UUID) ([]db.Vault, error)
	Create(ctx context.Context, p db.CreateVaultParams) (db.Vault, error)
}

type pgRepository struct{ q *db.Queries }

func NewRepository(q *db.Queries) Repository { return &pgRepository{q: q} }

func (r *pgRepository) List(ctx context.Context, userID uuid.UUID) ([]db.Vault, error) {
	return r.q.ListVaults(ctx, userID)
}

func (r *pgRepository) Create(ctx context.Context, p db.CreateVaultParams) (db.Vault, error) {
	return r.q.CreateVault(ctx, p)
}
