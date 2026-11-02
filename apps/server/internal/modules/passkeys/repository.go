package passkeys

import (
	"context"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

type Repository interface {
	ListByUser(ctx context.Context, userID uuid.UUID) ([]db.PasskeyCredential, error)
	Create(ctx context.Context, p db.CreatePasskeyParams) (db.PasskeyCredential, error)
}

type pgRepository struct{ q *db.Queries }

func NewRepository(q *db.Queries) Repository { return &pgRepository{q: q} }

func (r *pgRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]db.PasskeyCredential, error) {
	return r.q.ListPasskeysByUser(ctx, userID)
}

func (r *pgRepository) Create(ctx context.Context, p db.CreatePasskeyParams) (db.PasskeyCredential, error) {
	return r.q.CreatePasskey(ctx, p)
}
