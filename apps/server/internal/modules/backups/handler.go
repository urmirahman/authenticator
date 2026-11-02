package backups

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

func writeErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrInvalid):
		httpx.Error(w, http.StatusBadRequest, "invalid_backup", err.Error())
	case errors.Is(err, ErrTooMany):
		httpx.Error(w, http.StatusConflict, "too_many_backups", err.Error())
	case errors.Is(err, ErrNotFound), errors.Is(err, pgx.ErrNoRows):
		httpx.Error(w, http.StatusNotFound, "not_found", "backup not found")
	default:
		httpx.Error(w, http.StatusInternalServerError, "internal", "backup operation failed")
	}
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req CreateRequest
	// base64 makes the JSON ~4/3 of the ciphertext, plus some room for the other fields.
	if err := httpx.DecodeLimit(r, &req, MaxBackupBytes*4/3+64<<10); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	uid := middleware.UserID(r.Context())
	m, err := h.svc.Create(r.Context(), uid, req)
	if err != nil {
		writeErr(w, err)
		return
	}
	h.audit.Record(r, uid, audit.BackupCreated, map[string]any{"backupId": m.ID, "items": m.ItemCount})
	httpx.JSON(w, http.StatusCreated, m)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	ms, err := h.svc.List(r.Context(), middleware.UserID(r.Context()))
	if err != nil {
		writeErr(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, ms)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	uid := middleware.UserID(r.Context())
	b, err := h.svc.Get(r.Context(), uid, id)
	if err != nil {
		writeErr(w, err)
		return
	}
	h.audit.Record(r, uid, audit.BackupDownloaded, map[string]any{"backupId": id})
	httpx.JSON(w, http.StatusOK, b)
}

func (h *Handler) remove(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	uid := middleware.UserID(r.Context())
	if err := h.svc.Delete(r.Context(), uid, id); err != nil {
		writeErr(w, err)
		return
	}
	h.audit.Record(r, uid, audit.BackupDeleted, map[string]any{"backupId": id})
	w.WriteHeader(http.StatusNoContent)
}

// Routes are mounted at /v1/backups behind RequireAuth.
func (h *Handler) Routes(r chi.Router) {
	r.Get("/", h.list)
	r.Post("/", h.create)
	r.Get("/{id}", h.get)
	r.Delete("/{id}", h.remove)
}
