package devices

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

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
	ds, err := h.svc.List(r.Context(), middleware.UserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "internal", "could not list devices")
		return
	}
	httpx.JSON(w, http.StatusOK, ds)
}

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	d, err := h.svc.Register(r.Context(), middleware.UserID(r.Context()), middleware.SessionID(r.Context()), req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	h.audit.Record(r, middleware.UserID(r.Context()), audit.DeviceAdded, map[string]any{"deviceId": d.ID, "name": d.Name, "platform": d.Platform})
	httpx.JSON(w, http.StatusCreated, d)
}

func (h *Handler) revoke(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	err = h.svc.Revoke(r.Context(), middleware.UserID(r.Context()), id)
	if errors.Is(err, ErrNotFound) {
		httpx.Error(w, http.StatusNotFound, "not_found", err.Error())
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "internal", "could not revoke device")
		return
	}
	h.audit.Record(r, middleware.UserID(r.Context()), audit.DeviceRevoked, map[string]any{"deviceId": id})
	w.WriteHeader(http.StatusNoContent)
}
