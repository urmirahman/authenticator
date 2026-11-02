# Mobile app (Expo)

Run: `cp .env.example .env`, set `EXPO_PUBLIC_DEV_AUTH=true` (and your Mac's LAN IP in `EXPO_PUBLIC_API_URL`
for a real phone), start the API with `DEV_AUTH=true`, then `pnpm -F @authenticator/mobile dev`.
Camera, biometrics and screenshot blocking need a development build (`pnpm -F @authenticator/mobile ios` /
`android`), not Expo Go.

## Tour

```
app/                      routes (expo-router): index, (auth)/sign-in, (app)/codes|add-account|edit-account|settings|backups|transfer|devices|activity
src/lib/polyfills.ts      crypto.getRandomValues / randomUUID for Hermes (import first!)
src/lib/api.ts            shared api-client + token refresh, tokens in SecureStore
src/features/
  session/                SecureStore token storage
  vault/                  vault-store (state + sync), unlock screen, add account (camera QR + manual)
  totp/                   live codes, countdown ring, HOTP "Next", copy with 30 s clipboard clear
  security/app-lock.tsx   screenshot blocking, app-switcher cover, biometric re-unlock, 5-min hard lock
  backup/ devices/ activity/ transfer/   parity screens with the web app
  settings/               preferences (SecureStore) + settings screen (change password, biometric toggle, export)
  security/biometric-key.ts   opt-in biometric unlock (see ADR 32)
  auth/
src/components/           ui.tsx (Button, Input, Section, Choice), theme.ts (light/dark colors), prompt.tsx
```

Gestures: tap a code to copy, long-press it to edit, long-press a folder chip to rename/delete.

All crypto is shared with the web app through `@repo/vault`, `@repo/crypto` and `@repo/importers`.
