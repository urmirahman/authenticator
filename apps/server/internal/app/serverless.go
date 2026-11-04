package app

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/urmirahman/authenticator/apps/server/internal/config"
	"github.com/urmirahman/authenticator/apps/server/internal/platform/database"
	"github.com/urmirahman/authenticator/apps/server/internal/platform/logger"
	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

// serverlessMaxConns: each warm function instance keeps its own small pool.
const serverlessMaxConns = 4

var (
	lazyMu      sync.Mutex
	lazyHandler http.Handler
	lazyPool    *pgxpool.Pool
)

// buildFn is swapped in tests so they don't need a database.
var buildFn = buildServerless

// ServerlessHandler returns the full API router, built once per cold start (config, DB pool,
// routes). If setup fails (e.g. the DB is waking up) the request gets 503 and the next request
// retries, instead of the instance staying broken forever (which sync.Once would do).
func ServerlessHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h, err := getHandler()
		if err != nil {
			slog.Error("serverless init failed", "err", err)
			httpx.Error(w, http.StatusServiceUnavailable, "starting", "the server is starting, try again in a moment")
			return
		}
		h.ServeHTTP(w, r)
	})
}

func getHandler() (http.Handler, error) {
	lazyMu.Lock()
	defer lazyMu.Unlock()
	if lazyHandler != nil {
		return lazyHandler, nil
	}
	h, pool, err := buildFn()
	if err != nil {
		return nil, err
	}
	lazyHandler, lazyPool = h, pool
	return h, nil
}

func buildServerless() (http.Handler, *pgxpool.Pool, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, nil, err
	}
	log := logger.New(cfg.Env)
	maxConns := int32(serverlessMaxConns)
	if cfg.DBMaxConns > 0 {
		maxConns = int32(cfg.DBMaxConns)
	}
	// Background context: the pool outlives the first request.
	ctx := context.Background()
	pool, err := database.ConnectWith(ctx, cfg.DatabaseURL, database.Options{MaxConns: maxConns, Pooler: cfg.DBPooler})
	if err != nil {
		return nil, nil, err
	}
	h, err := NewRouter(ctx, cfg, log, pool)
	if err != nil {
		pool.Close()
		return nil, nil, err
	}
	if os.Getenv("VERCEL") != "" {
		log.Info("serverless handler ready", "maxConns", maxConns)
	}
	return h, pool, nil
}
