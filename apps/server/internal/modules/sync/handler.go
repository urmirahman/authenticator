package sync

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/urmirahman/authenticator/apps/server/internal/middleware"
	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) pull(w http.ResponseWriter, r *http.Request) {
	vaultID, err := uuid.Parse(chi.URLParam(r, "vaultID"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "invalid vault id")
		return
	}
	resp, err := h.svc.Pull(r.Context(), middleware.UserID(r.Context()), vaultID, r.URL.Query().Get("cursor"))
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		httpx.Error(w, http.StatusNotFound, "not_found", "vault not found")
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, "internal", "could not pull changes")
	default:
		httpx.JSON(w, http.StatusOK, resp)
	}
}

func (h *Handler) push(w http.ResponseWriter, r *http.Request) {
	var req PushRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	resp, err := h.svc.Push(r.Context(), middleware.UserID(r.Context()), req)
	if errors.Is(err, httpx.ErrNotImplemented) {
		httpx.NotImplemented(w)
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "internal", "could not push changes")
		return
	}
	httpx.JSON(w, http.StatusOK, resp)
}
