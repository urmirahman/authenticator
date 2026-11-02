package auth

import "github.com/go-chi/chi/v5"

// Routes are mounted at /v1/auth (public).
func (h *Handler) Routes(r chi.Router) {
	r.Get("/oauth/{provider}/start", h.start)
	r.Get("/oauth/{provider}/callback", h.callback)
	r.Post("/oauth/{provider}/callback", h.callback) // Apple form_post
	r.Post("/oauth/{provider}/token", h.idToken)
	r.Post("/refresh", h.refresh)
	r.Post("/logout", h.logout)
}
