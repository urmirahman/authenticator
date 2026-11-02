package sync

import "github.com/go-chi/chi/v5"

// Routes are mounted at /v1/sync behind RequireAuth.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/{vaultID}", h.pull)
	r.Post("/", h.push)
}
