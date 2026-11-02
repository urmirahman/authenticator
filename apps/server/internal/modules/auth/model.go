// Package auth handles social sign-in (Google, Facebook, Apple) and token refresh.
package auth

import "github.com/google/uuid"

type Tokens struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int    `json:"expiresIn"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type IDTokenRequest struct {
	IDToken string `json:"idToken"`
}

// Profile is what we extract from any provider after a successful OAuth exchange.
type Profile struct {
	Provider       string
	ProviderUserID string
	Email          string
	Name           string
}

type SessionMeta struct {
	UserAgent string
	DeviceID  uuid.NullUUID
}
