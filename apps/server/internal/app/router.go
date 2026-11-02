// Package app is the composition root: it builds every dependency and wires the routes.
package app

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/urmirahman/authenticator/apps/server/internal/config"
	"github.com/urmirahman/authenticator/apps/server/internal/db"
	"github.com/urmirahman/authenticator/apps/server/internal/middleware"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/auth"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/dev"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/devices"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/passkeys"
	syncmod "github.com/urmirahman/authenticator/apps/server/internal/modules/sync"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/users"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/vault"
	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
	"github.com/urmirahman/authenticator/apps/server/pkg/token"
)

// Pinger lets /health check the DB without the router knowing about pgx.
type Pinger interface {
	Ping(ctx context.Context) error
}

// NewBaseRouter has middleware + /health only. Split out so tests can run without a database.
func NewBaseRouter(cfg *config.Config, log *slog.Logger, db Pinger) chi.Router {
	r := chi.NewRouter()
	r.Use(chimw.RequestID, chimw.RealIP, middleware.Logger(log), chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Get("/v1/health", func(w http.ResponseWriter, r *http.Request) {
		status := "ok"
		if db != nil {
			ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
			defer cancel()
			if err := db.Ping(ctx); err != nil {
				httpx.JSON(w, http.StatusServiceUnavailable, map[string]string{"status": "degraded", "db": "down"})
				return
			}
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"status": status})
	})
	return r
}

// NewRouter wires every module: repository -> service -> handler -> routes.
func NewRouter(ctx context.Context, cfg *config.Config, log *slog.Logger, pool *pgxpool.Pool) (http.Handler, error) {
	q := db.New(pool)
	issuer := token.NewIssuer(cfg.JWTSecret, cfg.AccessTokenTTL)
	requireAuth := middleware.RequireAuth(issuer)

	wa, err := passkeys.NewWebAuthn(cfg.WebAuthnRPID, cfg.WebAuthnRPName, cfg.WebAuthnRPOrigins)
	if err != nil {
		return nil, err
	}

	authSvc := auth.NewService(auth.NewRepository(pool), issuer, auth.NewProviders(ctx, cfg), cfg.AllowedRedirects, cfg.RefreshTokenTTL)
	authH := auth.NewHandler(authSvc)
	passkeyH := passkeys.NewHandler(passkeys.NewService(wa, passkeys.NewRepository(q)))
	usersH := users.NewHandler(users.NewService(users.NewRepository(q)))
	devicesH := devices.NewHandler(devices.NewService(devices.NewRepository(pool)))
	vaultH := vault.NewHandler(vault.NewService(vault.NewRepository(q)))
	syncH := syncmod.NewHandler(syncmod.NewService(syncmod.NewRepository(q)))

	r := NewBaseRouter(cfg, log, pool)
	r.Route("/v1", func(r chi.Router) {
		r.Route("/auth", authH.Routes)
		if cfg.DevAuth {
			log.Warn("DEV_AUTH is on: POST /v1/dev/token mints tokens without sign-in")
			r.Route("/dev", dev.NewHandler(q, authSvc).Routes)
		}
		r.Route("/passkeys", func(r chi.Router) { passkeyH.Routes(r, requireAuth) })
		r.Group(func(r chi.Router) {
			r.Use(requireAuth)
			r.Route("/users", usersH.Routes)
			r.Route("/devices", devicesH.Routes)
			r.Route("/vaults", vaultH.Routes)
			r.Route("/sync", syncH.Routes)
		})
	})
	return r, nil
}
