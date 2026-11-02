# Mobile app (Expo)

Run: `cp .env.example .env`, set `EXPO_PUBLIC_DEV_AUTH=true` (and your Mac's LAN IP in `EXPO_PUBLIC_API_URL`
for a real phone), start the API with `DEV_AUTH=true`, then `pnpm -F @authenticator/mobile dev`.
Camera, biometrics and screenshot blocking need a development build (`pnpm -F @authenticator/mobile ios` /
`android`), not Expo Go.

## Tour

```
app/                      routes (expo-router): index (redirect), (auth)/sign-in, (app)/codes|add-account|settings
src/lib/polyfills.ts      crypto.getRandomValues / randomUUID for Hermes (import first!)
src/lib/api.ts            shared api-client + token refresh, tokens in SecureStore
src/features/
  session/                SecureStore token storage
  vault/                  vault-store (state + sync), unlock screen, add account (camera QR + manual)
  totp/                   live codes, countdown ring, HOTP "Next", copy with 30 s clipboard clear
  security/app-lock.tsx   screenshot blocking, app-switcher cover, biometric re-unlock, 5-min hard lock
  auth/ settings/
```

All crypto is shared with the web app through `@repo/vault`, `@repo/crypto` and `@repo/importers`.
