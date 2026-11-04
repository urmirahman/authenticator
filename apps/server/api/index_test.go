package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

// Calls the exact function Vercel calls. Needs DATABASE_URL (local docker Postgres by default);
// skipped automatically when the database isn't reachable.
func TestHandlerHealth(t *testing.T) {
	rec := httptest.NewRecorder()
	Handler(rec, httptest.NewRequest(http.MethodGet, "/v1/health", nil))
	if rec.Code == http.StatusServiceUnavailable {
		t.Skip("database not reachable; start it with `pnpm db:up`")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
}
