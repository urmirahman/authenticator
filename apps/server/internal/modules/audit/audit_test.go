package audit_test

import (
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"

	"github.com/urmirahman/authenticator/apps/server/internal/modules/audit"
)

func TestAudit_Nop(t *testing.T) {
	var rec audit.Recorder = audit.Nop{}
	r := httptest.NewRequest("GET", "/", nil)
	// Should not panic
	rec.Record(r, uuid.New(), audit.SignIn, map[string]any{"key": "val"})
}
