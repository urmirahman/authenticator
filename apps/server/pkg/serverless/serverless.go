// Package serverless exposes the API as a plain http.Handler for Vercel.
//
// Why a pkg/ wrapper: Vercel's Go builder compiles api/index.go inside a generated wrapper
// package, and Go forbids importing internal/... from outside the module tree. This package
// lives in the module (so it may import internal/app) and is public (so api/ may import it).
package serverless

import (
	"net/http"

	"github.com/urmirahman/authenticator/apps/server/internal/app"
)

// Handler builds the router lazily on the first request of each cold start.
func Handler() http.Handler { return app.ServerlessHandler() }
