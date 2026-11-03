package users

import (
	"context"
	"time"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

// Repository is the port the service depends on; the pg implementation is the adapter.
type Repository interface {
	GetByID(ctx context.Context, id uuid.UUID) (db.User, error)
	UpdateProfile(ctx context.Context, id uuid.UUID, displayName string) (db.User, error)
	Delete(ctx context.Context, id uuid.UUID) error
	// SignedInAt is when the session family (one sign-in) started; used for re-auth checks.
	SignedInAt(ctx context.Context, userID, sessionFamily uuid.UUID) (time.Time, error)
	// Identities are the linked OAuth providers; PasskeyCount the registered passkeys.
	Identities(ctx context.Context, userID uuid.UUID) ([]db.Identity, error)
	PasskeyCount(ctx context.Context, userID uuid.UUID) (int, error)
	Queries() *db.Queries // read-only export queries
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

func (r *pgRepository) SignedInAt(ctx context.Context, userID, family uuid.UUID) (time.Time, error) {
	return r.q.SessionSignedInAt(ctx, db.SessionSignedInAtParams{FamilyID: family, UserID: userID})
}

func (r *pgRepository) Queries() *db.Queries { return r.q }

func (r *pgRepository) Identities(ctx context.Context, userID uuid.UUID) ([]db.Identity, error) {
	return r.q.ListIdentitiesByUser(ctx, userID)
}

func (r *pgRepository) PasskeyCount(ctx context.Context, userID uuid.UUID) (int, error) {
	pk, err := r.q.ListPasskeysByUser(ctx, userID)
	return len(pk), err
}
