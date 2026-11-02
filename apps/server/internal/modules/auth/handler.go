package auth

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// writeErr maps service errors to HTTP status codes in one place.
func writeErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrUnknownProvider):
		httpx.Error(w, http.StatusNotFound, "unknown_provider", err.Error())
	case errors.Is(err, ErrBadRedirect), errors.Is(err, ErrBadRequest):
		httpx.Error(w, http.StatusBadRequest, "bad_request", err.Error())
	case errors.Is(err, ErrEmailTaken):
		httpx.Error(w, http.StatusConflict, "email_taken", err.Error())
	case errors.Is(err, ErrInvalidRefresh), errors.Is(err, ErrInvalidCode), errors.Is(err, ErrInvalidState):
		httpx.Error(w, http.StatusUnauthorized, "unauthorized", err.Error())
	default:
		httpx.Error(w, http.StatusUnauthorized, "auth_failed", "sign-in failed")
	}
}

func meta(r *http.Request) SessionMeta { return SessionMeta{UserAgent: r.UserAgent()} }

func (h *Handler) start(w http.ResponseWriter, r *http.Request) {
	url, err := h.svc.Start(r.Context(), chi.URLParam(r, "provider"), r.URL.Query().Get("redirect_uri"))
	if err != nil {
		writeErr(w, err)
		return
	}
	http.Redirect(w, r, url, http.StatusFound)
}

// callback handles GET (Google/Facebook) and POST form_post (Apple).
func (h *Handler) callback(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "bad form")
		return
	}
	if e := r.Form.Get("error"); e != "" {
		httpx.Error(w, http.StatusUnauthorized, "provider_error", e)
		return
	}
	to, err := h.svc.Callback(r.Context(), chi.URLParam(r, "provider"),
		r.Form.Get("state"), r.Form.Get("code"), r.Form.Get("user"))
	if err != nil {
		writeErr(w, err)
		return
	}
	http.Redirect(w, r, to, http.StatusFound)
}

func (h *Handler) exchange(w http.ResponseWriter, r *http.Request) {
	var req ExchangeRequest
	if err := httpx.Decode(r, &req); err != nil || req.Code == "" {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "code is required")
		return
	}
	t, err := h.svc.ExchangeLoginCode(r.Context(), req.Code, meta(r))
	if err != nil {
		writeErr(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, t)
}

func (h *Handler) native(w http.ResponseWriter, r *http.Request) {
	var req NativeRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	t, err := h.svc.NativeSignIn(r.Context(), chi.URLParam(r, "provider"), req, meta(r))
	if err != nil {
		writeErr(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, t)
}

func (h *Handler) refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := httpx.Decode(r, &req); err != nil || req.RefreshToken == "" {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "refreshToken is required")
		return
	}
	t, err := h.svc.Refresh(r.Context(), req.RefreshToken, meta(r))
	if err != nil {
		writeErr(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, t)
}

func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "refreshToken is required")
		return
	}
	if err := h.svc.Logout(r.Context(), req.RefreshToken); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "internal", "could not log out")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
