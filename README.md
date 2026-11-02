# Authenticator

A portfolio-grade authenticator app: **TOTP codes**, **passkeys (WebAuthn)** and **end-to-end encrypted sync** across web, iOS and Android.

| Part                                                   | Tech                                                                                   |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `apps/server`                                          | Go 1.27, chi, pgx v5 + sqlc, goose migrations, slog, golang-jwt, go-webauthn, x/oauth2 |
| `apps/web`                                             | Next.js 16 (App Router), React 19, Tailwind v4                                         |
| `apps/mobile`                                          | Expo SDK 58, expo-router, expo-camera, expo-secure-store                               |
| `packages/crypto`                                      | TOTP (RFC 6238) + XChaCha20-Poly1305 / Argon2id helpers (`@noble/*`), Vitest           |
| `packages/api-client`                                  | Typed fetch client shared by web + mobile                                              |
| `packages/types`                                       | Shared DTOs (mirror the Go JSON)                                                       |
| `packages/ui`                                          | Shared web React components                                                            |
| `packages/eslint-config`, `packages/typescript-config` | Shared tooling                                                                         |
| Database                                               | PostgreSQL 16 (Docker)                                                                 |

## Getting started

```bash
pnpm install
cp apps/server/.env.example apps/server/.env   # fill in JWT_SECRET (openssl rand -base64 48)
cp apps/web/.env.example apps/web/.env.local
pnpm db:up          # start Postgres in Docker
pnpm db:migrate     # create tables
pnpm dev            # server :8080, web :3001, Expo dev server
```

> The Go server reads real environment variables. To load `apps/server/.env`, run
> `set -a; source apps/server/.env; set +a` first, or use a tool like `direnv`.

Handy shortcuts: `pnpm server`, `pnpm web`, `pnpm mobile`, `pnpm ios`, `pnpm android`.

## Everyday commands

| Command            | What it does                                                        |
| ------------------ | ------------------------------------------------------------------- |
| `pnpm check-types` | `tsc` for TS packages, `go build ./...` for the server              |
| `pnpm lint`        | ESLint everywhere, `go vet` (+ `golangci-lint` if installed) for Go |
| `pnpm test`        | Vitest (crypto) + `go test ./...`                                   |
| `pnpm db:generate` | Regenerate Go DB code from `apps/server/queries/*.sql` (sqlc)       |
| `pnpm cz`          | Commit with the conventional-commit prompt                          |

## Docs

- [Architecture](docs/ARCHITECTURE.md): system overview, auth flows, E2E encryption design
- [Database](docs/DATABASE.md): tables and why they exist
- [Decisions](docs/DECISIONS.md): short ADRs
- [Server guide](apps/server/README.md): a tour of the Go code for learners
