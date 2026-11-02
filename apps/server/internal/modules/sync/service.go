package sync

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

const (
	pageSize       = 200
	maxChanges     = 500
	maxCiphertext  = 64 * 1024 // an encrypted TOTP account is tiny; this stops abuse
	xchachaNonceSz = 24
)

var (
	ErrInvalidChange = errors.New("invalid change")
	ErrForeignItem   = errors.New("item id belongs to another vault")
)

// Accepts is the optimistic-concurrency rule: a new item must start at version 1, and an
// edit must be exactly one version ahead of what the server has. Anything else means the
// client edited a stale copy -> conflict, client must pull, merge and retry.
func Accepts(existing *db.VaultItem, incoming int32) bool {
	if existing == nil {
		return incoming == 1
	}
	return incoming == existing.Version+1
}

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

// Pull returns items changed after the cursor (a sync_changes.seq). Empty cursor = full sync.
func (s *Service) Pull(ctx context.Context, userID, vaultID uuid.UUID, cursor string) (PullResponse, error) {
	if err := s.repo.OwnsVault(ctx, vaultID, userID); err != nil {
		return PullResponse{}, err
	}
	since, _ := strconv.ParseInt(cursor, 10, 64)
	rows, err := s.repo.ChangesSince(ctx, vaultID, since, pageSize+1)
	if err != nil {
		return PullResponse{}, err
	}
	hasMore := len(rows) > pageSize
	if hasMore {
		rows = rows[:pageSize]
	}
	resp := PullResponse{Items: make([]Item, 0, len(rows)), Cursor: strconv.FormatInt(since, 10), HasMore: hasMore}
	for _, r := range rows {
		resp.Items = append(resp.Items, Item{ID: r.ID, VaultID: r.VaultID, Kind: r.Kind, Ciphertext: r.Ciphertext, Nonce: r.Nonce, Version: r.Version, Deleted: r.Deleted, UpdatedAt: r.UpdatedAt})
		resp.Cursor = strconv.FormatInt(r.Seq, 10)
	}
	return resp, nil
}

// Push applies a batch of changes with optimistic concurrency.
func (s *Service) Push(ctx context.Context, userID uuid.UUID, req PushRequest) (PushResponse, error) {
	if len(req.Changes) == 0 || len(req.Changes) > maxChanges {
		return PushResponse{}, fmt.Errorf("%w: send 1-%d changes", ErrInvalidChange, maxChanges)
	}
	for i := range req.Changes {
		if err := validate(&req.Changes[i]); err != nil {
			return PushResponse{}, err
		}
	}
	if err := s.repo.OwnsVault(ctx, req.VaultID, userID); err != nil {
		return PushResponse{}, err
	}
	device := uuid.NullUUID{UUID: req.DeviceID, Valid: req.DeviceID != uuid.Nil}
	res, err := s.repo.Apply(ctx, req.VaultID, device, req.Changes)
	if err != nil {
		return PushResponse{}, err
	}
	out := PushResponse{Accepted: res.Accepted, Conflicts: make([]Item, 0, len(res.Conflicts)), Cursor: strconv.FormatInt(res.Cursor, 10)}
	if out.Accepted == nil {
		out.Accepted = []uuid.UUID{}
	}
	for _, c := range res.Conflicts {
		out.Conflicts = append(out.Conflicts, fromDB(c))
	}
	return out, nil
}

// ---- REST-style item endpoints: thin wrappers over the same sync engine ----

func (s *Service) ListItems(ctx context.Context, userID, vaultID uuid.UUID) ([]Item, error) {
	if err := s.repo.OwnsVault(ctx, vaultID, userID); err != nil {
		return nil, err
	}
	rows, err := s.repo.LiveItems(ctx, vaultID)
	if err != nil {
		return nil, err
	}
	out := make([]Item, 0, len(rows))
	for _, r := range rows {
		out = append(out, fromDB(r))
	}
	return out, nil
}

func (s *Service) GetItem(ctx context.Context, userID, vaultID, itemID uuid.UUID) (Item, error) {
	if err := s.repo.OwnsVault(ctx, vaultID, userID); err != nil {
		return Item{}, err
	}
	it, err := s.repo.GetItem(ctx, vaultID, itemID)
	if err != nil {
		return Item{}, err
	}
	return fromDB(it), nil
}

// PutItem creates (version 1) or updates (version n+1) one item. Delete = PutItem with Deleted.
func (s *Service) PutItem(ctx context.Context, userID, vaultID, deviceID uuid.UUID, c Change) (PushResponse, error) {
	return s.Push(ctx, userID, PushRequest{VaultID: vaultID, DeviceID: deviceID, Changes: []Change{c}})
}

func validate(c *Change) error {
	if c.ID == uuid.Nil || c.Version < 1 {
		return fmt.Errorf("%w: id and version >= 1 are required", ErrInvalidChange)
	}
	if c.Kind == "" {
		c.Kind = "account"
	}
	if c.Kind != "account" && c.Kind != "folder" {
		return fmt.Errorf("%w: kind must be account or folder", ErrInvalidChange)
	}
	if c.Deleted { // tombstones carry no secret data
		if c.Ciphertext == nil {
			c.Ciphertext = []byte{}
		}
		if c.Nonce == nil {
			c.Nonce = []byte{}
		}
		return nil
	}
	if len(c.Nonce) != xchachaNonceSz {
		return fmt.Errorf("%w: nonce must be %d bytes", ErrInvalidChange, xchachaNonceSz)
	}
	if len(c.Ciphertext) == 0 || len(c.Ciphertext) > maxCiphertext {
		return fmt.Errorf("%w: ciphertext must be 1-%d bytes", ErrInvalidChange, maxCiphertext)
	}
	return nil
}
