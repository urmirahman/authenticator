// Package devices tracks each phone/browser that holds a copy of the vault.
package devices

import (
	"time"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
)

type Device struct {
	ID         uuid.UUID `json:"id"`
	Name       string    `json:"name"`
	Platform   string    `json:"platform"`
	PublicKey  string    `json:"publicKey"`
	LastSeenAt time.Time `json:"lastSeenAt"`
}

type RegisterRequest struct {
	Name      string `json:"name"`
	Platform  string `json:"platform"`
	PublicKey string `json:"publicKey"`
}

func fromDB(d db.Device) Device {
	return Device{ID: d.ID, Name: d.Name, Platform: d.Platform, PublicKey: d.PublicKey, LastSeenAt: d.LastSeenAt}
}
