package sync

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"github.com/urmirahman/authenticator/apps/server/internal/middleware"
	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

func writeErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		httpx.Error(w, http.StatusNotFound, "not_found", "vault or item not found")
	case errors.Is(err, ErrInvalidChange):
		httpx.Error(w, http.StatusBadRequest, "invalid_change", err.Error())
	case errors.Is(err, ErrForeignItem):
		httpx.Error(w, http.StatusConflict, "foreign_item", err.Error())
	default:
		httpx.Error(w, http.StatusInternalServerError, "internal", "sync failed")
	}
}

func uuidParam(r *http.Request, name string) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, name))
	return id, err == nil
}

// deviceID comes from the X-Device-Id header (optional) so the change log knows who wrote what.
func deviceID(r *http.Request) uuid.UUID {
	id, _ := uuid.Parse(r.Header.Get("X-Device-Id"))
	return id
}

func (h *Handler) pull(w http.ResponseWriter, r *http.Request) {
	vaultID, ok := uuidParam(r, "vaultID")
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "invalid vault id")
		return
	}
	resp, err := h.svc.Pull(r.Context(), middleware.UserID(r.Context()), vaultID, r.URL.Query().Get("cursor"))
	if err != nil {
		writeErr(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, resp)
}

func (h *Handler) push(w http.ResponseWriter, r *http.Request) {
	var req PushRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	resp, err := h.svc.Push(r.Context(), middleware.UserID(r.Context()), req)
	if err != nil {
		writeErr(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, resp)
}

func (h *Handler) listItems(w http.ResponseWriter, r *http.Request) {
	vaultID, ok := uuidParam(r, "vaultID")
	if !ok {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "invalid vault id")
		return
	}
	items, err := h.svc.ListItems(r.Context(), middleware.UserID(r.Context()), vaultID)
	if err != nil {
		writeErr(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, items)
}

func (h *Handler) getItem(w http.ResponseWriter, r *http.Request) {
	vaultID, ok1 := uuidParam(r, "vaultID")
	itemID, ok2 := uuidParam(r, "itemID")
	if !ok1 || !ok2 {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	it, err := h.svc.GetItem(r.Context(), middleware.UserID(r.Context()), vaultID, itemID)
	if err != nil {
		writeErr(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, it)
}

// putItem: PUT body {kind, ciphertext, nonce, version}. 200 = saved, 409 = conflict (body has server copy).
func (h *Handler) putItem(w http.ResponseWriter, r *http.Request) {
	vaultID, ok1 := uuidParam(r, "vaultID")
	itemID, ok2 := uuidParam(r, "itemID")
	if !ok1 || !ok2 {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "invalid id")
		return
	}
	var c Change
	if err := httpx.Decode(r, &c); err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", err.Error())
		return
	}
	c.ID = itemID
	h.writeSingle(w, r, vaultID, c)
}

// deleteItem: DELETE ?version=N writes a tombstone.
func (h *Handler) deleteItem(w http.ResponseWriter, r *http.Request) {
	vaultID, ok1 := uuidParam(r, "vaultID")
	itemID, ok2 := uuidParam(r, "itemID")
	v, err := strconv.ParseInt(r.URL.Query().Get("version"), 10, 32)
	if !ok1 || !ok2 || err != nil {
		httpx.Error(w, http.StatusBadRequest, "bad_request", "invalid id or ?version")
		return
	}
	h.writeSingle(w, r, vaultID, Change{ID: itemID, Version: int32(v), Deleted: true})
}

func (h *Handler) writeSingle(w http.ResponseWriter, r *http.Request, vaultID uuid.UUID, c Change) {
	resp, err := h.svc.PutItem(r.Context(), middleware.UserID(r.Context()), vaultID, deviceID(r), c)
	if err != nil {
		writeErr(w, err)
		return
	}
	if len(resp.Conflicts) > 0 {
		httpx.JSON(w, http.StatusConflict, resp)
		return
	}
	if len(resp.Accepted) == 0 { // e.g. version 2 for an item that doesn't exist
		httpx.Error(w, http.StatusConflict, "version_mismatch", "new items must use version 1")
		return
	}
	httpx.JSON(w, http.StatusOK, resp)
}
