package users

import (
	"context"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

// Repository is the port the service depends on; the pg implementation is the adapter.
type Repository interface {
	GetByID(ctx context.Context, id uuid.UUID) (db.User, error)
	UpdateProfile(ctx context.Context, id uuid.UUID, displayName string) (db.User, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

type pgRepository struct{ q *db.Queries }

func NewRepository(q *db.Queries) Repository { return &pgRepository{q: q} }

func (r *pgRepository) GetByID(ctx context.Context, id uuid.UUID) (db.User, error) {
	return r.q.GetUserByID(ctx, id)
}

func (r *pgRepository) UpdateProfile(ctx context.Context, id uuid.UUID, displayName string) (db.User, error) {
	return r.q.UpdateUserProfile(ctx, db.UpdateUserProfileParams{ID: id, DisplayName: displayName})
}

// Delete removes the user; ON DELETE CASCADE removes identities, sessions, devices, vaults, items.
func (r *pgRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.q.DeleteUser(ctx, id)
}
