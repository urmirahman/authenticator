package passkeys

import (
	"net/http"

	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

type Handler struct{ svc *Service }

func NewHandler(svc *Service) *Handler { return &Handler{svc: svc} }

// All four are stubs for now (501). See service.go for the planned flow.
func (h *Handler) beginLogin(w http.ResponseWriter, _ *http.Request)     { httpx.NotImplemented(w) }
func (h *Handler) finishLogin(w http.ResponseWriter, _ *http.Request)    { httpx.NotImplemented(w) }
func (h *Handler) beginRegister(w http.ResponseWriter, _ *http.Request)  { httpx.NotImplemented(w) }
func (h *Handler) finishRegister(w http.ResponseWriter, _ *http.Request) { httpx.NotImplemented(w) }
