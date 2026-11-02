package app

// Integration test: real Postgres, real router, real HTTP (via httptest).
// Run with: pnpm -F @authenticator/server test:integration   (needs `pnpm db:up`)
// Skipped automatically when TEST_DATABASE_URL is not set.

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"github.com/urmirahman/authenticator/apps/server/internal/config"
	"github.com/urmirahman/authenticator/apps/server/internal/platform/database"
	"github.com/urmirahman/authenticator/apps/server/migrations"
)

type client struct {
	t     *testing.T
	base  string
	token string
}

func (c *client) do(method, path string, body any, out any) int {
	c.t.Helper()
	var r io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		r = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, c.base+path, r)
	req.Header.Set("Content-Type", "application/json")
	if c.token != "" {
		req.Header.Set("Authorization", "Bearer "+c.token)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		c.t.Fatal(err)
	}
	defer res.Body.Close()
	if out != nil {
		_ = json.NewDecoder(res.Body).Decode(out)
	}
	return res.StatusCode
}

func TestIntegrationVaultSyncFlow(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	sqlDB, err := sql.Open("pgx", url)
	if err != nil {
		t.Fatal(err)
	}
	goose.SetBaseFS(migrations.FS)
	_ = goose.SetDialect("postgres")
	goose.SetLogger(goose.NopLogger())
	if err := goose.Up(sqlDB, "."); err != nil {
		t.Fatal(err)
	}
	_ = sqlDB.Close()

	ctx := context.Background()
	pool, err := database.Connect(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	cfg := &config.Config{
		JWTSecret: "test", AccessTokenTTL: time.Minute, RefreshTokenTTL: time.Hour, DevAuth: true,
		WebAuthnRPID: "localhost", WebAuthnRPName: "Test", WebAuthnRPOrigins: []string{"http://localhost:3001"},
		AllowedOrigins: []string{"http://localhost:3001"},
	}
	h, err := NewRouter(ctx, cfg, slog.New(slog.NewTextHandler(io.Discard, nil)), pool)
	if err != nil {
		t.Fatal(err)
	}
	srv := httptest.NewServer(h)
	defer srv.Close()
	c := &client{t: t, base: srv.URL + "/v1"}

	// 1. sign in (dev) — unique email per run
	var tok struct{ AccessToken, RefreshToken string }
	email := uuid.NewString() + "@test.local"
	if s := c.do("POST", "/dev/token", map[string]string{"email": email}, &tok); s != 200 {
		t.Fatalf("dev token: %d", s)
	}
	c.token = tok.AccessToken
	defer c.do("DELETE", "/users/me", nil, nil)

	// 2. create a vault (salt/wrapped key are random bytes here; real ones come from @repo/crypto)
	var v struct{ ID uuid.UUID }
	vaultReq := map[string]any{
		"name": "Personal", "wrappedKey": make([]byte, 72),
		"kdf": map[string]any{"algorithm": "argon2id", "salt": make([]byte, 16), "memoryKiB": 65536, "iterations": 3, "parallelism": 1},
	}
	if s := c.do("POST", "/vaults", vaultReq, &v); s != 201 {
		t.Fatalf("create vault: %d", s)
	}

	// 3. create an item (v1), then a stale write (v1 again) must conflict
	item := uuid.New()
	body := map[string]any{"ciphertext": []byte("secret-blob"), "nonce": make([]byte, 24), "version": 1}
	if s := c.do("PUT", "/vaults/"+v.ID.String()+"/items/"+item.String(), body, nil); s != 200 {
		t.Fatalf("put v1: %d", s)
	}
	if s := c.do("PUT", "/vaults/"+v.ID.String()+"/items/"+item.String(), body, nil); s != 409 {
		t.Fatalf("stale put should be 409, got %d", s)
	}

	// 4. full pull sees it
	var pull struct {
		Items []struct {
			ID      uuid.UUID
			Deleted bool
			Version int
		}
		Cursor string
	}
	c.do("GET", "/sync/"+v.ID.String(), nil, &pull)
	if len(pull.Items) != 1 || pull.Items[0].Version != 1 {
		t.Fatalf("pull: %+v", pull)
	}
	cursor := pull.Cursor

	// 5. delete -> tombstone; incremental pull returns only the tombstone
	if s := c.do("DELETE", "/vaults/"+v.ID.String()+"/items/"+item.String()+"?version=2", nil, nil); s != 200 {
		t.Fatalf("delete: %d", s)
	}
	c.do("GET", "/sync/"+v.ID.String()+"?cursor="+cursor, nil, &pull)
	if len(pull.Items) != 1 || !pull.Items[0].Deleted {
		t.Fatalf("incremental pull: %+v", pull)
	}

	// 6. passkeys: register with a software authenticator, then sign in with it (no password, no OAuth)
	soft := newSoftAuthenticator(t, "localhost", "http://localhost:3001")
	var begin struct {
		ChallengeID uuid.UUID      `json:"challengeId"`
		Options     map[string]any `json:"options"`
	}
	if s := c.do("POST", "/passkeys/register/begin", nil, &begin); s != 200 {
		t.Fatalf("register begin: %d", s)
	}
	var pk struct{ ID uuid.UUID }
	if s := c.do("POST", "/passkeys/register/finish", map[string]any{
		"challengeId": begin.ChallengeID, "credential": soft.Register(begin.Options), "name": "Test key",
	}, &pk); s != 201 {
		t.Fatalf("register finish: %d", s)
	}
	anon := &client{t: t, base: c.base}
	if s := anon.do("POST", "/passkeys/login/begin", nil, &begin); s != 200 {
		t.Fatalf("login begin: %d", s)
	}
	var ptok struct{ AccessToken string }
	if s := anon.do("POST", "/passkeys/login/finish", map[string]any{
		"challengeId": begin.ChallengeID, "credential": soft.Login(begin.Options),
	}, &ptok); s != 200 || ptok.AccessToken == "" {
		t.Fatalf("login finish: %d", s)
	}
	// replaying the same challenge must fail (one-time use)
	if s := anon.do("POST", "/passkeys/login/finish", map[string]any{
		"challengeId": begin.ChallengeID, "credential": soft.Login(begin.Options),
	}, nil); s != 401 {
		t.Fatalf("challenge replay should be 401, got %d", s)
	}
	if s := c.do("PATCH", "/passkeys/"+pk.ID.String(), map[string]string{"name": "Renamed"}, nil); s != 204 {
		t.Fatalf("rename: %d", s)
	}

	// 7. activity log has the passkey events, newest first
	var act struct {
		Events []struct{ Action string }
	}
	c.do("GET", "/activity?limit=10", nil, &act)
	if len(act.Events) < 3 || act.Events[0].Action != "auth.sign_in" {
		t.Fatalf("activity: %+v", act)
	}

	// 8. another user can't see the vault
	other := &client{t: t, base: c.base}
	var tok2 struct{ AccessToken string }
	other.do("POST", "/dev/token", map[string]string{"email": uuid.NewString() + "@test.local"}, &tok2)
	other.token = tok2.AccessToken
	defer other.do("DELETE", "/users/me", nil, nil)
	if s := other.do("GET", "/vaults/"+v.ID.String(), nil, nil); s != 404 {
		t.Fatalf("other user should get 404, got %d", s)
	}
}
