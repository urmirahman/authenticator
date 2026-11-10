package sync

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
	"github.com/urmirahman/authenticator/apps/server/internal/platform/database"
)

// ApplyResult tells the service what happened to each change.
type ApplyResult struct {
	Accepted  []uuid.UUID
	Conflicts []db.VaultItem
	Cursor    int64
}

type Repository interface {
	OwnsVault(ctx context.Context, vaultID, userID uuid.UUID) error
	ChangesSince(ctx context.Context, vaultID uuid.UUID, seq int64, limit int32) ([]db.ListChangesSinceRow, error)
	LiveItems(ctx context.Context, vaultID uuid.UUID) ([]db.VaultItem, error)
	GetItem(ctx context.Context, vaultID, itemID uuid.UUID) (db.VaultItem, error)
	Apply(ctx context.Context, vaultID uuid.UUID, device uuid.NullUUID, changes []Change) (ApplyResult, error)
}

type pgRepository struct {
	tx database.Transactor
	q  *db.Queries
}

func NewRepository(dbConn db.DBTX, tx database.Transactor) Repository {
	return &pgRepository{tx: tx, q: db.New(dbConn)}
}

func (r *pgRepository) OwnsVault(ctx context.Context, vaultID, userID uuid.UUID) error {
	_, err := r.q.GetVaultForUser(ctx, db.GetVaultForUserParams{ID: vaultID, UserID: userID})
	return err
}

func (r *pgRepository) ChangesSince(ctx context.Context, vaultID uuid.UUID, seq int64, limit int32) ([]db.ListChangesSinceRow, error) {
	return r.q.ListChangesSince(ctx, db.ListChangesSinceParams{VaultID: vaultID, Seq: seq, Limit: limit})
}

func (r *pgRepository) LiveItems(ctx context.Context, vaultID uuid.UUID) ([]db.VaultItem, error) {
	return r.q.ListLiveItems(ctx, vaultID)
}

func (r *pgRepository) GetItem(ctx context.Context, vaultID, itemID uuid.UUID) (db.VaultItem, error) {
	return r.q.GetVaultItem(ctx, db.GetVaultItemParams{ID: itemID, VaultID: vaultID})
}

// Apply writes all changes in ONE transaction. Each row is locked (SELECT ... FOR UPDATE) so two
// devices pushing the same item at once can't both win.
func (r *pgRepository) Apply(ctx context.Context, vaultID uuid.UUID, device uuid.NullUUID, changes []Change) (ApplyResult, error) {
	var res ApplyResult
	err := database.InTx(ctx, r.tx, func(tx pgx.Tx) error {
		q := r.q.WithTx(tx)
		for _, c := range changes {
			cur, err := q.LockVaultItem(ctx, c.ID)
			var existing *db.VaultItem
			switch {
			case err == nil:
				existing = &cur
			case !errors.Is(err, pgx.ErrNoRows):
				return err
			}
			if existing != nil && existing.VaultID != vaultID {
				return ErrForeignItem
			}
			if !Accepts(existing, c.Version) {
				if existing != nil {
					res.Conflicts = append(res.Conflicts, *existing)
				}
				continue
			}
			if existing == nil {
				_, err = q.InsertVaultItem(ctx, db.InsertVaultItemParams{
					ID: c.ID, VaultID: vaultID, Kind: c.Kind, Ciphertext: c.Ciphertext, Nonce: c.Nonce,
					Version: c.Version, Deleted: c.Deleted, UpdatedByDevice: device,
				})
			} else {
				_, err = q.UpdateVaultItem(ctx, db.UpdateVaultItemParams{
					ID: c.ID, Ciphertext: c.Ciphertext, Nonce: c.Nonce, Version: c.Version,
					Deleted: c.Deleted, UpdatedByDevice: device,
				})
			}
			if err != nil {
				return err
			}
			if res.Cursor, err = q.AppendChange(ctx, db.AppendChangeParams{
				VaultID: vaultID, ItemID: c.ID, Version: c.Version, DeviceID: device,
			}); err != nil {
				return err
			}
			res.Accepted = append(res.Accepted, c.ID)
		}
		if res.Cursor == 0 {
			var err error
			if res.Cursor, err = q.LatestSeq(ctx, vaultID); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return ApplyResult{}, err
	}
	return res, nil
}
