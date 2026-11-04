package app

import (
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/urmirahman/authenticator/apps/server/internal/config"
)

func resetLazy(t *testing.T, fn func() (http.Handler, *pgxpool.Pool, error)) {
	t.Helper()
	old := buildFn
	buildFn = fn
	lazyHandler, lazyPool = nil, nil
	t.Cleanup(func() { buildFn = old; lazyHandler, lazyPool = nil, nil })
}

func TestServerlessHandlerHealth(t *testing.T) {
	builds := 0
	resetLazy(t, func() (http.Handler, *pgxpool.Pool, error) {
		builds++
		cfg := &config.Config{AllowedOrigins: []string{"https://bloom.example"}}
		return NewBaseRouter(cfg, slog.New(slog.NewTextHandler(io.Discard, nil)), nil), nil, nil
	})
	h := ServerlessHandler()
	for range 3 {
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/health", nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
	}
	if builds != 1 {
		t.Fatalf("router built %d times, want once per cold start", builds)
	}
}

func TestServerlessHandlerRetriesAfterInitError(t *testing.T) {
	fail := true
	resetLazy(t, func() (http.Handler, *pgxpool.Pool, error) {
		if fail {
			return nil, nil, errors.New("db asleep")
		}
		return NewBaseRouter(&config.Config{}, slog.New(slog.NewTextHandler(io.Discard, nil)), nil), nil, nil
	})
	h := ServerlessHandler()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/health", nil))
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rec.Code)
	}
	fail = false
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/health", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("status after retry = %d, want 200", rec.Code)
	}
}

func TestCronAuthorized(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/v1/internal/cleanup", nil)
	if cronAuthorized(r, "s3cret") {
		t.Fatal("no header should be refused")
	}
	r.Header.Set("Authorization", "Bearer wrong")
	if cronAuthorized(r, "s3cret") {
		t.Fatal("wrong secret should be refused")
	}
	r.Header.Set("Authorization", "Bearer s3cret")
	if !cronAuthorized(r, "s3cret") || cronAuthorized(r, "") {
		t.Fatal("right secret accepted; empty secret always refused")
	}
}
