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

28. **Importers run on the client** (`packages/importers`): Google Authenticator migration (small hand-written protobuf reader), 2FAS, Aegis, otpauth lists. Secrets never reach the server in plaintext, so the server can't do imports.
29. **Encrypted backups are opaque blobs.** Server stores ciphertext + public KDF params (≤ 5 MiB, ≤ 20 per user). Downloads are audited.
30. **Issuer icons are a curated, bundled map** (issuer → Simple Icons slug + brand color, initials fallback). No favicon scraping: it would leak which services you use.
31. **"Download my data"** (`GET /users/me/export`) for transparency/GDPR; queries run in parallel with `errgroup`.

32. **Optional biometric unlock on mobile stores the raw vault key in the Keychain / Keystore.**
    - _How:_ `expo-secure-store` with `requireAuthentication: true` and `WHEN_PASSCODE_SET_THIS_DEVICE_ONLY`. The OS releases the key only after Face ID / fingerprint; it is excluded from backups and never leaves the device. Adding/removing a fingerprint or face invalidates it.
    - _Trade-off:_ convenience vs. a second way in. Anyone who passes the phone's biometrics (or, on some Android devices, a weaker class of biometric) can open the vault without the master password, and the key's safety now depends on the phone's secure hardware, not only on Argon2id. A stolen, unlocked-biometrics phone is the main risk.
    - _Mitigations:_ off by default, explicit opt-in toggle with an explanation; cleared on sign-out and on master password change (re-opt-in knowingly); if reading fails we fall back to the master password and delete the copy. Master password is still required on first setup and can always be used.
    - _Rejected:_ storing the master password itself (worse: it also unlocks other devices and backups if reused).
33. **App preferences, activity labels and folder filtering live in `@repo/vault`** so web and mobile behave the same; each platform only decides where to store preferences (localStorage vs SecureStore).

34. **Mobile Google sign-in uses `@react-native-google-signin/google-signin` (native SDK), not `expo-auth-session`.**
    - _Why:_ it shows the native Google account sheet (no browser pop-up), returns an `id_token` directly, works with Expo dev builds through its config plugin (iOS URL scheme from the reversed client id), and is actively maintained for current Expo SDKs. `expo-auth-session`'s Google provider is browser-based, needs redirect-URI juggling per platform, and Expo itself recommends the native library for Google.
    - _Cost:_ needs a development build (no Expo Go) and a prebuild whenever the iOS client id changes. We use the free "Original" API; no nonce is sent, so the server verifies signature, issuer, audience and expiry only (nonce is optional in `idtoken.Verify`).
    - _Server side:_ unchanged. `POST /v1/auth/oauth/google/token` with `{ idToken }`; the audience must be `GOOGLE_CLIENT_ID` or one of `GOOGLE_EXTRA_AUDIENCES`.

35. **Account deletion needs a confirmation phrase and a recent sign-in (re-auth).**
    - `DELETE /v1/users/me` with `{ "confirm": "DELETE" }`; the current session family must have started (a real sign-in, not a token refresh) within the last 10 minutes, otherwise `403 reauth_required`.
    - _Why:_ the server can't check the master password (it never sees it), so "re-auth" means signing in again with Google/Apple/passkey. A stolen refresh token alone can't destroy an account. The client UI additionally asks for the master password locally as a "are you really sure" step, which proves nothing to the server but prevents accidents.
    - Deletion cascades in Postgres (identities, sessions, devices, passkeys, vaults, items, sync log, backups, audit). Database backups age out on their own schedule (privacy policy TODO).

36. **Brand and design tokens live in `@repo/brand`; the product is "Bloom Authenticator".**
    - One TypeScript source (`tokens.ts`) feeds the mobile theme; `tokens.css` mirrors it as Tailwind v4 `@theme` + CSS variables for the web. A unit test fails if the two drift or if text/accent pairs miss WCAG AA contrast.
    - Screens use semantic names (`bg`, `surface`, `text`, `accent`, `danger`…) instead of raw colors, so light/dark and future re-theming touch one file.
    - Only user-facing names changed. The repo, package scopes (`@authenticator/*`), Expo slug/scheme and bundle id `dev.urmirahman.authenticator` stay, because OAuth clients and store records are tied to them.
    - Icons are SVG sources exported to PNG by `packages/brand/scripts/export-icons.mjs` (sharp), never hand-edited.

37. **Legal and help text lives in `@repo/content`, with explicit TODO placeholders.**
    - Web renders it as pages (Markdown via `marked`); mobile renders the FAQ natively and opens legal pages on the web (`EXPO_PUBLIC_WEB_URL`) so there is one published version.
    - Unknown facts (operator, address, emails, domain, jurisdiction, retention…) use `todo()`, which shows highlighted on the page; `pendingTodos()` lists them and a test keeps the list visible. The texts are drafts, not legal advice; a lawyer should review before launch.
    - No cookie banner: Bloom sets no cookies and uses no tracking; the cookie policy describes the browser storage it does use.
