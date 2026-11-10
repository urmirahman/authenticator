// Package database opens the Postgres connection pool (pgx v5).
package database

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Options tune the pool. The zero value keeps the long-running server's defaults.
type Options struct {
	// MaxConns caps open connections. 0 = 10 (local server). Serverless uses a small number
	// (e.g. 4) because every warm function instance has its own pool.
	MaxConns int32
	// Pooler: true when DATABASE_URL points at a PgBouncer-style pooler in transaction mode
	// (Neon's "-pooler" host). Named prepared statements can't be shared across transactions
	// there, so we switch pgx to QueryExecModeExec (unnamed statements, still typed).
	Pooler bool
}

// Connect keeps the original signature for cmd/api and tests.
func Connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	return ConnectWith(ctx, url, Options{})
}

func ConnectWith(ctx context.Context, dsn string, o Options) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse database url: %w", err)
	}
	cfg.MaxConns = 10
	if o.MaxConns > 0 {
		cfg.MaxConns = o.MaxConns
	}
	cfg.MaxConnIdleTime = 5 * time.Minute
	if o.Pooler || IsPoolerURL(dsn) {
		cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeExec
	}

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return pool, nil
}

// IsPoolerURL spots Neon's pooled host (ep-xxx-pooler.region.aws.neon.tech).
func IsPoolerURL(dsn string) bool {
	u, err := url.Parse(dsn)
	if err != nil {
		return false
	}
	return strings.Contains(u.Hostname(), "-pooler")
}

// Transactor starts a database transaction.
type Transactor interface {
	Begin(ctx context.Context) (pgx.Tx, error)
}

// InTx executes fn inside a transaction, automatically rolling back on error or committing on success.
func InTx(ctx context.Context, txBeginner Transactor, fn func(tx pgx.Tx) error) error {
	tx, err := txBeginner.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
