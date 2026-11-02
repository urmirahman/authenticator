# Thin wrappers so you can use make or pnpm, whichever you like.
.PHONY: dev db-up db-down migrate generate test lint
dev: ; pnpm dev
db-up: ; docker compose up -d postgres
db-down: ; docker compose down
migrate: ; pnpm db:migrate
generate: ; pnpm db:generate
test: ; pnpm test
lint: ; pnpm lint
