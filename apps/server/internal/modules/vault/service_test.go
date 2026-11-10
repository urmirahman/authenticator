package vault_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/vault"
)

type mockRepo struct {
	listFn      func(ctx context.Context, userID uuid.UUID) ([]db.Vault, error)
	createFn    func(ctx context.Context, p db.CreateVaultParams) (db.Vault, error)
	getFn       func(ctx context.Context, id, userID uuid.UUID) (db.Vault, error)
	updateKeyFn func(ctx context.Context, p db.UpdateVaultKeyParams) (db.Vault, error)
}

func (m *mockRepo) List(ctx context.Context, userID uuid.UUID) ([]db.Vault, error) {
	if m.listFn != nil {
		return m.listFn(ctx, userID)
	}
	return nil, nil
}

func (m *mockRepo) Create(ctx context.Context, p db.CreateVaultParams) (db.Vault, error) {
	if m.createFn != nil {
		return m.createFn(ctx, p)
	}
	return db.Vault{}, nil
}

func (m *mockRepo) Get(ctx context.Context, id, userID uuid.UUID) (db.Vault, error) {
	if m.getFn != nil {
		return m.getFn(ctx, id, userID)
	}
	return db.Vault{}, nil
}

func (m *mockRepo) UpdateKey(ctx context.Context, p db.UpdateVaultKeyParams) (db.Vault, error) {
	if m.updateKeyFn != nil {
		return m.updateKeyFn(ctx, p)
	}
	return db.Vault{}, nil
}

func validKDF() vault.KDF {
	return vault.KDF{
		Algorithm:   "argon2id",
		Salt:        make([]byte, 16),
		MemoryKiB:   64 * 1024,
		Iterations:  3,
		Parallelism: 1,
	}
}

func TestService_Create_Validations(t *testing.T) {
	svc := vault.NewService(&mockRepo{})
	ctx := context.Background()
	uID := uuid.New()

	// Weak KDF algorithm
	badKDF := validKDF()
	badKDF.Algorithm = "pbkdf2"
	_, err := svc.Create(ctx, uID, vault.CreateRequest{
		KDF:        badKDF,
		WrappedKey: make([]byte, 80),
	})
	if !errors.Is(err, vault.ErrWeakKDF) {
		t.Fatalf("expected ErrWeakKDF, got %v", err)
	}

	// Short salt
	shortSaltKDF := validKDF()
	shortSaltKDF.Salt = make([]byte, 8)
	_, err = svc.Create(ctx, uID, vault.CreateRequest{
		KDF:        shortSaltKDF,
		WrappedKey: make([]byte, 80),
	})
	if !errors.Is(err, vault.ErrWeakKDF) {
		t.Fatalf("expected ErrWeakKDF, got %v", err)
	}

	// Bad wrapped key size
	_, err = svc.Create(ctx, uID, vault.CreateRequest{
		KDF:        validKDF(),
		WrappedKey: make([]byte, 10), // less than 72 bytes
	})
	if !errors.Is(err, vault.ErrBadWrappedKey) {
		t.Fatalf("expected ErrBadWrappedKey, got %v", err)
	}
}

func TestService_Create_Success(t *testing.T) {
	repo := &mockRepo{
		createFn: func(ctx context.Context, p db.CreateVaultParams) (db.Vault, error) {
			return db.Vault{
				ID:        uuid.New(),
				UserID:    p.UserID,
				Name:      p.Name,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			}, nil
		},
	}
	svc := vault.NewService(repo)
	ctx := context.Background()
	uID := uuid.New()

	v, err := svc.Create(ctx, uID, vault.CreateRequest{
		Name:       "Test Vault",
		KDF:        validKDF(),
		WrappedKey: make([]byte, 80),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if v.Name != "Test Vault" {
		t.Fatalf("expected name Test Vault, got %s", v.Name)
	}
}

func TestService_List(t *testing.T) {
	vID := uuid.New()
	repo := &mockRepo{
		listFn: func(ctx context.Context, userID uuid.UUID) ([]db.Vault, error) {
			return []db.Vault{{ID: vID, Name: "Primary"}}, nil
		},
	}
	svc := vault.NewService(repo)
	ctx := context.Background()
	uID := uuid.New()

	vs, err := svc.List(ctx, uID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(vs) != 1 || vs[0].ID != vID {
		t.Fatalf("unexpected vaults: %+v", vs)
	}
}
