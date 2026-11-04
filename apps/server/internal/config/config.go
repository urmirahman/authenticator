// Package config loads settings from environment variables (12-factor style).
package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"strconv"
	"strings"
	"time"
)

type OAuthProvider struct {
	ClientID     string
	ClientSecret string
	Audiences    []string // extra accepted id_token audiences (iOS/Android client ids)
}

type AppleConfig struct {
	Audiences  []string // extra accepted id_token audiences (e.g. the iOS bundle id)
	ClientID   string   // the Services ID, e.g. dev.urmirahman.authenticator.web
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

	// AllowedRedirects: where we may send the browser after OAuth (prefix match).
	AllowedRedirects []string
	// DevAuth enables POST /v1/dev/token to mint tokens without OAuth. Never in production.
	DevAuth bool

	WebAuthnRPID      string // e.g. "localhost" or "auth.example.com"
	WebAuthnRPName    string
	WebAuthnRPOrigins []string

	// CronSecret protects GET /v1/internal/cleanup (Vercel Cron sends "Authorization: Bearer
	// <CRON_SECRET>"). Empty = the endpoint is not registered.
	CronSecret string
	// DBMaxConns caps the pgx pool. 0 = default (10 for the local server, 4 on serverless).
	DBMaxConns int
	// DBPooler forces pooler-safe query mode; also auto-detected from a "-pooler" host.
	DBPooler bool
}

func Load() (*Config, error) {
	// Local dev: read apps/server/.env if it exists. Real environment variables
	// always win (godotenv never overrides), so production config is unaffected.
	_ = godotenv.Load()

	cfg := &Config{
		Env:              get("APP_ENV", "development"),
		Port:             getInt("PORT", 8787),
		DatabaseURL:      get("DATABASE_URL", "postgres://authenticator:authenticator@localhost:5433/authenticator?sslmode=disable"),
		PublicURL:        get("PUBLIC_URL", "http://localhost:8787"),
		AllowedOrigins:   getList("ALLOWED_ORIGINS", "http://localhost:3001"),
		JWTSecret:        get("JWT_SECRET", ""),
		AccessTokenTTL:   getDuration("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL:  getDuration("REFRESH_TOKEN_TTL", 30*24*time.Hour),
		Google:           OAuthProvider{get("GOOGLE_CLIENT_ID", ""), get("GOOGLE_CLIENT_SECRET", ""), getList("GOOGLE_EXTRA_AUDIENCES", "")},
		Facebook:         OAuthProvider{get("FACEBOOK_CLIENT_ID", ""), get("FACEBOOK_CLIENT_SECRET", ""), nil},
		AllowedRedirects: getList("ALLOWED_REDIRECTS", "http://localhost:3001"),
		DevAuth:          get("DEV_AUTH", "false") == "true",
		Apple: AppleConfig{
			ClientID:   get("APPLE_CLIENT_ID", ""),
			TeamID:     get("APPLE_TEAM_ID", ""),
			KeyID:      get("APPLE_KEY_ID", ""),
			PrivateKey: get("APPLE_PRIVATE_KEY", ""),
			Audiences:  getList("APPLE_EXTRA_AUDIENCES", ""),
		},
		WebAuthnRPID:      get("WEBAUTHN_RP_ID", "localhost"),
		WebAuthnRPName:    get("WEBAUTHN_RP_NAME", "Authenticator"),
		WebAuthnRPOrigins: getList("WEBAUTHN_RP_ORIGINS", "http://localhost:3001"),
		CronSecret:        get("CRON_SECRET", ""),
		DBMaxConns:        getInt("DB_MAX_CONNS", 0),
		DBPooler:          get("DB_POOLER", "false") == "true",
	}
	if cfg.JWTSecret == "" {
		if cfg.Env == "production" {
			return nil, fmt.Errorf("JWT_SECRET is required in production")
		}
		cfg.JWTSecret = "dev-only-insecure-secret-change-me"
	}
	if cfg.DevAuth && cfg.Env == "production" {
		return nil, fmt.Errorf("DEV_AUTH must not be enabled in production")
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
