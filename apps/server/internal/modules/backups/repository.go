package backups

import (
	"context"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

type Repository interface {
	Count(ctx context.Context, userID uuid.UUID) (int64, error)
	Create(ctx context.Context, p db.CreateBackupParams) (db.CreateBackupRow, error)
	List(ctx context.Context, userID uuid.UUID) ([]db.ListBackupsRow, error)
	Get(ctx context.Context, id, userID uuid.UUID) (db.Backup, error)
	Delete(ctx context.Context, id, userID uuid.UUID) (int64, error)
}

type pgRepository struct{ q *db.Queries }

func NewRepository(q *db.Queries) Repository { return &pgRepository{q: q} }

func (r *pgRepository) Count(ctx context.Context, userID uuid.UUID) (int64, error) {
	return r.q.CountBackups(ctx, userID)
}
func (r *pgRepository) Create(ctx context.Context, p db.CreateBackupParams) (db.CreateBackupRow, error) {
	return r.q.CreateBackup(ctx, p)
}
func (r *pgRepository) List(ctx context.Context, userID uuid.UUID) ([]db.ListBackupsRow, error) {
	return r.q.ListBackups(ctx, userID)
}
func (r *pgRepository) Get(ctx context.Context, id, userID uuid.UUID) (db.Backup, error) {
	return r.q.GetBackup(ctx, db.GetBackupParams{ID: id, UserID: userID})
}
func (r *pgRepository) Delete(ctx context.Context, id, userID uuid.UUID) (int64, error) {
	return r.q.DeleteBackup(ctx, db.DeleteBackupParams{ID: id, UserID: userID})
}
