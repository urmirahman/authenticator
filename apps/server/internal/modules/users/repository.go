package users

import (
	"context"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

// Repository is the port the service depends on; the pg implementation is the adapter.
type Repository interface {
	GetByID(ctx context.Context, id uuid.UUID) (db.User, error)
}

type pgRepository struct{ q *db.Queries }

func NewRepository(q *db.Queries) Repository { return &pgRepository{q: q} }

func (r *pgRepository) GetByID(ctx context.Context, id uuid.UUID) (db.User, error) {
	return r.q.GetUserByID(ctx, id)
}
