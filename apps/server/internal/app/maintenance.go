package app

import (
	"context"
	"crypto/subtle"
	"log/slog"
	"net/http"
	"time"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

// cronAuthorized checks "Authorization: Bearer <secret>" in constant time.
func cronAuthorized(r *http.Request, secret string) bool {
	if secret == "" {
		return false
	}
	want := "Bearer " + secret
	got := r.Header.Get("Authorization")
	return subtle.ConstantTimeCompare([]byte(got), []byte(want)) == 1
}

// cleanupHandler serves GET /v1/internal/cleanup for Vercel Cron (or a manual curl).
func cleanupHandler(q *db.Queries, secret string, log *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !cronAuthorized(r, secret) {
			httpx.Error(w, http.StatusUnauthorized, "unauthorized", "missing or wrong cron secret")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
		defer cancel()

		deleted := map[string]int64{}

		oauthRows, err := q.CleanupOAuthStates(ctx)
		if err != nil {
			log.Error("cleanup failed", "table", "oauthStates", "err", err)
			httpx.Error(w, http.StatusInternalServerError, "cleanup_failed", "oauthStates")
			return
		}
		deleted["oauthStates"] = oauthRows

		loginCodeRows, err := q.CleanupLoginCodes(ctx)
		if err != nil {
			log.Error("cleanup failed", "table", "loginCodes", "err", err)
			httpx.Error(w, http.StatusInternalServerError, "cleanup_failed", "loginCodes")
			return
		}
		deleted["loginCodes"] = loginCodeRows

		challengeRows, err := q.CleanupWebAuthnChallenges(ctx)
		if err != nil {
			log.Error("cleanup failed", "table", "webauthnChallenges", "err", err)
			httpx.Error(w, http.StatusInternalServerError, "cleanup_failed", "webauthnChallenges")
			return
		}
		deleted["webauthnChallenges"] = challengeRows

		sessionRows, err := q.CleanupSessions(ctx)
		if err != nil {
			log.Error("cleanup failed", "table", "sessions", "err", err)
			httpx.Error(w, http.StatusInternalServerError, "cleanup_failed", "sessions")
			return
		}
		deleted["sessions"] = sessionRows

		log.Info("cleanup done", "deleted", deleted)
		httpx.JSON(w, http.StatusOK, map[string]any{"status": "ok", "deleted": deleted})
	}
}
