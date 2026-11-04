// Package handler is the Vercel serverless entry point. Vercel's Go runtime calls Handler for
// every request; vercel.json rewrites all paths here, so /v1/... routes work unchanged.
// Local development still uses cmd/api (a normal long-running server on :8787).
package handler

import (
	"net/http"

	"github.com/urmirahman/authenticator/apps/server/pkg/serverless"
)

var h = serverless.Handler()

// Handler is the exported function Vercel invokes.
func Handler(w http.ResponseWriter, r *http.Request) {
	h.ServeHTTP(w, r)
}
