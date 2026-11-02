// Command api starts the HTTP server.
package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/urmirahman/authenticator/apps/server/internal/app"
	"github.com/urmirahman/authenticator/apps/server/internal/config"
	"github.com/urmirahman/authenticator/apps/server/internal/platform/database"
	"github.com/urmirahman/authenticator/apps/server/internal/platform/httpserver"
	"github.com/urmirahman/authenticator/apps/server/internal/platform/logger"
)

func main() {
	// ctx is cancelled on Ctrl+C or SIGTERM -> graceful shutdown.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}
	log := logger.New(cfg.Env)

	pool, err := database.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Error("database connection failed (is `pnpm db:up` running?)", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	handler, err := app.NewRouter(ctx, cfg, log, pool)
	if err != nil {
		log.Error("router setup failed", "err", err)
		os.Exit(1)
	}

	if err := httpserver.New(cfg.Port, handler, log).Run(ctx); err != nil {
		log.Error("server error", "err", err)
		os.Exit(1)
	}
	log.Info("bye")
}
