package auth

import (
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

const stateCookie = "oauth_state"

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func (h *Handler) start(w http.ResponseWriter, r *http.Request) {
	url, state, err := h.svc.AuthCodeURL(chi.URLParam(r, "provider"))
	if errors.Is(err, ErrUnknownProvider) {
		httpx.Error(w, http.StatusNotFound, "unknown_provider", err.Error())
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "internal", "could not start sign-in")
		return
	}
	http.SetCookie(w, &http.Cookie{
		Name: stateCookie, Value: state, Path: "/v1/auth", HttpOnly: true, Secure: r.TLS != nil,
		// Apple uses form_post (a cross-site POST), which needs SameSite=None in production.
		SameSite: http.SameSiteLaxMode, Expires: time.Now().Add(10 * time.Minute),
	})
	http.Redirect(w, r, url, http.StatusFound)
}

// callback: TODO
//  1. compare ?state with the cookie
//  2. exchange the code (Apple: ClientSecret = applesecret.Generate(...))
//  3. fetch/verify the profile (Google & Apple: verify the id_token; Facebook: GET /me?fields=id,name,email)
//  4. h.svc.SignIn(...) and redirect to the web app with a one-time code (never tokens in the URL)
func (h *Handler) callback(w http.ResponseWriter, _ *http.Request) { httpx.NotImplemented(w) }

// idToken is for mobile: native SDKs hand us an id_token we verify against the provider's JWKS. TODO.
func (h *Handler) idToken(w http.ResponseWriter, _ *http.Request) { httpx.NotImplemented(w) }

func (h *Handler) refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := httpx.Decode(r, &req); err != nil || req.RefreshToken == "" {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "refreshToken is required")
		return
	}
	t, err := h.svc.Refresh(r.Context(), req.RefreshToken, SessionMeta{UserAgent: r.UserAgent()})
	if errors.Is(err, ErrInvalidRefresh) {
		httpx.Error(w, http.StatusUnauthorized, "invalid_refresh", err.Error())
		return
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "internal", "could not refresh")
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
