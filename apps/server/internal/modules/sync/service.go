package sync

import (
	"context"
	"strconv"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

const pageSize = 200

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

// Pull returns everything that changed after the client's cursor (a sync_changes.seq).
func (s *Service) Pull(ctx context.Context, userID, vaultID uuid.UUID, cursor string) (PullResponse, error) {
	if _, err := s.repo.OwnsVault(ctx, vaultID, userID); err != nil {
		return PullResponse{}, err
	}
	since, _ := strconv.ParseInt(cursor, 10, 64) // empty cursor => 0 => full sync
	rows, err := s.repo.ChangesSince(ctx, vaultID, since, pageSize+1)
	if err != nil {
		return PullResponse{}, err
	}
	hasMore := len(rows) > pageSize
	if hasMore {
		rows = rows[:pageSize]
	}
	resp := PullResponse{Items: make([]Item, 0, len(rows)), Cursor: cursor, HasMore: hasMore}
	for _, r := range rows {
		resp.Items = append(resp.Items, Item{ID: r.ID, VaultID: r.VaultID, Ciphertext: r.Ciphertext, Nonce: r.Nonce, Version: r.Version, Deleted: r.Deleted, UpdatedAt: r.UpdatedAt})
		resp.Cursor = strconv.FormatInt(r.Seq, 10)
	}
	return resp, nil
}

// Push applies client changes with optimistic concurrency.
// TODO: in one transaction, for each change: UpsertVaultItem (only wins if version is newer),
// AppendChange on success, otherwise return the server copy as a conflict for the client to merge.
func (s *Service) Push(_ context.Context, _ uuid.UUID, _ PushRequest) (PushResponse, error) {
	return PushResponse{}, httpx.ErrNotImplemented
}
