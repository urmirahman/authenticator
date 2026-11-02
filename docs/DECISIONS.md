# Decisions (short ADRs)

1. **Monorepo: pnpm + Turborepo.** Same as Soundmade. One install, cached tasks, shared packages. The Go app has a tiny `package.json` that wraps `go` commands so `turbo run dev|build|lint|test` covers it too.
2. **Go for the API.** Small, fast, single static binary, great std library (`net/http`, `log/slog`, `crypto`).
3. **chi router.** Thin layer over `net/http` (route groups, middleware) instead of a big framework, so what you learn is plain Go.
4. **Layered modules (`handler -> service -> repository`).** Each feature is a folder; services depend on repository interfaces (ports), making them testable without a DB.
5. **pgx v5 + sqlc** instead of an ORM. You write SQL; sqlc generates type-safe Go. Fast, explicit, and the SQL is the documentation.
6. **goose migrations, embedded.** Plain SQL files with `-- +goose Up/Down`, compiled into the binary (`cmd/migrate`).
7. **JWT access (15 min) + opaque rotating refresh tokens (hashed in DB).** Stateless checks on every request, revocable sessions, reuse detection via `family_id`.
8. **OAuth via `golang.org/x/oauth2`**; Apple endpoint declared manually and its client secret generated as an ES256 JWT.
9. **Passkeys via `go-webauthn/webauthn`.** The maintained, spec-complete Go library.
10. **E2E encryption: Argon2id + XChaCha20-Poly1305 using `@noble/*`.** Audited, pure JS, works the same in browsers, Node and React Native (no native modules). Interface `VaultCrypto` lets mobile swap in a native implementation later for speed.
11. **TOTP computed on device** (RFC 6238), verified against the RFC's vectors.
12. **Next.js 16 App Router + Tailwind v4** for web; `transpilePackages` consumes TS source from workspace packages (no build step for packages).
13. **Expo SDK 58 + expo-router.** File-based routing like Next, EAS for builds, SecureStore (Keychain/Keystore) for tokens.
14. **TypeScript pinned to 5.9.3.** TS 7 / 6 are out, but `typescript-eslint` support lags; Expo's `expo install --check` suggests ~6.0.3 and that can be bumped once lint tooling supports it.
15. **Postgres 16 only in Docker Compose.** No Redis/Mailpit yet: nothing needs them. WebAuthn challenges can go in a table or Redis later.
16. **Conventional commits** via husky + commitlint + commitizen, like Soundmade.
17. **OAuth state, PKCE verifier and nonce stored server-side** (`oauth_states`), not in cookies. Works with Apple's cross-site `form_post` without `SameSite=None` cookies, and each attempt is single-use.
18. **One-time login code instead of tokens in the redirect URL.** URLs leak into history, logs and `Referer`.
19. **`coreos/go-oidc` for id_token verification** (JWKS fetch + cache, signature, expiry); we check issuer, audience list and nonce ourselves so one verifier accepts web + iOS + Android client ids.
20. **Link accounts by email only when the provider verified it.** Otherwise 409. Facebook never links by email.
21. **Remote sign-out revokes refresh tokens, not access tokens.** Access tokens live ≤ 15 min; a deny-list would add a DB hit to every request. Revisit if needed.
22. **Folders are encrypted items** (`kind = folder`) so the server learns nothing about how you organize accounts, and folders sync for free.
23. **Strict versioning (`server + 1`) for sync.** Simple to reason about, detects every concurrent edit; merging is the client's job because only the client can decrypt.
24. **Full WebAuthn credential stored as JSONB** next to typed columns: the library's struct evolves, and we keep flags/attestation needed for future checks.
25. **`go-chi/httprate` per-IP rate limiting** in-process. Fine for one instance; move to Redis-backed limits when running several.
26. **`DEV_AUTH` dev-only token minting**, refused when `APP_ENV=production`, to test protected routes with curl without OAuth apps.
27. **Software authenticator in tests** (`internal/app/softauthn_test.go`) to exercise the real passkey ceremonies end to end without a browser.
