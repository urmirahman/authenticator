package users

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
)

var ErrInvalidName = errors.New("displayName must be 1-80 characters")

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) Me(ctx context.Context, id uuid.UUID) (User, error) {
	u, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return User{}, err
	}
	return fromDB(u), nil
}

func (s *Service) Update(ctx context.Context, id uuid.UUID, req UpdateRequest) (User, error) {
	name := strings.TrimSpace(req.DisplayName)
	if name == "" || len([]rune(name)) > 80 {
		return User{}, ErrInvalidName
	}
	u, err := s.repo.UpdateProfile(ctx, id, name)
	if err != nil {
		return User{}, err
	}
	return fromDB(u), nil
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}
