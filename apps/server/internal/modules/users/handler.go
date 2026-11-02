package users

import (
	"errors"
	"net/http"

	"github.com/jackc/pgx/v5"

	"github.com/urmirahman/authenticator/apps/server/internal/middleware"
	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	u, err := h.svc.Me(r.Context(), middleware.UserID(r.Context()))
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		httpx.Error(w, http.StatusNotFound, "not_found", "user not found")
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, "internal", "could not load user")
	default:
		httpx.JSON(w, http.StatusOK, u)
	}
}
