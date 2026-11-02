// Package config loads settings from environment variables (12-factor style).
package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type OAuthProvider struct {
	ClientID     string
	ClientSecret string
}

type AppleConfig struct {
	ClientID   string // the Services ID, e.g. dev.urmirahman.authenticator.web
	TeamID     string
	KeyID      string
	PrivateKey string // contents of the .p8 file (PEM)
}

type Config struct {
	Env             string
	Port            int
	DatabaseURL     string
	PublicURL       string   // where this API is reachable, used for OAuth callbacks
	AllowedOrigins  []string // CORS
	JWTSecret       string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration

	Google   OAuthProvider
	Facebook OAuthProvider
	Apple    AppleConfig

	WebAuthnRPID      string // e.g. "localhost" or "auth.example.com"
	WebAuthnRPName    string
	WebAuthnRPOrigins []string
}

func Load() (*Config, error) {
	cfg := &Config{
		Env:             get("APP_ENV", "development"),
		Port:            getInt("PORT", 8080),
		DatabaseURL:     get("DATABASE_URL", "postgres://authenticator:authenticator@localhost:5432/authenticator?sslmode=disable"),
		PublicURL:       get("PUBLIC_URL", "http://localhost:8080"),
		AllowedOrigins:  getList("ALLOWED_ORIGINS", "http://localhost:3001"),
		JWTSecret:       get("JWT_SECRET", ""),
		AccessTokenTTL:  getDuration("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL: getDuration("REFRESH_TOKEN_TTL", 30*24*time.Hour),
		Google:          OAuthProvider{get("GOOGLE_CLIENT_ID", ""), get("GOOGLE_CLIENT_SECRET", "")},
		Facebook:        OAuthProvider{get("FACEBOOK_CLIENT_ID", ""), get("FACEBOOK_CLIENT_SECRET", "")},
		Apple: AppleConfig{
			ClientID:   get("APPLE_CLIENT_ID", ""),
			TeamID:     get("APPLE_TEAM_ID", ""),
			KeyID:      get("APPLE_KEY_ID", ""),
			PrivateKey: get("APPLE_PRIVATE_KEY", ""),
		},
		WebAuthnRPID:      get("WEBAUTHN_RP_ID", "localhost"),
		WebAuthnRPName:    get("WEBAUTHN_RP_NAME", "Authenticator"),
		WebAuthnRPOrigins: getList("WEBAUTHN_RP_ORIGINS", "http://localhost:3001"),
	}
	if cfg.JWTSecret == "" {
		if cfg.Env == "production" {
			return nil, fmt.Errorf("JWT_SECRET is required in production")
		}
		cfg.JWTSecret = "dev-only-insecure-secret-change-me"
	}
	return cfg, nil
}

func get(key, def string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return def
}

func getInt(key string, def int) int {
	if n, err := strconv.Atoi(get(key, "")); err == nil {
		return n
	}
	return def
}

func getDuration(key string, def time.Duration) time.Duration {
	if d, err := time.ParseDuration(get(key, "")); err == nil {
		return d
	}
	return def
}

func getList(key, def string) []string {
	parts := strings.Split(get(key, def), ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
