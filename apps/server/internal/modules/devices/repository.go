package devices

import (
	"context"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

type Repository interface {
	List(ctx context.Context, userID uuid.UUID) ([]db.Device, error)
	Create(ctx context.Context, p db.CreateDeviceParams) (db.Device, error)
	Revoke(ctx context.Context, id, userID uuid.UUID) error
}

type pgRepository struct{ q *db.Queries }

func NewRepository(q *db.Queries) Repository { return &pgRepository{q: q} }

func (r *pgRepository) List(ctx context.Context, userID uuid.UUID) ([]db.Device, error) {
	return r.q.ListDevices(ctx, userID)
}

func (r *pgRepository) Create(ctx context.Context, p db.CreateDeviceParams) (db.Device, error) {
	return r.q.CreateDevice(ctx, p)
}

func (r *pgRepository) Revoke(ctx context.Context, id, userID uuid.UUID) error {
	return r.q.RevokeDevice(ctx, db.RevokeDeviceParams{ID: id, UserID: userID})
}
