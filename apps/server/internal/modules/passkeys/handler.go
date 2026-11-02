package passkeys

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/middleware"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/audit"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/auth"
	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

type Handler struct {
	svc   *Service
	audit audit.Recorder
}

func NewHandler(svc *Service, rec audit.Recorder) *Handler { return &Handler{svc: svc, audit: rec} }

func writeErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrChallenge), errors.Is(err, ErrVerify):
		httpx.Error(w, http.StatusUnauthorized, "passkey_failed", err.Error())
	case errors.Is(err, ErrNotFound):
		httpx.Error(w, http.StatusNotFound, "not_found", err.Error())
	case errors.Is(err, ErrInvalidName):
		httpx.Error(w, http.StatusBadRequest, "bad_request", err.Error())
	default:
		httpx.Error(w, http.StatusInternalServerError, "internal", "passkey operation failed")
	}
}

func decodeFinish(w http.ResponseWriter, r *http.Request) (FinishRequest, bool) {
	var req FinishRequest
	if err := httpx.Decode(r, &req); err != nil || req.ChallengeID == uuid.Nil || len(req.Credential) == 0 {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "challengeId and credential are required")
		return req, false
	}
	return req, true
}

func (h *Handler) beginLogin(w http.ResponseWriter, r *http.Request) {
	resp, err := h.svc.BeginLogin(r.Context())
	if err != nil {
		writeErr(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, resp)
}

func (h *Handler) finishLogin(w http.ResponseWriter, r *http.Request) {
	req, ok := decodeFinish(w, r)
	if !ok {
		return
	}
	t, err := h.svc.FinishLogin(r.Context(), req, auth.SessionMeta{UserAgent: r.UserAgent()})
	if err != nil {
		writeErr(w, err)
		return
	}
	h.audit.Record(r, t.UserID, audit.SignIn, map[string]any{"method": "passkey"})
	httpx.JSON(w, http.StatusOK, t)
}

func (h *Handler) beginRegister(w http.ResponseWriter, r *http.Request) {
	resp, err := h.svc.BeginRegister(r.Context(), middleware.UserID(r.Context()))
	if err != nil {
		writeErr(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, resp)
}

func (h *Handler) finishRegister(w http.ResponseWriter, r *http.Request) {
	req, ok := decodeFinish(w, r)
	if !ok {
		return
	}
	uid := middleware.UserID(r.Context())
	pk, err := h.svc.FinishRegister(r.Context(), uid, req)
	if err != nil {
		writeErr(w, err)
		return
	}
	h.audit.Record(r, uid, audit.PasskeyAdded, map[string]any{"passkeyId": pk.ID, "name": pk.Name})
	httpx.JSON(w, http.StatusCreated, pk)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	pks, err := h.svc.List(r.Context(), middleware.UserID(r.Context()))
	if err != nil {
		writeErr(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, pks)
}

func (h *Handler) rename(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	var req RenameRequest
	if err != nil || httpx.Decode(r, &req) != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "invalid id or body")
		return
	}
	if err := h.svc.Rename(r.Context(), middleware.UserID(r.Context()), id, req.Name); err != nil {
		writeErr(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
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
	h.audit.Record(r, uid, audit.PasskeyRemoved, map[string]any{"passkeyId": id})
	w.WriteHeader(http.StatusNoContent)
}
