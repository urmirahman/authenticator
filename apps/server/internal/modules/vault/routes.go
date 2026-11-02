package vault

import "github.com/go-chi/chi/v5"

// Routes are mounted at /v1/vaults behind RequireAuth.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/", h.list)
	r.Post("/", h.create)
}
