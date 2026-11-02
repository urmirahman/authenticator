package vault

import (
	"context"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

type Repository interface {
	List(ctx context.Context, userID uuid.UUID) ([]db.Vault, error)
	Create(ctx context.Context, p db.CreateVaultParams) (db.Vault, error)
	Get(ctx context.Context, id, userID uuid.UUID) (db.Vault, error)
	UpdateKey(ctx context.Context, p db.UpdateVaultKeyParams) (db.Vault, error)
}

type pgRepository struct{ q *db.Queries }

func NewRepository(q *db.Queries) Repository { return &pgRepository{q: q} }

func (r *pgRepository) List(ctx context.Context, userID uuid.UUID) ([]db.Vault, error) {
	return r.q.ListVaults(ctx, userID)
}

func (r *pgRepository) Create(ctx context.Context, p db.CreateVaultParams) (db.Vault, error) {
	return r.q.CreateVault(ctx, p)
}

func (r *pgRepository) Get(ctx context.Context, id, userID uuid.UUID) (db.Vault, error) {
	return r.q.GetVaultForUser(ctx, db.GetVaultForUserParams{ID: id, UserID: userID})
}

func (r *pgRepository) UpdateKey(ctx context.Context, p db.UpdateVaultKeyParams) (db.Vault, error) {
	return r.q.UpdateVaultKey(ctx, p)
}
