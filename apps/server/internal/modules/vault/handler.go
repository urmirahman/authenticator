package vault

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/urmirahman/authenticator/apps/server/internal/middleware"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/audit"
	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

type Handler struct {
	svc   *Service
	audit audit.Recorder
}

func NewHandler(svc *Service, rec audit.Recorder) *Handler { return &Handler{svc: svc, audit: rec} }

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
	if err == nil {
		h.audit.Record(r, middleware.UserID(r.Context()), audit.VaultCreated, map[string]any{"vaultId": v.ID})
	}
	writeVault(w, http.StatusCreated, v, err)
}

func writeVault(w http.ResponseWriter, okStatus int, v Vault, err error) {
	switch {
	case errors.Is(err, ErrWeakKDF), errors.Is(err, ErrBadWrappedKey):
		httpx.Error(w, http.StatusBadRequest, "bad_envelope", err.Error())
	case errors.Is(err, pgx.ErrNoRows):
		httpx.Error(w, http.StatusNotFound, "not_found", "vault not found")
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, "internal", "vault operation failed")
	default:
		httpx.JSON(w, okStatus, v)
	}
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "vaultID"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "invalid vault id")
		return
	}
	v, err := h.svc.Get(r.Context(), middleware.UserID(r.Context()), id)
	writeVault(w, http.StatusOK, v, err)
}

func (h *Handler) rekey(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "vaultID"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "invalid vault id")
		return
	}
	var req RekeyRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	v, err := h.svc.Rekey(r.Context(), middleware.UserID(r.Context()), id, req)
	if err == nil {
		h.audit.Record(r, middleware.UserID(r.Context()), audit.VaultKeyChanged, map[string]any{"vaultId": id})
	}
	writeVault(w, http.StatusOK, v, err)
}
