package backups

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

func TestValidate(t *testing.T) {
	ok := func() CreateRequest {
		return CreateRequest{Name: " Weekly ", Ciphertext: make([]byte, 64), Nonce: make([]byte, 24), KDF: json.RawMessage(`{"algorithm":"argon2id"}`)}
	}
	tests := []struct {
		name   string
		mutate func(*CreateRequest)
		ok     bool
	}{
		{"valid", func(*CreateRequest) {}, true},
		{"empty kdf becomes {}", func(r *CreateRequest) { r.KDF = nil }, true},
		{"no name", func(r *CreateRequest) { r.Name = "  " }, false},
		{"short nonce", func(r *CreateRequest) { r.Nonce = make([]byte, 12) }, false},
		{"tiny ciphertext", func(r *CreateRequest) { r.Ciphertext = []byte{1} }, false},
		{"huge ciphertext", func(r *CreateRequest) { r.Ciphertext = make([]byte, MaxBackupBytes+1) }, false},
		{"kdf not an object", func(r *CreateRequest) { r.KDF = json.RawMessage(`"x"`) }, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := ok()
			tt.mutate(&r)
			err := Validate(&r)
			if (err == nil) != tt.ok {
				t.Fatalf("err = %v, want ok=%v", err, tt.ok)
			}
			if tt.ok && r.Name != "Weekly" {
				t.Fatalf("name not trimmed: %q", r.Name)
			}
		})
	}
}

type fakeRepo struct{ count int64 }

func (f *fakeRepo) Count(context.Context, uuid.UUID) (int64, error) { return f.count, nil }
func (f *fakeRepo) Create(_ context.Context, p db.CreateBackupParams) (db.CreateBackupRow, error) {
	return db.CreateBackupRow{ID: uuid.New(), Name: p.Name, SizeBytes: p.SizeBytes}, nil
}
func (f *fakeRepo) List(context.Context, uuid.UUID) ([]db.ListBackupsRow, error) { return nil, nil }
func (f *fakeRepo) Get(context.Context, uuid.UUID, uuid.UUID) (db.Backup, error) {
	return db.Backup{}, nil
}
func (f *fakeRepo) Delete(context.Context, uuid.UUID, uuid.UUID) (int64, error) { return 0, nil }

func TestCreateLimitAndDelete(t *testing.T) {
	req := CreateRequest{Name: "b", Ciphertext: make([]byte, 32), Nonce: make([]byte, 24)}
	if _, err := NewService(&fakeRepo{count: MaxBackups}).Create(context.Background(), uuid.New(), req); !errors.Is(err, ErrTooMany) {
		t.Fatalf("want ErrTooMany, got %v", err)
	}
	m, err := NewService(&fakeRepo{}).Create(context.Background(), uuid.New(), req)
	if err != nil || m.SizeBytes != 32 {
		t.Fatalf("create: %v %+v", err, m)
	}
	if err := NewService(&fakeRepo{}).Delete(context.Background(), uuid.New(), uuid.New()); !errors.Is(err, ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}
