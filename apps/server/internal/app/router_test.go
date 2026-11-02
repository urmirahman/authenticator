package app

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/urmirahman/authenticator/apps/server/internal/config"
)

func TestHealth(t *testing.T) {
	cfg := &config.Config{AllowedOrigins: []string{"http://localhost:3001"}}
	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	r := NewBaseRouter(cfg, log, nil)

	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/v1/health", nil))

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
}
