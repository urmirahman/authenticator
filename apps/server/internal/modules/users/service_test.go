package users

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

// fakeRepo implements Repository in memory.
type fakeRepo struct {
	signedIn time.Time
	deleted  bool
}

func (f *fakeRepo) GetByID(context.Context, uuid.UUID) (db.User, error) { return db.User{}, nil }
func (f *fakeRepo) UpdateProfile(context.Context, uuid.UUID, string) (db.User, error) {
	return db.User{}, nil
}
func (f *fakeRepo) Delete(context.Context, uuid.UUID) error { f.deleted = true; return nil }
func (f *fakeRepo) SignedInAt(context.Context, uuid.UUID, uuid.UUID) (time.Time, error) {
	return f.signedIn, nil
}
func (f *fakeRepo) Queries() *db.Queries { return nil }

func TestDeleteGuards(t *testing.T) {
	now := time.Date(2026, 11, 3, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name     string
		signedIn time.Time
		confirm  string
		want     error
	}{
		{"recent sign-in + phrase", now.Add(-2 * time.Minute), "DELETE", nil},
		{"missing phrase", now.Add(-2 * time.Minute), "", ErrConfirmPhrase},
		{"wrong phrase", now.Add(-2 * time.Minute), "delete", ErrConfirmPhrase},
		{"old sign-in", now.Add(-ReauthWindow - time.Second), "DELETE", ErrReauthRequired},
		{"unknown session", time.Time{}, "DELETE", ErrReauthRequired},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepo{signedIn: tt.signedIn}
			s := NewService(repo)
			s.now = func() time.Time { return now }
			err := s.Delete(context.Background(), uuid.New(), uuid.New(), tt.confirm)
			if !errors.Is(err, tt.want) {
				t.Fatalf("err = %v, want %v", err, tt.want)
			}
			if repo.deleted != (tt.want == nil) {
				t.Fatalf("deleted = %v", repo.deleted)
			}
		})
	}
}
