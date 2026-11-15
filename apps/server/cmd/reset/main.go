// Command reset deletes all application rows but keeps the schema and goose migrations.
// Usage: go run ./cmd/reset [--force]
package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/urmirahman/authenticator/apps/server/internal/config"
)

// Every app table (not goose_db_version). One TRUNCATE + CASCADE handles FK order.
const truncateSQL = `
TRUNCATE TABLE
  backups,
  sync_changes,
  vault_items,
  vaults,
  sessions,
  passkey_credentials,
  webauthn_challenges,
  login_codes,
  oauth_states,
  devices,
  identities,
  audit_log,
  users
RESTART IDENTITY CASCADE;
`

func main() {
	force := os.Getenv("RESET_DB") == "1" || strings.EqualFold(os.Getenv("RESET_DB"), "true")
	for _, arg := range os.Args[1:] {
		if arg == "--force" || arg == "-f" {
			force = true
		}
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	if cfg.Env == "production" && !force {
		log.Fatal("refusing production truncate without RESET_DB=1 or --force")
	}

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	ctx := context.Background()
	if _, err := db.ExecContext(ctx, truncateSQL); err != nil {
		log.Fatal(err)
	}
	fmt.Println("truncated all application data (schema and goose_db_version unchanged)")
}