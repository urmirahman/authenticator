package passkeys

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

// Routes are mounted at /v1/passkeys. Login is public; registering a new passkey needs a session.
func (h *Handler) Routes(r chi.Router, requireAuth func(http.Handler) http.Handler) {
	r.Post("/login/begin", h.beginLogin)
	r.Post("/login/finish", h.finishLogin)
	r.Group(func(r chi.Router) {
		r.Use(requireAuth)
		r.Post("/register/begin", h.beginRegister)
		r.Post("/register/finish", h.finishRegister)
	})
}
