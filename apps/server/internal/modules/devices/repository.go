package devices

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

type Repository interface {
	List(ctx context.Context, userID uuid.UUID) ([]db.Device, error)
	// Create registers a device and binds the caller's current session family to it.
	Create(ctx context.Context, p db.CreateDeviceParams, sessionFamily uuid.UUID) (db.Device, error)
	// Revoke marks the device revoked and revokes every refresh token issued to it.
	Revoke(ctx context.Context, id, userID uuid.UUID) (bool, error)
}

type pgRepository struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewRepository(pool *pgxpool.Pool) Repository { return &pgRepository{pool: pool, q: db.New(pool)} }

func (r *pgRepository) List(ctx context.Context, userID uuid.UUID) ([]db.Device, error) {
	return r.q.ListDevices(ctx, userID)
}

func (r *pgRepository) Create(ctx context.Context, p db.CreateDeviceParams, family uuid.UUID) (db.Device, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return db.Device{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	q := r.q.WithTx(tx)
	d, err := q.CreateDevice(ctx, p)
	if err != nil {
		return db.Device{}, err
	}
	if family != uuid.Nil {
		if err := q.BindFamilyToDevice(ctx, db.BindFamilyToDeviceParams{
			FamilyID: family, UserID: p.UserID, DeviceID: uuid.NullUUID{UUID: d.ID, Valid: true},
		}); err != nil {
			return db.Device{}, err
		}
	}
	return d, tx.Commit(ctx)
}

func (r *pgRepository) Revoke(ctx context.Context, id, userID uuid.UUID) (bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	q := r.q.WithTx(tx)
	n, err := q.RevokeDevice(ctx, db.RevokeDeviceParams{ID: id, UserID: userID})
	if err != nil || n == 0 {
		return false, err
	}
	if err := q.RevokeSessionsByDevice(ctx, db.RevokeSessionsByDeviceParams{
		DeviceID: uuid.NullUUID{UUID: id, Valid: true}, UserID: userID,
	}); err != nil {
		return false, err
	}
	return true, tx.Commit(ctx)
}
