# Features

Google Authenticator parity plus extras. **Phase** = when it ships. **Status**: ✅ done, 🟡 partial, ⬜ planned.
"✅ server" means the Go API side is done and tested; the web/mobile UI comes next.

## Phases

1. **Sign-in, sessions, devices** — server ✅
2. **Encrypted vault, accounts, sync** — server ✅
3. **Passkeys, security policies, activity log** — server ✅ (app lock, screenshot blocking etc. are client features)
4. **Import/export and extras** — server ✅, parsers ✅, UI in progress

## Core

| Feature                                                             | Phase | Status    | Notes                                                                                                    |
| ------------------------------------------------------------------- | ----- | --------- | -------------------------------------------------------------------------------------------------------- |
| Add account by QR (`otpauth://`)                                    | 2     | 🟡        | Parser in `@repo/crypto`; camera screen on mobile                                                        |
| Manual secret entry                                                 | 2     | ⬜        | Client-only form                                                                                         |
| TOTP 6/8 digits, 30 s, countdown ring                               | 2     | 🟡        | RFC 6238 in `@repo/crypto`, tested; UI shell exists                                                      |
| HOTP (counter) accounts                                             | 2     | 🟡        | `hotp()` exists; counter lives inside the encrypted item, synced via versions                            |
| Tap to copy + next-code preview                                     | 2     | ⬜        | Client                                                                                                   |
| Search, rename, reorder, delete                                     | 2     | 🟡        | Server: update + tombstones done; search/order happen client-side on decrypted data                      |
| Issuer icons                                                        | 4     | ✅ data   | Curated map in `@repo/importers` (Simple Icons slug + color, initials fallback)                          |
| Sign in with Google / Facebook / Apple (backup + cross-device sync) | 1     | ✅ server | PKCE + nonce, JWKS-verified id_tokens, mobile token exchange. Needs OAuth apps ([setup](OAUTH_SETUP.md)) |
| Transfer to a new phone via export QR batch                         | 4     | 🟡        | `toGoogleMigration()` builds QR batches; UI pending                                                      |
| Fully offline                                                       | 2     | 🟡        | Codes computed on device; client-generated item ids allow offline creates                                |

## Security

| Feature                                          | Phase | Status    | Notes                                                                                 |
| ------------------------------------------------ | ----- | --------- | ------------------------------------------------------------------------------------- |
| E2E encrypted sync (server sees only ciphertext) | 2     | ✅ server | Push/pull, per-item versions, conflicts, tombstones; crypto helpers in `@repo/crypto` |
| Master password                                  | 2     | 🟡        | Server stores KDF params + wrapped key and supports re-key; client UI pending         |
| App lock (Face ID / Touch ID / PIN)              | 3     | ⬜        | Client (`expo-local-authentication`)                                                  |
| Passkey sign-in                                  | 3     | ✅ server | Register / login / list / rename / delete; tested with a software authenticator       |
| Screenshot blocking + hidden in app switcher     | 3     | ⬜        | Client (`expo-screen-capture`, privacy overlay)                                       |
| Auto-lock timer, clipboard auto-clear            | 3     | ⬜        | Client                                                                                |
| Signed-in devices list + remote sign-out         | 1     | ✅ server | Revoking a device revokes its refresh tokens                                          |
| Activity log (sign-ins, new devices, exports)    | 3     | ✅ server | `GET /v1/activity`; exports logged once Phase 4 lands                                 |
| Rate limiting, security headers, request ids     | 3     | ✅ server | 30/min per IP on sign-in endpoints                                                    |

## Extras

| Feature                                         | Phase | Status     | Notes                                                                      |
| ----------------------------------------------- | ----- | ---------- | -------------------------------------------------------------------------- |
| Folders / tags                                  | 2     | ✅ server  | Folders are encrypted items (`kind = folder`)                              |
| Encrypted backup export / import                | 4     | ✅ server  | `/v1/backups` stores ciphertext only; client encryption + UI pending       |
| Import from Google Authenticator / Authy / 2FAS | 4     | ✅ parsers | `@repo/importers`: Google migration, 2FAS, Aegis, otpauth lists (23 tests) |
| Widgets + watch                                 | 4     | ⬜         | iOS/Android widgets, watchOS/Wear OS                                       |
| Browser extension autofill                      | 4     | ⬜         | Reuses web crypto + api-client                                             |
| Light / dark themes                             | 4     | ⬜         | Client                                                                     |

## Web app status (apps/web)

| Feature                                                | Status                                   |
| ------------------------------------------------------ | ---------------------------------------- |
| Sign in: Google / Apple / Facebook, passkey, dev login | ✅ (OAuth needs your provider apps)      |
| Master password setup + unlock (Argon2id in browser)   | ✅                                       |
| Live codes, countdown ring, tap to copy, issuer colors | ✅                                       |
| Add: secret key, QR image upload, paste/import         | ✅ (Google export, 2FAS, Aegis, otpauth) |
| Edit / delete accounts, folders, search                | ✅                                       |
| Sync (pull every 30 s + on tab focus, conflict notice) | ✅                                       |
| Devices (remote sign-out), activity log                | ✅                                       |
| Settings: auto-lock, clipboard clear, theme, passkeys  | ✅                                       |
| Download my data                                       | ✅                                       |
| Encrypted backup upload/restore UI                     | ⬜ (API + api-client ready)              |
| Change master password (rekey) UI                      | ⬜ (API ready)                           |
| HOTP codes                                             | ⬜ (imported and stored, not displayed)  |
| Transfer-to-phone QR display                           | ⬜ (`toGoogleMigration()` ready)         |
