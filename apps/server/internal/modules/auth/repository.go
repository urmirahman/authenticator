package auth

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
	"github.com/urmirahman/authenticator/apps/server/internal/platform/database"
)

var ErrEmailTaken = errors.New("an account with this email already exists; sign in with the original method and link this provider")

type OAuthState struct {
	State, Provider, CodeVerifier, Nonce, RedirectURI string
	ExpiresAt                                         time.Time
}

type Repository interface {
	FindOrCreateUser(ctx context.Context, p Profile) (uuid.UUID, error)
	SaveState(ctx context.Context, s OAuthState) error
	ConsumeState(ctx context.Context, state, provider string) (OAuthState, error)
	CreateLoginCode(ctx context.Context, hash []byte, userID uuid.UUID, exp time.Time) error
	ConsumeLoginCode(ctx context.Context, hash []byte) (uuid.UUID, error)
	CreateSession(ctx context.Context, p db.CreateSessionParams) (db.Session, error)
	SessionByHash(ctx context.Context, hash []byte) (db.Session, error)
	RevokeSession(ctx context.Context, id uuid.UUID) error
	RevokeFamily(ctx context.Context, familyID uuid.UUID) error
}

type pgRepository struct {
	tx database.Transactor
	q  *db.Queries
}

func NewRepository(dbConn db.DBTX, tx database.Transactor) Repository {
	return &pgRepository{tx: tx, q: db.New(dbConn)}
}

// LinkDecision is the pure rule for "what do we do with this provider profile?".
// Kept separate from SQL so it's easy to unit test.
type LinkDecision int

const (
	UseLinkedUser    LinkDecision = iota // identity already linked
	LinkToExisting                       // same verified email -> attach identity to that user
	CreateNew                            // brand new person
	RejectEmailTaken                     // email exists but this provider didn't verify it: refuse (account takeover risk)
)

func DecideLink(identityExists, userWithEmailExists, emailVerified bool) LinkDecision {
	switch {
	case identityExists:
		return UseLinkedUser
	case userWithEmailExists && emailVerified:
		return LinkToExisting
	case userWithEmailExists:
		return RejectEmailTaken
	default:
		return CreateNew
	}
}

// FindOrCreateUser applies DecideLink inside one transaction.
func (r *pgRepository) FindOrCreateUser(ctx context.Context, p Profile) (uuid.UUID, error) {
	var userID uuid.UUID
	err := database.InTx(ctx, r.tx, func(tx pgx.Tx) error {
		q := r.q.WithTx(tx)

		ident, err := q.GetIdentity(ctx, db.GetIdentityParams{Provider: p.Provider, ProviderUserID: p.ProviderUserID})
		if err != nil && !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		identityExists := err == nil

		var existing db.User
		userExists := false
		if !identityExists && p.Email != "" {
			existing, err = q.GetUserByEmail(ctx, p.Email)
			if err != nil && !errors.Is(err, pgx.ErrNoRows) {
				return err
			}
			userExists = err == nil
		}

		switch DecideLink(identityExists, userExists, p.EmailVerified) {
		case UseLinkedUser:
			userID = ident.UserID
			return nil
		case RejectEmailTaken:
			return ErrEmailTaken
		case LinkToExisting:
			userID = existing.ID
		case CreateNew:
			email := p.Email
			if email == "" { // e.g. Facebook without email permission
				email = p.Provider + ":" + p.ProviderUserID
			}
			u, err := q.CreateUser(ctx, db.CreateUserParams{Email: email, DisplayName: p.Name})
			if err != nil {
				return err
			}
			userID = u.ID
		}
		if _, err := q.CreateIdentity(ctx, db.CreateIdentityParams{
			UserID: userID, Provider: p.Provider, ProviderUserID: p.ProviderUserID,
			Email: pgtype.Text{String: p.Email, Valid: p.Email != ""}, EmailVerified: p.EmailVerified,
		}); err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return uuid.Nil, err
	}
	return userID, nil
}

func (r *pgRepository) SaveState(ctx context.Context, s OAuthState) error {
	return r.q.CreateOAuthState(ctx, db.CreateOAuthStateParams{
		State: s.State, Provider: s.Provider, CodeVerifier: s.CodeVerifier, Nonce: s.Nonce,
		RedirectUri: s.RedirectURI, ExpiresAt: s.ExpiresAt,
	})
}

func (r *pgRepository) ConsumeState(ctx context.Context, state, provider string) (OAuthState, error) {
	s, err := r.q.ConsumeOAuthState(ctx, db.ConsumeOAuthStateParams{State: state, Provider: provider})
	if err != nil {
		return OAuthState{}, err
	}
	return OAuthState{s.State, s.Provider, s.CodeVerifier, s.Nonce, s.RedirectUri, s.ExpiresAt}, nil
}

func (r *pgRepository) CreateLoginCode(ctx context.Context, hash []byte, userID uuid.UUID, exp time.Time) error {
	return r.q.CreateLoginCode(ctx, db.CreateLoginCodeParams{CodeHash: hash, UserID: userID, ExpiresAt: exp})
}

func (r *pgRepository) ConsumeLoginCode(ctx context.Context, hash []byte) (uuid.UUID, error) {
	return r.q.ConsumeLoginCode(ctx, hash)
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
