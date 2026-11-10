package middleware_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/middleware"
	"github.com/urmirahman/authenticator/apps/server/pkg/token"
)

func TestSecurityHeaders(t *testing.T) {
	handler := middleware.SecurityHeaders(true)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	handler.ServeHTTP(rec, req)

	headers := map[string]string{
		"X-Content-Type-Options":    "nosniff",
		"X-Frame-Options":           "DENY",
		"Referrer-Policy":           "no-referrer",
		"Cache-Control":             "no-store",
		"Strict-Transport-Security": "max-age=63072000; includeSubDomains",
	}

	for k, want := range headers {
		if got := rec.Header().Get(k); got != want {
			t.Errorf("header %s: want %q, got %q", k, want, got)
		}
	}
}

func TestRequireAuth(t *testing.T) {
	secret := "test-secret-at-least-32-bytes-long!!"
	issuer := token.NewIssuer(secret, 15*time.Minute)

	handler := middleware.RequireAuth(issuer)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uID := middleware.UserID(r.Context())
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(uID.String()))
	}))

	// Missing header
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for missing header, got %d", rec.Code)
	}

	// Invalid token
	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer invalid.token.payload")
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for invalid token, got %d", rec.Code)
	}

	// Valid token
	userID := uuid.New()
	sessionID := uuid.New()
	tok, err := issuer.Access(token.Subject{UserID: userID, SessionID: sessionID}, time.Now())
	if err != nil {
		t.Fatalf("failed to issue token: %v", err)
	}

	rec = httptest.NewRecorder()
	req = httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+tok)
	handler.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for valid token, got %d", rec.Code)
	}
	if rec.Body.String() != userID.String() {
		t.Fatalf("expected body %s, got %s", userID.String(), rec.Body.String())
	}
}

func TestContextHelpers(t *testing.T) {
	uID := uuid.New()
	sID := uuid.New()
	subj := token.Subject{UserID: uID, SessionID: sID}

	ctx := middleware.WithSubject(context.Background(), subj)
	if got := middleware.UserID(ctx); got != uID {
		t.Fatalf("expected userID %s, got %s", uID, got)
	}
	if got := middleware.SessionID(ctx); got != sID {
		t.Fatalf("expected sessionID %s, got %s", sID, got)
	}
}
