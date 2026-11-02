// Package dev exposes POST /v1/dev/token to mint real tokens without OAuth, for local testing
// with curl. Only mounted when DEV_AUTH=true and APP_ENV != production (config enforces this).
package dev

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
	"github.com/urmirahman/authenticator/apps/server/internal/modules/auth"
	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

type Handler struct {
	q    *db.Queries
	auth *auth.Service
}

func NewHandler(q *db.Queries, a *auth.Service) *Handler { return &Handler{q: q, auth: a} }

func (h *Handler) Routes(r chi.Router) { r.Post("/token", h.token) }

func (h *Handler) token(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := httpx.Decode(r, &req); err != nil || req.Email == "" {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "email is required")
		return
	}
	u, err := h.q.GetUserByEmail(r.Context(), req.Email)
	if errors.Is(err, pgx.ErrNoRows) {
		u, err = h.q.CreateUser(r.Context(), db.CreateUserParams{Email: req.Email, DisplayName: req.Name})
	}
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	t, err := h.auth.IssueForUser(r.Context(), u.ID, auth.SessionMeta{UserAgent: r.UserAgent()})
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "internal", err.Error())
		return
	}
	httpx.JSON(w, http.StatusOK, t)
}
