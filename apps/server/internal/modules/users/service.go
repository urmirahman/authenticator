package users

import (
	"context"

	"github.com/google/uuid"
)

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }

func (s *Service) Me(ctx context.Context, id uuid.UUID) (User, error) {
	u, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return User{}, err
	}
	return fromDB(u), nil
}
