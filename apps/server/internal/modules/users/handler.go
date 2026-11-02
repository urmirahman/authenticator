package users

import (
	"errors"
	"net/http"

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

func writeUser(w http.ResponseWriter, u User, err error) {
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		httpx.Error(w, http.StatusNotFound, "not_found", "user not found")
	case errors.Is(err, ErrInvalidName):
		httpx.Error(w, http.StatusBadRequest, "bad_request", err.Error())
	case err != nil:
		httpx.Error(w, http.StatusInternalServerError, "internal", "could not load user")
	default:
		httpx.JSON(w, http.StatusOK, u)
	}
}

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	u, err := h.svc.Me(r.Context(), middleware.UserID(r.Context()))
	writeUser(w, u, err)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	var req UpdateRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	u, err := h.svc.Update(r.Context(), middleware.UserID(r.Context()), req)
	writeUser(w, u, err)
}

func (h *Handler) remove(w http.ResponseWriter, r *http.Request) {
	if err := h.svc.Delete(r.Context(), middleware.UserID(r.Context())); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "internal", "could not delete account")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// export: GET /users/me/export — downloads as a JSON file.
func (h *Handler) export(w http.ResponseWriter, r *http.Request) {
	uid := middleware.UserID(r.Context())
	e, err := h.svc.Export(r.Context(), uid)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "internal", "could not export data")
		return
	}
	h.audit.Record(r, uid, audit.AccountExported, nil)
	w.Header().Set("Content-Disposition", `attachment; filename="authenticator-data-export.json"`)
	httpx.JSON(w, http.StatusOK, e)
}
