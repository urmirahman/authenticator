package devices

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
	"github.com/urmirahman/authenticator/apps/server/internal/platform/database"
)

type Repository interface {
	List(ctx context.Context, userID uuid.UUID) ([]db.Device, error)
	// Create registers a device and binds the caller's current session family to it.
	Create(ctx context.Context, p db.CreateDeviceParams, sessionFamily uuid.UUID) (db.Device, error)
	// Revoke marks the device revoked and revokes every refresh token issued to it.
	Revoke(ctx context.Context, id, userID uuid.UUID) (bool, error)
}

type pgRepository struct {
	tx database.Transactor
	q  *db.Queries
}

func NewRepository(dbConn db.DBTX, tx database.Transactor) Repository {
	return &pgRepository{tx: tx, q: db.New(dbConn)}
}

func (r *pgRepository) List(ctx context.Context, userID uuid.UUID) ([]db.Device, error) {
	return r.q.ListDevices(ctx, userID)
}

func (r *pgRepository) Create(ctx context.Context, p db.CreateDeviceParams, family uuid.UUID) (db.Device, error) {
	var d db.Device
	err := database.InTx(ctx, r.tx, func(tx pgx.Tx) error {
		q := r.q.WithTx(tx)
		var err error
		d, err = q.CreateDevice(ctx, p)
		if err != nil {
			return err
		}
		if family != uuid.Nil {
			return q.BindFamilyToDevice(ctx, db.BindFamilyToDeviceParams{
				FamilyID: family, UserID: p.UserID, DeviceID: uuid.NullUUID{UUID: d.ID, Valid: true},
			})
		}
		return nil
	})
	return d, err
}

func (r *pgRepository) Revoke(ctx context.Context, id, userID uuid.UUID) (bool, error) {
	var ok bool
	err := database.InTx(ctx, r.tx, func(tx pgx.Tx) error {
		q := r.q.WithTx(tx)
		n, err := q.RevokeDevice(ctx, db.RevokeDeviceParams{ID: id, UserID: userID})
		if err != nil || n == 0 {
			return err
		}
		if err := q.RevokeSessionsByDevice(ctx, db.RevokeSessionsByDeviceParams{
			DeviceID: uuid.NullUUID{UUID: id, Valid: true}, UserID: userID,
		}); err != nil {
			return err
		}
		ok = true
		return nil
	})
	return ok, err
}
