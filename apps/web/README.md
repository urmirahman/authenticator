# Web app (Next.js)

Run: `cp .env.example .env.local`, set `NEXT_PUBLIC_DEV_AUTH=true` for local dev login, then `pnpm -F @authenticator/web dev` → http://localhost:3001 (API must run on :8787).

## Tour

```
src/
  app/                 routes only (thin): /sign-in, /auth/callback, /vault, /backups, /transfer, /devices, /activity, /settings
  components/          app shell (nav, sign-in guard, unlock gate) and small UI helpers
  lib/                 api client with auto token refresh, base64, WebAuthn JSON conversion
  features/
    session/           where tokens live (and why)
    auth/              sign-in card, passkey sign-in / registration
    vault/             vault-codec (pure crypto), vault-context (store + sync), unlock screen, main screen
    totp/              live code row, shared 1-second clock, copy + clipboard clear
    add-account/       Scan QR / Enter key dialog (import lives in Settings)
    backup/            backup-codec (backup password → Argon2id → XChaCha20) + backup screen
    transfer/          Google-style migration QR codes (warning + reveal)
    devices/ activity/ settings/   settings also has change master password + passkey rename
```

Data flow: master password → Argon2id (browser) → unwraps vault key → decrypts items pulled from `/v1/sync`.
The key lives only in memory; reload or auto-lock forgets it.

Tests: `pnpm -F @authenticator/web test` (codec + WebAuthn JSON). With the API running with DEV_AUTH,
`API_E2E_URL=http://localhost:8787 pnpm -F @authenticator/web test` also runs a live end-to-end vault test.

## Public pages and branding

- `/` is the landing page (signed-in visitors go straight to `/codes`). Public pages live in `src/app/(public)/` and render text from `@repo/content`.
- Legal facts (operator, contact email, jurisdiction, domain, dates) live in one place: `packages/content/src/site.ts` (`CONTACT_EMAIL`, `site`). Unknown values can be wrapped in `todo()` and render highlighted.
- Set `NEXT_PUBLIC_SITE_URL` (your real domain) so Open Graph, sitemap and `security.txt` use absolute URLs.
- Colors come from `@repo/brand/tokens.css`: use `bg-surface`, `text-fg`, `text-muted`, `bg-accent`… not raw Tailwind colors.
- Regenerate icons after changing the logo: `pnpm -F @repo/brand export-icons`.
