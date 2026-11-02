// Package audit records security events (sign-ins, new devices, passkeys, key changes)
// and lets a user page through their own activity log.
package audit

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/netip"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/urmirahman/authenticator/apps/server/internal/db"
	"github.com/urmirahman/authenticator/apps/server/internal/middleware"
	"github.com/urmirahman/authenticator/apps/server/pkg/httpx"
)

// Actions. Keep them stable: clients may show translated labels per action.
const (
	SignIn           = "auth.sign_in"
	DeviceAdded      = "device.added"
	DeviceRevoked    = "device.revoked"
	PasskeyAdded     = "passkey.added"
	PasskeyRemoved   = "passkey.removed"
	VaultCreated     = "vault.created"
	VaultKeyChanged  = "vault.key_changed"
	BackupCreated    = "backup.created"
	BackupDownloaded = "backup.downloaded"
	BackupDeleted    = "backup.deleted"
	AccountExported  = "account.exported"
)

// Recorder is what other modules depend on (an interface, so tests can pass a no-op).
type Recorder interface {
	Record(r *http.Request, userID uuid.UUID, action string, meta map[string]any)
}

// Event is the API shape.
type Event struct {
	ID        int64          `json:"id"`
	Action    string         `json:"action"`
	IP        string         `json:"ip,omitempty"`
	UserAgent string         `json:"userAgent,omitempty"`
	Metadata  map[string]any `json:"metadata"`
	CreatedAt time.Time      `json:"createdAt"`
}

type Page struct {
	Events []Event `json:"events"`
	Next   string  `json:"next,omitempty"` // pass as ?before= for the next page
}

type Service struct {
	q   *db.Queries
	log *slog.Logger
}

func NewService(q *db.Queries, log *slog.Logger) *Service { return &Service{q: q, log: log} }

// Record never fails the request: an audit write error is logged, not returned.
func (s *Service) Record(r *http.Request, userID uuid.UUID, action string, meta map[string]any) {
	if meta == nil {
		meta = map[string]any{}
	}
	b, _ := json.Marshal(meta)
	err := s.q.InsertAudit(context.WithoutCancel(r.Context()), db.InsertAuditParams{
		UserID:    uuid.NullUUID{UUID: userID, Valid: userID != uuid.Nil},
		Action:    action,
		Ip:        clientIP(r),
		UserAgent: pgtype.Text{String: r.UserAgent(), Valid: r.UserAgent() != ""},
		Metadata:  b,
	})
	if err != nil {
		s.log.Error("audit write failed", "action", action, "err", err)
	}
}

func (s *Service) List(ctx context.Context, userID uuid.UUID, before int64, limit int32) (Page, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	rows, err := s.q.ListAudit(ctx, db.ListAuditParams{UserID: uuid.NullUUID{UUID: userID, Valid: true}, BeforeID: before, Limit: limit})
	if err != nil {
		return Page{}, err
	}
	p := Page{Events: make([]Event, 0, len(rows))}
	for _, r := range rows {
		e := Event{ID: r.ID, Action: r.Action, UserAgent: r.UserAgent.String, CreatedAt: r.CreatedAt}
		if r.Ip != nil {
			e.IP = r.Ip.String()
		}
		_ = json.Unmarshal(r.Metadata, &e.Metadata)
		p.Events = append(p.Events, e)
	}
	if len(rows) == int(limit) {
		p.Next = strconv.FormatInt(rows[len(rows)-1].ID, 10)
	}
	return p, nil
}

// Routes are mounted at /v1/activity behind RequireAuth. GET /?before=<id>&limit=<n>
func (s *Service) Routes(r chi.Router) {
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		before, _ := strconv.ParseInt(r.URL.Query().Get("before"), 10, 64)
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		p, err := s.List(r.Context(), middleware.UserID(r.Context()), before, int32(limit))
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "internal", "could not load activity")
			return
		}
		httpx.JSON(w, http.StatusOK, p)
	})
}

// clientIP: RealIP middleware has already replaced RemoteAddr with the proxy-reported IP.
func clientIP(r *http.Request) *netip.Addr {
	if ap, err := netip.ParseAddrPort(r.RemoteAddr); err == nil {
		a := ap.Addr()
		return &a
	}
	if a, err := netip.ParseAddr(r.RemoteAddr); err == nil {
		return &a
	}
	return nil
}

// Nop is a Recorder that does nothing (unit tests).
type Nop struct{}

func (Nop) Record(*http.Request, uuid.UUID, string, map[string]any) {}
