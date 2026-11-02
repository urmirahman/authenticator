package passkeys

import (
	"context"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

type Repository interface {
	GetUser(ctx context.Context, id uuid.UUID) (db.User, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]db.PasskeyCredential, error)
	Create(ctx context.Context, p db.CreatePasskeyParams) (db.PasskeyCredential, error)
	UpdateAfterLogin(ctx context.Context, p db.UpdatePasskeyAfterLoginParams) error
	Rename(ctx context.Context, id, userID uuid.UUID, name string) (int64, error)
	Delete(ctx context.Context, id, userID uuid.UUID) (int64, error)
	SaveChallenge(ctx context.Context, p db.CreateChallengeParams) (uuid.UUID, error)
	ConsumeChallenge(ctx context.Context, id uuid.UUID, kind string) (db.WebauthnChallenge, error)
}

type pgRepository struct{ q *db.Queries }

func NewRepository(q *db.Queries) Repository { return &pgRepository{q: q} }

func (r *pgRepository) GetUser(ctx context.Context, id uuid.UUID) (db.User, error) {
	return r.q.GetUserByID(ctx, id)
}
func (r *pgRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]db.PasskeyCredential, error) {
	return r.q.ListPasskeysByUser(ctx, userID)
}
func (r *pgRepository) Create(ctx context.Context, p db.CreatePasskeyParams) (db.PasskeyCredential, error) {
	return r.q.CreatePasskey(ctx, p)
}
func (r *pgRepository) UpdateAfterLogin(ctx context.Context, p db.UpdatePasskeyAfterLoginParams) error {
	return r.q.UpdatePasskeyAfterLogin(ctx, p)
}
func (r *pgRepository) Rename(ctx context.Context, id, userID uuid.UUID, name string) (int64, error) {
	return r.q.RenamePasskey(ctx, db.RenamePasskeyParams{ID: id, UserID: userID, Name: name})
}
func (r *pgRepository) Delete(ctx context.Context, id, userID uuid.UUID) (int64, error) {
	return r.q.DeletePasskey(ctx, db.DeletePasskeyParams{ID: id, UserID: userID})
}
func (r *pgRepository) SaveChallenge(ctx context.Context, p db.CreateChallengeParams) (uuid.UUID, error) {
	return r.q.CreateChallenge(ctx, p)
}
func (r *pgRepository) ConsumeChallenge(ctx context.Context, id uuid.UUID, kind string) (db.WebauthnChallenge, error) {
	return r.q.ConsumeChallenge(ctx, db.ConsumeChallengeParams{ID: id, Kind: kind})
}
