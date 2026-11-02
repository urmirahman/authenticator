package sync

import (
	"context"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

type Repository interface {
	OwnsVault(ctx context.Context, vaultID, userID uuid.UUID) (bool, error)
	ChangesSince(ctx context.Context, vaultID uuid.UUID, seq int64, limit int32) ([]db.ListChangesSinceRow, error)
}

type pgRepository struct{ q *db.Queries }

func NewRepository(q *db.Queries) Repository { return &pgRepository{q: q} }

func (r *pgRepository) OwnsVault(ctx context.Context, vaultID, userID uuid.UUID) (bool, error) {
	_, err := r.q.GetVaultForUser(ctx, db.GetVaultForUserParams{ID: vaultID, UserID: userID})
	if err != nil {
		return false, err
	}
	return true, nil
}

func (r *pgRepository) ChangesSince(ctx context.Context, vaultID uuid.UUID, seq int64, limit int32) ([]db.ListChangesSinceRow, error) {
	return r.q.ListChangesSince(ctx, db.ListChangesSinceParams{VaultID: vaultID, Seq: seq, Limit: limit})
}
