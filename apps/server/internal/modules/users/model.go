// Package users exposes the signed-in user's profile.
package users

import (
	"time"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

// User is the API shape (camelCase, matches packages/types).
type User struct {
	ID          uuid.UUID `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"displayName"`
	AvatarURL   string    `json:"avatarUrl,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
}

func fromDB(u db.User) User {
	return User{ID: u.ID, Email: u.Email, DisplayName: u.DisplayName, AvatarURL: u.AvatarUrl.String, CreatedAt: u.CreatedAt}
}
