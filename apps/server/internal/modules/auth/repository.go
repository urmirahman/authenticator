package auth

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

type Repository interface {
	FindOrCreateUser(ctx context.Context, p Profile) (uuid.UUID, error)
	CreateSession(ctx context.Context, p db.CreateSessionParams) (db.Session, error)
	SessionByHash(ctx context.Context, hash []byte) (db.Session, error)
	RevokeSession(ctx context.Context, id uuid.UUID) error
	RevokeFamily(ctx context.Context, familyID uuid.UUID) error
}

type pgRepository struct {
	pool *pgxpool.Pool
	q    *db.Queries
}

func NewRepository(pool *pgxpool.Pool) Repository {
	return &pgRepository{pool: pool, q: db.New(pool)}
}

// FindOrCreateUser links a provider identity to a user, creating both if needed, in one transaction.
func (r *pgRepository) FindOrCreateUser(ctx context.Context, p Profile) (uuid.UUID, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return uuid.Nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }() // no-op after Commit
	q := r.q.WithTx(tx)

	ident, err := q.GetIdentity(ctx, db.GetIdentityParams{Provider: p.Provider, ProviderUserID: p.ProviderUserID})
	if err == nil {
		return ident.UserID, tx.Commit(ctx)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, err
	}

	// NOTE: linking by email is only safe when the provider says the email is verified.
	user, err := q.GetUserByEmail(ctx, p.Email)
	if errors.Is(err, pgx.ErrNoRows) {
		user, err = q.CreateUser(ctx, db.CreateUserParams{Email: p.Email, DisplayName: p.Name})
	}
	if err != nil {
		return uuid.Nil, err
	}
	if _, err := q.CreateIdentity(ctx, db.CreateIdentityParams{
		UserID: user.ID, Provider: p.Provider, ProviderUserID: p.ProviderUserID,
		Email: pgtype.Text{String: p.Email, Valid: p.Email != ""},
	}); err != nil {
		return uuid.Nil, err
	}
	return user.ID, tx.Commit(ctx)
}

func (r *pgRepository) CreateSession(ctx context.Context, p db.CreateSessionParams) (db.Session, error) {
	return r.q.CreateSession(ctx, p)
}

func (r *pgRepository) SessionByHash(ctx context.Context, hash []byte) (db.Session, error) {
	return r.q.GetSessionByTokenHash(ctx, hash)
}

func (r *pgRepository) RevokeSession(ctx context.Context, id uuid.UUID) error {
	return r.q.RevokeSession(ctx, id)
}

func (r *pgRepository) RevokeFamily(ctx context.Context, familyID uuid.UUID) error {
	return r.q.RevokeSessionFamily(ctx, familyID)
}
