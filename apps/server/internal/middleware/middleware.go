// Package middleware holds cross-cutting HTTP concerns: logging and auth.
package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"
	"time"

	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
	"github.com/urmirahman/authenticator/apps/server/pkg/token"
)

type ctxKey int

const userIDKey ctxKey = iota

// Logger logs one line per request with status and latency.
func Logger(log *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)
			start := time.Now()
			next.ServeHTTP(ww, r)
			log.Info("request",
				"method", r.Method, "path", r.URL.Path, "status", ww.Status(),
				"duration", time.Since(start), "request_id", chimw.GetReqID(r.Context()))
		})
	}
}

// RequireAuth checks the Bearer access token and stores the user id in the context.
func RequireAuth(iss *token.Issuer) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
			if !ok {
				httpx.Error(w, http.StatusUnauthorized, "unauthorized", "missing bearer token")
				return
			}
			uid, err := iss.Verify(raw)
			if err != nil {
				httpx.Error(w, http.StatusUnauthorized, "unauthorized", "invalid token")
				return
			}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userIDKey, uid)))
		})
	}
}

// UserID returns the authenticated user's id (only valid behind RequireAuth).
func UserID(ctx context.Context) uuid.UUID {
	id, _ := ctx.Value(userIDKey).(uuid.UUID)
	return id
}
