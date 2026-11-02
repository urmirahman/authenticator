package vault

import "github.com/go-chi/chi/v5"

// Routes are mounted at /v1/vaults behind RequireAuth. itemRoutes (from the sync module)
// are nested at /v1/vaults/{vaultID}/items.
func (h *Handler) Routes(r chi.Router, itemRoutes func(chi.Router)) {
	r.Get("/", h.list)
	r.Post("/", h.create)
	r.Get("/{vaultID}", h.get)
	r.Put("/{vaultID}/key", h.rekey)
	r.Route("/{vaultID}/items", itemRoutes)
}
