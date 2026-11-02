package middleware

import (
	"net/http"
	"time"

	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/httprate"

	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

// SecurityHeaders sets safe defaults for a JSON API. HSTS only when served over HTTPS (prod).
func SecurityHeaders(hsts bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := w.Header()
			h.Set("X-Content-Type-Options", "nosniff")
			h.Set("X-Frame-Options", "DENY")
			h.Set("Referrer-Policy", "no-referrer")
			h.Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
			h.Set("Cross-Origin-Resource-Policy", "same-site")
			h.Set("Cache-Control", "no-store") // tokens and ciphertext must never be cached
			if hsts {
				h.Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequestIDHeader echoes chi's request id back so clients can quote it in bug reports.
func RequestIDHeader(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Request-Id", chimw.GetReqID(r.Context()))
		next.ServeHTTP(w, r)
	})
}

// RateLimit allows `requests` per `window` per client IP, answering 429 with JSON.
func RateLimit(requests int, window time.Duration) func(http.Handler) http.Handler {
	return httprate.Limit(requests, window,
		httprate.WithKeyFuncs(httprate.KeyByRealIP),
		httprate.WithLimitHandler(func(w http.ResponseWriter, _ *http.Request) {
			httpx.Error(w, http.StatusTooManyRequests, "rate_limited", "too many requests, slow down")
		}),
	)
}
