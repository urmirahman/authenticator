package vault

import (
	"errors"
	"net/http"

	"github.com/urmirahman/authenticator/apps/server/internal/middleware"
	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	vs, err := h.svc.List(r.Context(), middleware.UserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "internal", "could not list vaults")
		return
	}
	httpx.JSON(w, http.StatusOK, vs)
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req CreateRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	v, err := h.svc.Create(r.Context(), middleware.UserID(r.Context()), req)
	switch {
	case errors.Is(err, ErrWeakKDF):
		httpx.Error(w, http.StatusBadRequest, "weak_kdf", err.Error())
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, "internal", "could not create vault")
	default:
		httpx.JSON(w, http.StatusCreated, v)
	}
}
