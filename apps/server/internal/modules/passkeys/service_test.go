package passkeys_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/auth"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/passkeys"
)

type mockRepo struct {
	getUserFn          func(ctx context.Context, id uuid.UUID) (db.User, error)
	listByUserFn       func(ctx context.Context, userID uuid.UUID) ([]db.PasskeyCredential, error)
	createFn           func(ctx context.Context, p db.CreatePasskeyParams) (db.PasskeyCredential, error)
	updateAfterLoginFn func(ctx context.Context, p db.UpdatePasskeyAfterLoginParams) error
	renameFn           func(ctx context.Context, id, userID uuid.UUID, name string) (int64, error)
	deleteFn           func(ctx context.Context, id, userID uuid.UUID) (int64, error)
	saveChallengeFn    func(ctx context.Context, p db.CreateChallengeParams) (uuid.UUID, error)
	consumeChallengeFn func(ctx context.Context, id uuid.UUID, kind string) (db.WebauthnChallenge, error)
}

func (m *mockRepo) GetUser(ctx context.Context, id uuid.UUID) (db.User, error) {
	if m.getUserFn != nil {
		return m.getUserFn(ctx, id)
	}
	return db.User{}, nil
}

func (m *mockRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]db.PasskeyCredential, error) {
	if m.listByUserFn != nil {
		return m.listByUserFn(ctx, userID)
	}
	return nil, nil
}

func (m *mockRepo) Create(ctx context.Context, p db.CreatePasskeyParams) (db.PasskeyCredential, error) {
	if m.createFn != nil {
		return m.createFn(ctx, p)
	}
	return db.PasskeyCredential{}, nil
}

func (m *mockRepo) UpdateAfterLogin(ctx context.Context, p db.UpdatePasskeyAfterLoginParams) error {
	if m.updateAfterLoginFn != nil {
		return m.updateAfterLoginFn(ctx, p)
	}
	return nil
}

func (m *mockRepo) Rename(ctx context.Context, id, userID uuid.UUID, name string) (int64, error) {
	if m.renameFn != nil {
		return m.renameFn(ctx, id, userID, name)
	}
	return 0, nil
}

func (m *mockRepo) Delete(ctx context.Context, id, userID uuid.UUID) (int64, error) {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, id, userID)
	}
	return 0, nil
}

func (m *mockRepo) SaveChallenge(ctx context.Context, p db.CreateChallengeParams) (uuid.UUID, error) {
	if m.saveChallengeFn != nil {
		return m.saveChallengeFn(ctx, p)
	}
	return uuid.Nil, nil
}

func (m *mockRepo) ConsumeChallenge(ctx context.Context, id uuid.UUID, kind string) (db.WebauthnChallenge, error) {
	if m.consumeChallengeFn != nil {
		return m.consumeChallengeFn(ctx, id, kind)
	}
	return db.WebauthnChallenge{}, nil
}

type mockTokens struct{}

func (m *mockTokens) IssueForUser(ctx context.Context, userID uuid.UUID, meta auth.SessionMeta) (auth.Tokens, error) {
	return auth.Tokens{}, nil
}

func TestPasskeys_Rename(t *testing.T) {
	repo := &mockRepo{
		renameFn: func(ctx context.Context, id, userID uuid.UUID, name string) (int64, error) {
			if name == "Found" {
				return 1, nil
			}
			return 0, nil
		},
	}
	svc := passkeys.NewService(nil, repo, &mockTokens{})
	ctx := context.Background()
	uID := uuid.New()
	pID := uuid.New()

	// Empty name
	if err := svc.Rename(ctx, uID, pID, "   "); !errors.Is(err, passkeys.ErrInvalidName) {
		t.Fatalf("expected ErrInvalidName for empty, got %v", err)
	}

	// Too long name (>60 runes)
	tooLong := strings.Repeat("a", 61)
	if err := svc.Rename(ctx, uID, pID, tooLong); !errors.Is(err, passkeys.ErrInvalidName) {
		t.Fatalf("expected ErrInvalidName for too long, got %v", err)
	}

	// Not found
	if err := svc.Rename(ctx, uID, pID, "NotFound"); !errors.Is(err, passkeys.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// Success
	if err := svc.Rename(ctx, uID, pID, "Found"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestPasskeys_Delete(t *testing.T) {
	repo := &mockRepo{
		deleteFn: func(ctx context.Context, id, userID uuid.UUID) (int64, error) {
			if id == uuid.Nil {
				return 0, nil
			}
			return 1, nil
		},
	}
	svc := passkeys.NewService(nil, repo, &mockTokens{})
	ctx := context.Background()
	uID := uuid.New()

	// Not found
	if err := svc.Delete(ctx, uID, uuid.Nil); !errors.Is(err, passkeys.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// Success
	if err := svc.Delete(ctx, uID, uuid.New()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestPasskeys_List(t *testing.T) {
	pID := uuid.New()
	repo := &mockRepo{
		listByUserFn: func(ctx context.Context, userID uuid.UUID) ([]db.PasskeyCredential, error) {
			return []db.PasskeyCredential{{
				ID:        pID,
				UserID:    userID,
				Name:      "My Key",
				CreatedAt: time.Now(),
			}}, nil
		},
	}
	svc := passkeys.NewService(nil, repo, &mockTokens{})
	ctx := context.Background()
	uID := uuid.New()

	keys, err := svc.List(ctx, uID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(keys) != 1 || keys[0].ID != pID {
		t.Fatalf("unexpected keys: %+v", keys)
	}
}
