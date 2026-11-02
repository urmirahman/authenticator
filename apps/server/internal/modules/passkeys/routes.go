package passkeys

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

// Routes are mounted at /v1/passkeys. Login is public (and rate limited);
// everything else needs a session.
func (h *Handler) Routes(r chi.Router, requireAuth, rateLimit func(http.Handler) http.Handler) {
	r.With(rateLimit).Post("/login/begin", h.beginLogin)
	r.With(rateLimit).Post("/login/finish", h.finishLogin)
	r.Group(func(r chi.Router) {
		r.Use(requireAuth)
		r.Post("/register/begin", h.beginRegister)
		r.Post("/register/finish", h.finishRegister)
		r.Get("/", h.list)
		r.Patch("/{id}", h.rename)
		r.Delete("/{id}", h.remove)
	})
}
