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
	"github.com/urmirahman/authenticator/apps/server/internal/modules/audit"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/auth"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/backups"
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

// NewBaseRouter has global middleware + /health only. Split out so tests can run without a database.
func NewBaseRouter(cfg *config.Config, log *slog.Logger, db Pinger) chi.Router {
	r := chi.NewRouter()
	r.Use(
		chimw.RequestID, middleware.RequestIDHeader, chimw.RealIP,
		middleware.Logger(log), chimw.Recoverer,
		middleware.SecurityHeaders(cfg.Env == "production"),
	)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Device-Id"},
		ExposedHeaders:   []string{"X-Request-Id"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Get("/v1/health", func(w http.ResponseWriter, r *http.Request) {
		if db != nil {
			ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
			defer cancel()
			if err := db.Ping(ctx); err != nil {
				httpx.JSON(w, http.StatusServiceUnavailable, map[string]string{"status": "degraded", "db": "down"})
				return
			}
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	return r
}

// NewRouter wires every module: repository -> service -> handler -> routes.
func NewRouter(ctx context.Context, cfg *config.Config, log *slog.Logger, pool *pgxpool.Pool) (http.Handler, error) {
	q := db.New(pool)
	issuer := token.NewIssuer(cfg.JWTSecret, cfg.AccessTokenTTL)
	requireAuth := middleware.RequireAuth(issuer)
	authLimit := middleware.RateLimit(30, time.Minute) // per IP, on sign-in endpoints

	wa, err := passkeys.NewWebAuthn(cfg.WebAuthnRPID, cfg.WebAuthnRPName, cfg.WebAuthnRPOrigins)
	if err != nil {
		return nil, err
	}

	auditSvc := audit.NewService(q, log)
	authSvc := auth.NewService(auth.NewRepository(pool, pool), issuer, auth.NewProviders(ctx, cfg), cfg.AllowedRedirects, cfg.RefreshTokenTTL)
	authH := auth.NewHandler(authSvc, auditSvc)
	passkeyH := passkeys.NewHandler(passkeys.NewService(wa, passkeys.NewRepository(q), authSvc), auditSvc)
	usersH := users.NewHandler(users.NewService(users.NewRepository(q)), auditSvc)
	backupsH := backups.NewHandler(backups.NewService(backups.NewRepository(q)), auditSvc)
	devicesH := devices.NewHandler(devices.NewService(devices.NewRepository(pool, pool)), auditSvc)
	vaultH := vault.NewHandler(vault.NewService(vault.NewRepository(q)), auditSvc)
	syncH := syncmod.NewHandler(syncmod.NewService(syncmod.NewRepository(pool, pool)))

	r := NewBaseRouter(cfg, log, pool)
	r.Route("/v1", func(r chi.Router) {
		if cfg.CronSecret != "" {
			r.Get("/internal/cleanup", cleanupHandler(q, cfg.CronSecret, log))
		}
		r.With(authLimit).Route("/auth", authH.Routes)
		r.Route("/passkeys", func(r chi.Router) { passkeyH.Routes(r, requireAuth, authLimit) })
		if cfg.DevAuth {
			log.Warn("DEV_AUTH is on: POST /v1/dev/token mints tokens without sign-in")
			r.With(authLimit).Route("/dev", dev.NewHandler(q, authSvc).Routes)
		}
		r.Group(func(r chi.Router) {
			r.Use(requireAuth)
			r.Route("/users", usersH.Routes)
			r.Route("/devices", devicesH.Routes)
			r.Route("/vaults", func(r chi.Router) { vaultH.Routes(r, syncH.ItemRoutes) })
			r.Route("/sync", syncH.Routes)
			r.Route("/activity", auditSvc.Routes)
			r.Route("/backups", backupsH.Routes)
		})
	})
	return r, nil
}
