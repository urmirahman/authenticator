package sync

import "github.com/go-chi/chi/v5"

// Routes are mounted at /v1/sync behind RequireAuth.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/{vaultID}", h.pull)
	r.Post("/", h.push)
}

// ItemRoutes are mounted at /v1/vaults/{vaultID}/items behind RequireAuth.
func (h *Handler) ItemRoutes(r chi.Router) {
	r.Get("/", h.listItems)
	r.Get("/{itemID}", h.getItem)
	r.Put("/{itemID}", h.putItem)
	r.Delete("/{itemID}", h.deleteItem)
}
