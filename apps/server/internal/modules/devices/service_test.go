package devices_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/devices"
)

type mockRepo struct {
	listFn   func(ctx context.Context, userID uuid.UUID) ([]db.Device, error)
	createFn func(ctx context.Context, p db.CreateDeviceParams, sessionFamily uuid.UUID) (db.Device, error)
	revokeFn func(ctx context.Context, id, userID uuid.UUID) (bool, error)
}

func (m *mockRepo) List(ctx context.Context, userID uuid.UUID) ([]db.Device, error) {
	if m.listFn != nil {
		return m.listFn(ctx, userID)
	}
	return nil, nil
}

func (m *mockRepo) Create(ctx context.Context, p db.CreateDeviceParams, sessionFamily uuid.UUID) (db.Device, error) {
	if m.createFn != nil {
		return m.createFn(ctx, p, sessionFamily)
	}
	return db.Device{}, nil
}

func (m *mockRepo) Revoke(ctx context.Context, id, userID uuid.UUID) (bool, error) {
	if m.revokeFn != nil {
		return m.revokeFn(ctx, id, userID)
	}
	return false, nil
}

func TestService_Register_Validation(t *testing.T) {
	svc := devices.NewService(&mockRepo{})
	ctx := context.Background()
	uID := uuid.New()
	fID := uuid.New()

	// Invalid platform
	_, err := svc.Register(ctx, uID, fID, devices.RegisterRequest{
		Name:     "My Laptop",
		Platform: "windows",
	})
	if !errors.Is(err, devices.ErrInvalidPlatform) {
		t.Fatalf("expected ErrInvalidPlatform, got %v", err)
	}

	// Empty name
	_, err = svc.Register(ctx, uID, fID, devices.RegisterRequest{
		Name:     "",
		Platform: "web",
	})
	if !errors.Is(err, devices.ErrInvalidName) {
		t.Fatalf("expected ErrInvalidName, got %v", err)
	}
}

func TestService_Register_Success(t *testing.T) {
	repo := &mockRepo{
		createFn: func(ctx context.Context, p db.CreateDeviceParams, sessionFamily uuid.UUID) (db.Device, error) {
			return db.Device{
				ID:        uuid.New(),
				UserID:    p.UserID,
				Name:      p.Name,
				Platform:  p.Platform,
				CreatedAt: time.Now(),
				LastSeenAt: time.Now(),
			}, nil
		},
	}
	svc := devices.NewService(repo)
	ctx := context.Background()
	uID := uuid.New()
	fID := uuid.New()

	d, err := svc.Register(ctx, uID, fID, devices.RegisterRequest{
		Name:     "Pixel 8",
		Platform: "android",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if d.Name != "Pixel 8" || d.Platform != "android" {
		t.Fatalf("unexpected device: %+v", d)
	}
}

func TestService_Revoke(t *testing.T) {
	ctx := context.Background()
	uID := uuid.New()
	dID := uuid.New()

	// Not found
	svcNotFound := devices.NewService(&mockRepo{
		revokeFn: func(ctx context.Context, id, userID uuid.UUID) (bool, error) {
			return false, nil
		},
	})
	if err := svcNotFound.Revoke(ctx, uID, dID); !errors.Is(err, devices.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}

	// Success
	svcSuccess := devices.NewService(&mockRepo{
		revokeFn: func(ctx context.Context, id, userID uuid.UUID) (bool, error) {
			return true, nil
		},
	})
	if err := svcSuccess.Revoke(ctx, uID, dID); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
