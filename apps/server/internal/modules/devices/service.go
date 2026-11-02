package devices

import (
	"context"
	"errors"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

var ErrInvalidPlatform = errors.New("platform must be web, ios or android")

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]Device, error) {
	rows, err := s.repo.List(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]Device, 0, len(rows))
	for _, d := range rows {
		out = append(out, fromDB(d))
	}
	return out, nil
}

func (s *Service) Register(ctx context.Context, userID uuid.UUID, req RegisterRequest) (Device, error) {
	switch req.Platform {
	case "web", "ios", "android":
	default:
		return Device{}, ErrInvalidPlatform
	}
	d, err := s.repo.Create(ctx, db.CreateDeviceParams{UserID: userID, Name: req.Name, Platform: req.Platform, PublicKey: req.PublicKey})
	if err != nil {
		return Device{}, err
	}
	return fromDB(d), nil
}

func (s *Service) Revoke(ctx context.Context, userID, id uuid.UUID) error {
	return s.repo.Revoke(ctx, id, userID)
}
