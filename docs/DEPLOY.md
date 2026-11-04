# Deploying Bloom (free): Vercel + Neon

This guide puts the **Go API** on Vercel as a serverless function and the **database** on Neon
(free Postgres), then deploys the **web app** as a second Vercel project. Everything here fits the
free plans (Vercel Hobby is for personal, non-commercial projects — fine for this showcase).

```
browser / phone ──► Vercel project "bloom-api" (apps/server, Go function, region sin1)
                         │  pooled connection
                         ▼
                    Neon Postgres (Singapore, ap-southeast-1)
browser ──► Vercel project "bloom-web" (apps/web, Next.js)
```

> Nothing in this guide is done automatically. You run each step yourself. Never paste secret
> values into chat, commits or screenshots — only into the Vercel / Neon dashboards.

---

## How the API runs on Vercel (the short version)

- Locally nothing changes: `pnpm dev` still runs `cmd/api`, a normal long-running server on :8787.
- On Vercel there is no long-running server. Vercel calls the function `Handler` in
  `apps/server/api/index.go` once per request.
- `apps/server/vercel.json` rewrites every path (`/(.*)`) to that function, so `/v1/health`,
  `/v1/auth/...` and the rest keep their URLs.
- The first request on a fresh instance ("cold start") loads the config, opens a small database
  pool (4 connections) and builds the router. Later requests reuse them. If the database is
  still waking up, that request gets a friendly 503 and the next one retries.
- `api/index.go` imports `pkg/serverless`, not `internal/app`. Vercel compiles `api/` in a
  generated wrapper package, and Go only allows `internal/` imports from inside the module tree.
- Only `public/robots.txt` is served as a static file; the Go source is never public.

## Background jobs

The server had **no** background goroutines or timers (only the HTTP server itself), so nothing
broke. Short-lived rows (expired OAuth states, one-time login codes, passkey challenges, old
sessions) were never cleaned up, though, so there is now one maintenance endpoint:

- `GET /v1/internal/cleanup` deletes expired rows. It only exists when `CRON_SECRET` is set and
  only answers requests with `Authorization: Bearer <CRON_SECRET>`.
- `vercel.json` has a **daily** Vercel Cron (Hobby allows one run a day): `0 3 * * *` = 03:00
  UTC = 09:00 in Dhaka. Vercel sends the `CRON_SECRET` header for you automatically.
- Run it by hand any time: `curl -H "Authorization: Bearer $CRON_SECRET" https://<api>/v1/internal/cleanup`.

Rate limiting (30 sign-in requests per minute per IP) is kept in memory, so on serverless each
warm instance counts separately. It still slows down abuse, just less strictly.

---

## Step 1 — Create the database on Neon

1. Sign up at <https://neon.tech> (free plan, no card).
2. **Create project** → name `bloom` → Postgres version: latest → **Region: AWS Asia Pacific
   (Singapore) `ap-southeast-1`** (closest to Vercel `sin1` and to Dhaka).
3. On the project dashboard click **Connect**. You'll see two kinds of connection string:
   - **Pooled** (host contains `-pooler`) → use this for Vercel (`DATABASE_URL`).
   - **Direct** (no `-pooler`) → use this for running migrations from your Mac.
     Both end with `?sslmode=require`. Keep them in your password manager.

Why pooled? Every serverless instance opens its own connections; Neon's pooler (PgBouncer in
transaction mode) shares a few real connections between them. Our code notices the `-pooler`
host and switches pgx to `QueryExecModeExec` (no named prepared statements), which works with
PgBouncer and with all sqlc queries.

## Step 2 — Run the migrations against Neon (from your Mac)

Migrations are **not** run on cold start. You run them once, and again whenever you add a file
in `apps/server/migrations/`:

```bash
cd ~/pg/authenticator/apps/server
# Paste the DIRECT (non-pooler) URL between the quotes. The leading space keeps it out of
# your shell history (zsh: setopt HIST_IGNORE_SPACE).
 DATABASE_URL='postgres://...neon.tech/neondb?sslmode=require' go run ./cmd/migrate up
 DATABASE_URL='postgres://...neon.tech/neondb?sslmode=require' go run ./cmd/migrate status
```

Real environment variables win over `apps/server/.env`, so this never touches your local
database.

## Step 3 — Create the API project on Vercel

1. Sign up at <https://vercel.com> with GitHub (Hobby plan).
2. **Add New → Project** → import `urmirahman/authenticator` (allow Vercel access to the private repo).
3. **Project name:** `bloom-api`. **Root Directory:** `apps/server`. Framework preset: **Other**.
   Leave build/install/output settings alone — `vercel.json` sets them (no build step, static
   folder `public/`).
4. Add the environment variables below (Settings → Environment Variables, scope **Production**,
   and Preview if you want preview deployments to work).
5. **Deploy.** The URL looks like `https://bloom-api-xxxx.vercel.app`.
6. Check it: open `https://<api-url>/v1/health` → `{"status":"ok"}`.
7. Region: `vercel.json` asks for `sin1` (Singapore). Hobby allows one region; confirm under
   Settings → Functions → Function Region.

### API environment variables (names only — values go in the Vercel dashboard)

| Name                     | Required     | What it is for                                                                                |
| ------------------------ | ------------ | --------------------------------------------------------------------------------------------- |
| `APP_ENV`                | yes          | `production`. Turns on strict checks (JWT_SECRET required, DEV_AUTH refused, HSTS).           |
| `DATABASE_URL`           | yes          | Neon **pooled** connection string (host has `-pooler`, `sslmode=require`).                    |
| `JWT_SECRET`             | yes          | Signs access tokens. New random value: `openssl rand -base64 48`. Never reuse the local one.  |
| `PUBLIC_URL`             | yes          | The API's own URL, e.g. `https://bloom-api-xxxx.vercel.app`. Used for OAuth callbacks.        |
| `ALLOWED_ORIGINS`        | yes          | Web app origin(s) allowed by CORS, comma-separated, e.g. `https://bloom-web-xxxx.vercel.app`. |
| `ALLOWED_REDIRECTS`      | yes          | Where the browser may go after Google sign-in (prefix match), usually the same web URL.       |
| `GOOGLE_CLIENT_ID`       | yes          | Google OAuth **web** client id (same one as now).                                             |
| `GOOGLE_CLIENT_SECRET`   | yes          | Its secret.                                                                                   |
| `GOOGLE_EXTRA_AUDIENCES` | for mobile   | iOS/Android client ids whose id_tokens are also accepted.                                     |
| `WEBAUTHN_RP_ID`         | for passkeys | The web app's bare domain, e.g. `bloom-web-xxxx.vercel.app` (no `https://`).                  |
| `WEBAUTHN_RP_NAME`       | optional     | Name shown in the passkey prompt, e.g. `Bloom`.                                               |
| `WEBAUTHN_RP_ORIGINS`    | for passkeys | Full web origin, e.g. `https://bloom-web-xxxx.vercel.app`.                                    |
| `CRON_SECRET`            | recommended  | Random string (`openssl rand -hex 32`); protects the daily cleanup.                           |
| `ACCESS_TOKEN_TTL`       | optional     | Default `15m`.                                                                                |
| `REFRESH_TOKEN_TTL`      | optional     | Default `720h` (30 days).                                                                     |
| `DB_MAX_CONNS`           | optional     | Default 4 on Vercel.                                                                          |
| `DB_POOLER`              | optional     | Force pooler mode if your pooled host has no `-pooler` in its name.                           |
| `DEV_AUTH`               | no           | Leave unset. It is refused in production.                                                     |
| `FACEBOOK_*`, `APPLE_*`  | no           | Leave unset (Google-only launch, ADR 39).                                                     |

Don't set `PORT` (Vercel ignores it). The API sets no cookies: it uses bearer tokens, so there are
no cookie settings to change. CORS and OAuth redirects come from `ALLOWED_ORIGINS` and
`ALLOWED_REDIRECTS`.

### Google Cloud changes

In Google Cloud → Credentials → your **web** OAuth client:

- **Authorized redirect URIs:** add `https://<api-url>/v1/auth/oauth/google/callback`.
- **Authorized JavaScript origins:** add `https://<web-url>`.

## Step 4 — Deploy the web app (second Vercel project)

1. **Add New → Project** → the same repo again.
2. **Project name:** `bloom-web`. **Root Directory:** `apps/web`. Framework: **Next.js**
   (detected). Vercel detects pnpm and Turborepo and builds the shared `packages/*` for you.
3. Environment variables:

| Name                   | What it is for                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL`  | The API URL from step 3, e.g. `https://bloom-api-xxxx.vercel.app` (same format as your local value). |
| `NEXT_PUBLIC_SITE_URL` | This web app's own URL (Open Graph, sitemap, security.txt).                                          |
| `NEXT_PUBLIC_DEV_AUTH` | Leave unset.                                                                                         |

4. Deploy, then put the web URL into the API's `ALLOWED_ORIGINS`, `ALLOWED_REDIRECTS`,
   `WEBAUTHN_RP_ID` and `WEBAUTHN_RP_ORIGINS`, and **redeploy the API** (env changes only apply
   to new deployments).

`NEXT_PUBLIC_*` values are baked in at build time, so redeploy the web app after changing them.

## Step 5 — Point the mobile app at it

In `apps/mobile/.env` set `EXPO_PUBLIC_API_URL` to the API URL and `EXPO_PUBLIC_WEB_URL` to the web
URL, then restart Metro: `npx expo start --dev-client --clear`.

---

## Limits to know about

- **Cold starts:** the first request after a quiet period takes about a second longer, and Neon's
  free database also sleeps after ~5 minutes idle (first query wakes it).
- **10-second function limit** (set in `vercel.json`). Every endpoint is a short database call.
- **Cron:** Hobby runs it once a day, at some point within the scheduled hour.
- **Go version:** `go.mod` says Go 1.27; Vercel's Go runtime installs the version from `go.mod`.
  If a deploy fails with a Go version error, check Vercel's supported Go versions.
- **Rate limit** is per instance (see above).

## Troubleshooting

- `{"error":"starting"}` (503): the function couldn't reach the database. Check `DATABASE_URL`
  and that the Neon project isn't suspended.
- CORS error in the browser: the web origin is missing from `ALLOWED_ORIGINS` (exact match, no
  trailing slash), or the API wasn't redeployed after changing it.
- Google "redirect_uri_mismatch": add the callback URL from step 3 in Google Cloud.
- `relation "users" does not exist`: run step 2's migrations against Neon.
