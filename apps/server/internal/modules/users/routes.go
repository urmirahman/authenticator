package users

import "github.com/go-chi/chi/v5"

// Routes are mounted at /v1/users behind RequireAuth.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/me", h.me)
	r.Patch("/me", h.update)
	r.Delete("/me", h.remove)
	r.Get("/me/export", h.export)
	r.Get("/me/sign-in-methods", h.signInMethods)
}
