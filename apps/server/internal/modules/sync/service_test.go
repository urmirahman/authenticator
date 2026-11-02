package sync

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

func TestAccepts(t *testing.T) {
	existing := &db.VaultItem{Version: 3}
	tests := []struct {
		name     string
		existing *db.VaultItem
		incoming int32
		want     bool
	}{
		{"new item at v1", nil, 1, true},
		{"new item at v2", nil, 2, false},
		{"next version", existing, 4, true},
		{"same version (stale)", existing, 3, false},
		{"skipped version", existing, 5, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := Accepts(tt.existing, tt.incoming); got != tt.want {
				t.Fatalf("got %v want %v", got, tt.want)
			}
		})
	}
}

// fakeRepo applies changes to an in-memory map using the same Accepts rule.
type fakeRepo struct {
	owner uuid.UUID
	items map[uuid.UUID]db.VaultItem
	seq   int64
}

func (f *fakeRepo) OwnsVault(_ context.Context, _, user uuid.UUID) error {
	if user != f.owner {
		return errNotOwner
	}
	return nil
}
func (f *fakeRepo) ChangesSince(context.Context, uuid.UUID, int64, int32) ([]db.ListChangesSinceRow, error) {
	return nil, nil
}
func (f *fakeRepo) LiveItems(context.Context, uuid.UUID) ([]db.VaultItem, error) { return nil, nil }
func (f *fakeRepo) GetItem(context.Context, uuid.UUID, uuid.UUID) (db.VaultItem, error) {
	return db.VaultItem{}, nil
}
func (f *fakeRepo) Apply(_ context.Context, vault uuid.UUID, _ uuid.NullUUID, cs []Change) (ApplyResult, error) {
	var res ApplyResult
	for _, c := range cs {
		cur, ok := f.items[c.ID]
		var ex *db.VaultItem
		if ok {
			ex = &cur
		}
		if !Accepts(ex, c.Version) {
			if ex != nil {
				res.Conflicts = append(res.Conflicts, cur)
			}
			continue
		}
		f.items[c.ID] = db.VaultItem{ID: c.ID, VaultID: vault, Version: c.Version, Deleted: c.Deleted}
		f.seq++
		res.Accepted = append(res.Accepted, c.ID)
	}
	res.Cursor = f.seq
	return res, nil
}

var errNotOwner = errors.New("not owner")

func TestPush(t *testing.T) {
	owner, vault, item := uuid.New(), uuid.New(), uuid.New()
	nonce, ct := make([]byte, 24), []byte("ciphertext")

	tests := []struct {
		name          string
		user          uuid.UUID
		seed          map[uuid.UUID]db.VaultItem
		changes       []Change
		wantErr       error
		wantAccepted  int
		wantConflicts int
	}{
		{"create", owner, nil, []Change{{ID: item, Ciphertext: ct, Nonce: nonce, Version: 1}}, nil, 1, 0},
		{"update", owner, map[uuid.UUID]db.VaultItem{item: {ID: item, Version: 1}},
			[]Change{{ID: item, Ciphertext: ct, Nonce: nonce, Version: 2}}, nil, 1, 0},
		{"stale edit conflicts", owner, map[uuid.UUID]db.VaultItem{item: {ID: item, Version: 2}},
			[]Change{{ID: item, Ciphertext: ct, Nonce: nonce, Version: 2}}, nil, 0, 1},
		{"tombstone", owner, map[uuid.UUID]db.VaultItem{item: {ID: item, Version: 1}},
			[]Change{{ID: item, Version: 2, Deleted: true}}, nil, 1, 0},
		{"bad nonce", owner, nil, []Change{{ID: item, Ciphertext: ct, Nonce: []byte{1}, Version: 1}}, ErrInvalidChange, 0, 0},
		{"bad kind", owner, nil, []Change{{ID: item, Kind: "x", Ciphertext: ct, Nonce: nonce, Version: 1}}, ErrInvalidChange, 0, 0},
		{"empty batch", owner, nil, nil, ErrInvalidChange, 0, 0},
		{"someone else's vault", uuid.New(), nil, []Change{{ID: item, Ciphertext: ct, Nonce: nonce, Version: 1}}, errNotOwner, 0, 0},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &fakeRepo{owner: owner, items: map[uuid.UUID]db.VaultItem{}}
			for k, v := range tt.seed {
				repo.items[k] = v
			}
			resp, err := NewService(repo).Push(context.Background(), tt.user, PushRequest{VaultID: vault, Changes: tt.changes})
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if len(resp.Accepted) != tt.wantAccepted || len(resp.Conflicts) != tt.wantConflicts {
				t.Fatalf("accepted=%d conflicts=%d", len(resp.Accepted), len(resp.Conflicts))
			}
		})
	}
}
