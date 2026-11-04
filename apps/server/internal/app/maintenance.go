package app

import (
	"context"
	"crypto/subtle"
	"log/slog"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

// cleanupStatements remove rows that are only useful for a short time. Each is idempotent and
// cheap (expires_at filters), so running it daily (Vercel Cron on Hobby) or by hand is safe.
var cleanupStatements = map[string]string{
	"oauthStates":        `DELETE FROM oauth_states WHERE expires_at < now()`,
	"loginCodes":         `DELETE FROM login_codes WHERE expires_at < now()`,
	"webauthnChallenges": `DELETE FROM webauthn_challenges WHERE expires_at < now()`,
	// Keep revoked/expired sessions a week for "recent activity" context, then drop them.
	"sessions": `DELETE FROM sessions WHERE expires_at < now() - interval '7 days'
	             OR (revoked_at IS NOT NULL AND revoked_at < now() - interval '7 days')`,
}

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
func cleanupHandler(pool *pgxpool.Pool, secret string, log *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !cronAuthorized(r, secret) {
			httpx.Error(w, http.StatusUnauthorized, "unauthorized", "missing or wrong cron secret")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
		defer cancel()
		deleted := map[string]int64{}
		for name, sql := range cleanupStatements {
			tag, err := pool.Exec(ctx, sql)
			if err != nil {
				log.Error("cleanup failed", "table", name, "err", err)
				httpx.Error(w, http.StatusInternalServerError, "cleanup_failed", name)
				return
			}
			deleted[name] = tag.RowsAffected()
		}
		log.Info("cleanup done", "deleted", deleted)
		httpx.JSON(w, http.StatusOK, map[string]any{"status": "ok", "deleted": deleted})
	}
}
