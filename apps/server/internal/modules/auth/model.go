// Package auth handles social sign-in (Google, Facebook, Apple), one-time login codes,
// and rotating refresh tokens.
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

type ExchangeRequest struct {
	Code string `json:"code"`
}

// NativeRequest is what the mobile app sends after a native SDK sign-in.
// Google/Apple: IDToken (+ Nonce). Apple may also send AuthorizationCode.
// Facebook: AccessToken. Name: Apple only sends it on the very first sign-in.
type NativeRequest struct {
	IDToken           string `json:"idToken,omitempty"`
	Nonce             string `json:"nonce,omitempty"`
	AuthorizationCode string `json:"authorizationCode,omitempty"`
	CodeVerifier      string `json:"codeVerifier,omitempty"`
	RedirectURI       string `json:"redirectUri,omitempty"`
	AccessToken       string `json:"accessToken,omitempty"`
	Name              string `json:"name,omitempty"`
}

// Profile is what we extract from any provider after verifying it.
type Profile struct {
	Provider       string
	ProviderUserID string
	Email          string
	EmailVerified  bool
	Name           string
}

type SessionMeta struct {
	UserAgent string
	DeviceID  uuid.NullUUID
}
