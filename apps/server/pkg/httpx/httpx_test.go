package httpx_test

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

func TestJSON(t *testing.T) {
	rec := httptest.NewRecorder()
	httpx.JSON(rec, http.StatusOK, map[string]string{"foo": "bar"})

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Fatalf("expected application/json, got %s", ct)
	}
}

func TestError(t *testing.T) {
	rec := httptest.NewRecorder()
	httpx.Error(rec, http.StatusNotFound, "not_found", "item missing")

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rec.Code)
	}
	var body struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to parse json: %v", err)
	}
	if body.Error.Code != "not_found" || body.Error.Message != "item missing" {
		t.Fatalf("unexpected error body: %+v", body)
	}
}

func TestWriteError(t *testing.T) {
	tests := []struct {
		err          error
		fallbackCode string
		wantStatus   int
		wantCode     string
	}{
		{httpx.ErrNotFound, "internal", http.StatusNotFound, "not_found"},
		{httpx.ErrUnauthorized, "internal", http.StatusUnauthorized, "unauthorized"},
		{httpx.ErrForbidden, "internal", http.StatusForbidden, "forbidden"},
		{httpx.ErrConflict, "internal", http.StatusConflict, "conflict"},
		{httpx.ErrBadRequest, "internal", http.StatusBadRequest, "bad_request"},
		{errors.New("other error"), "internal", http.StatusInternalServerError, "internal"},
	}

	for _, tt := range tests {
		rec := httptest.NewRecorder()
		httpx.WriteError(rec, tt.err, http.StatusInternalServerError, tt.fallbackCode, "")
		if rec.Code != tt.wantStatus {
			t.Errorf("for %v: expected status %d, got %d", tt.err, tt.wantStatus, rec.Code)
		}
	}
}
