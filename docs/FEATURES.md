# Features

Google Authenticator parity plus extras. **Phase** = when it ships; **Status**: ✅ done (server), 🟡 in progress / partial, ⬜ planned.
"Server" status refers to the Go API; client apps (web/mobile) catch up afterwards.

## Phases

1. **Sign-in, sessions, devices**
2. **Encrypted vault, accounts, sync**
3. **Passkeys, security policies, activity log**
4. **Import/export and extras**

## Core

| Feature                                                             | Phase | Status | Notes                                                        |
| ------------------------------------------------------------------- | ----- | ------ | ------------------------------------------------------------ |
| Add account by QR (`otpauth://`)                                    | 2     | 🟡     | Parser in `@repo/crypto`; camera screen on mobile            |
| Manual secret entry                                                 | 2     | ⬜     | Client-only form                                             |
| TOTP 6/8 digits, 30 s, countdown ring                               | 2     | 🟡     | RFC 6238 in `@repo/crypto`, tested                           |
| HOTP (counter) accounts                                             | 2     | 🟡     | `hotp()` exists; counter is stored inside the encrypted item |
| Tap to copy + next-code preview                                     | 2     | ⬜     | Client                                                       |
| Search, rename, reorder, delete                                     | 2     | ⬜     | Encrypted item fields + sync                                 |
| Issuer icons                                                        | 4     | ⬜     | Bundled icon set keyed by issuer                             |
| Sign in with Google / Facebook / Apple (backup + cross-device sync) | 1     | ⬜     | Server OAuth + mobile id_token exchange                      |
| Transfer to a new phone via export QR batch                         | 4     | ⬜     | Encrypted, chunked QR codes                                  |
| Fully offline                                                       | 2     | 🟡     | Codes computed on device; sync is optional                   |

## Security

| Feature                                          | Phase | Status | Notes                                           |
| ------------------------------------------------ | ----- | ------ | ----------------------------------------------- |
| E2E encrypted sync (server sees only ciphertext) | 2     | ⬜     | Argon2id + XChaCha20-Poly1305                   |
| Master password                                  | 2     | ⬜     | Derives the key that wraps the vault key        |
| App lock (Face ID / Touch ID / PIN)              | 3     | ⬜     | Client (`expo-local-authentication`)            |
| Passkey sign-in                                  | 3     | ⬜     | go-webauthn                                     |
| Screenshot blocking + hidden in app switcher     | 3     | ⬜     | Client (`expo-screen-capture`, privacy overlay) |
| Auto-lock timer, clipboard auto-clear            | 3     | ⬜     | Client                                          |
| Signed-in devices list + remote sign-out         | 1     | ⬜     | Revokes the device's refresh-token families     |
| Activity log (sign-ins, new devices, exports)    | 3     | ⬜     | `audit_log` + paginated endpoint                |

## Extras

| Feature                                         | Phase | Status | Notes                                                            |
| ----------------------------------------------- | ----- | ------ | ---------------------------------------------------------------- |
| Folders / tags                                  | 2     | ⬜     | Encrypted folder names; item→folder link stays inside ciphertext |
| Encrypted backup export / import                | 4     | ⬜     | Password-protected file                                          |
| Import from Google Authenticator / Authy / 2FAS | 4     | ⬜     | `otpauth-migration://` protobuf, 2FAS JSON                       |
| Widgets + watch                                 | 4     | ⬜     | iOS/Android widgets, watchOS/Wear OS                             |
| Browser extension autofill                      | 4     | ⬜     | Reuses web crypto + api-client                                   |
| Light / dark themes                             | 4     | ⬜     | Client                                                           |
