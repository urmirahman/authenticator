package backups

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

const (
	MaxBackupBytes = 5 << 20 // 5 MiB of ciphertext is thousands of accounts
	MaxBackups     = 20
)

var (
	ErrInvalid  = errors.New("invalid backup")
	ErrTooMany  = fmt.Errorf("you can keep at most %d backups; delete an old one first", MaxBackups)
	ErrNotFound = errors.New("backup not found")
)

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

// Validate is a pure function so it's easy to table-test.
func Validate(req *CreateRequest) error {
	req.Name = strings.TrimSpace(req.Name)
	switch {
	case req.Name == "" || len([]rune(req.Name)) > 100:
		return fmt.Errorf("%w: name must be 1-100 characters", ErrInvalid)
	case len(req.Nonce) != 24:
		return fmt.Errorf("%w: nonce must be 24 bytes", ErrInvalid)
	case len(req.Ciphertext) < 16 || len(req.Ciphertext) > MaxBackupBytes:
		return fmt.Errorf("%w: ciphertext must be 16 bytes to 5 MiB", ErrInvalid)
	case req.ItemCount < 0:
		return fmt.Errorf("%w: itemCount must be >= 0", ErrInvalid)
	}
	if len(req.KDF) == 0 {
		req.KDF = json.RawMessage(`{}`)
	}
	var obj map[string]any
	if json.Unmarshal(req.KDF, &obj) != nil {
		return fmt.Errorf("%w: kdf must be a JSON object", ErrInvalid)
	}
	return nil
}

func (s *Service) Create(ctx context.Context, userID uuid.UUID, req CreateRequest) (Meta, error) {
	if err := Validate(&req); err != nil {
		return Meta{}, err
	}
	n, err := s.repo.Count(ctx, userID)
	if err != nil {
		return Meta{}, err
	}
	if n >= MaxBackups {
		return Meta{}, ErrTooMany
	}
	row, err := s.repo.Create(ctx, db.CreateBackupParams{
		UserID: userID, Name: req.Name, Ciphertext: req.Ciphertext, Nonce: req.Nonce,
		Kdf: req.KDF, ItemCount: req.ItemCount, SizeBytes: int32(len(req.Ciphertext)),
	})
	if err != nil {
		return Meta{}, err
	}
	return Meta{row.ID, row.Name, row.Kdf, row.ItemCount, row.SizeBytes, row.CreatedAt}, nil
}

func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]Meta, error) {
	rows, err := s.repo.List(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]Meta, 0, len(rows))
	for _, r := range rows {
		out = append(out, Meta{r.ID, r.Name, r.Kdf, r.ItemCount, r.SizeBytes, r.CreatedAt})
	}
	return out, nil
}

func (s *Service) Get(ctx context.Context, userID, id uuid.UUID) (Backup, error) {
	b, err := s.repo.Get(ctx, id, userID)
	if err != nil {
		return Backup{}, err
	}
	return Backup{Meta{b.ID, b.Name, b.Kdf, b.ItemCount, b.SizeBytes, b.CreatedAt}, b.Ciphertext, b.Nonce}, nil
}

func (s *Service) Delete(ctx context.Context, userID, id uuid.UUID) error {
	n, err := s.repo.Delete(ctx, id, userID)
	if err == nil && n == 0 {
		return ErrNotFound
	}
	return err
}
