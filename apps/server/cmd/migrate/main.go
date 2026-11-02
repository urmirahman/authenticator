// Command migrate applies SQL migrations with goose. Usage: go run ./cmd/migrate [up|down|status]
package main

import (
	"database/sql"
	"log"
	"os"

	_ "github.com/jackc/pgx/v5/stdlib" // registers the "pgx" database/sql driver
	"github.com/pressly/goose/v3"

	"github.com/urmirahman/authenticator/apps/server/internal/config"
	"github.com/urmirahman/authenticator/apps/server/migrations"
)

func main() {
	cmd := "up"
	if len(os.Args) > 1 {
		cmd = os.Args[1]
	}
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatal(err)
	}
	if err := goose.Run(cmd, db, "."); err != nil {
		log.Fatal(err)
	}
}
