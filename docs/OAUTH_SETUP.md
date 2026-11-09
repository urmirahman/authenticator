# OAuth setup (Google)

> **Launch decision (ADR 39): Google is the only sign-in option on web and mobile.** The server
> still contains Facebook and Apple provider code, but a provider is only registered when its
> client id is set, so leave `FACEBOOK_*` and `APPLE_*` empty. Their sections below are kept for later.
>
> **Mobile:** the "Continue with Google" button always shows. If the current platform's client id
> is missing it shows "Google sign-in isn't set up on this device yet" instead of signing in.
> iOS needs `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; Android needs `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
> **and** `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. `EXPO_PUBLIC_*` values are baked in when Metro bundles,
> so after editing `apps/mobile/.env` restart Metro with `npx expo start --dev-client --clear`.

The server reads everything from environment variables (`apps/server/.env.example`).
A provider is **switched off** until its client id is set; `/start` then answers 404.
For local work you can skip all of this and use `DEV_AUTH=true` + `POST /v1/dev/token`.

Callback URLs the server uses (replace the host in production):

| Provider | Callback URL                                                                                  |
| -------- | --------------------------------------------------------------------------------------------- |
| Google   | `http://localhost:8787/v1/auth/oauth/google/callback`                                         |
| Facebook | `http://localhost:8787/v1/auth/oauth/facebook/callback`                                       |
| Apple    | `https://<your-https-host>/v1/auth/oauth/apple/callback` (Apple requires HTTPS, no localhost) |

Also set `ALLOWED_REDIRECTS` to where the web app receives `?code=` (e.g. `http://localhost:3001/auth/callback`).

## Google

1. <https://console.cloud.google.com> → create a project.
2. **APIs & Services → OAuth consent screen**: External, app name, support email, scopes `openid email profile`. Add yourself as a test user.
3. **Credentials → Create credentials → OAuth client ID → Web application**.
   - Authorized redirect URI: the Google callback above.
   - Copy **Client ID** → `GOOGLE_CLIENT_ID`, **Client secret** → `GOOGLE_CLIENT_SECRET`.
4. For mobile, create an **iOS** client (bundle id `dev.urmirahman.authenticator`) and later an **Android** client (package `dev.urmirahman.authenticator` + SHA-1 of your signing key; get it with `cd apps/mobile/android && ./gradlew signingReport` after a prebuild).
   Put their client ids in `GOOGLE_EXTRA_AUDIENCES` (comma-separated) so their `id_token`s are accepted.
   (With `webClientId` set, Google usually issues the mobile id_token for the web client id, which is already accepted; the extra audiences cover the case where it doesn't.)

### Try it on the web

1. `apps/server/.env`: `GOOGLE_CLIENT_ID` (web id), `GOOGLE_CLIENT_SECRET` (web secret), `ALLOWED_REDIRECTS` includes `http://localhost:3001/auth/callback`.
2. The web client in Google Cloud has the redirect URI `http://localhost:8787/v1/auth/oauth/google/callback`, and your Google account is a **test user** on the consent screen.
3. `pnpm -F @authenticator/server dev`, then `pnpm -F @authenticator/web dev` → http://localhost:3001/sign-in → **Continue with Google**.
   Flow: web → API `/start` → Google → API `/callback` (exchanges the code with the secret) → `http://localhost:3001/auth/callback?code=…` → tokens.

### Try it on iOS (mobile)

The app uses `@react-native-google-signin/google-signin` (ADR 34), so it needs a **development build**, not Expo Go.

1. `apps/mobile/.env`: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` (iOS id) and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (web id). `app.json` hardcodes the matching URL scheme `com.googleusercontent.apps.<…>` in the `@react-native-google-signin/google-signin` plugin — update it there if the iOS client id changes.
2. `EXPO_PUBLIC_API_URL`: `http://localhost:8787` works in the iOS Simulator; on a real iPhone use your Mac's LAN IP (and the API must listen on it).
3. Server: `GOOGLE_CLIENT_ID` = web id, `GOOGLE_EXTRA_AUDIENCES` = iOS id (no client secret needed for mobile: the app sends an id_token).
4. `cd apps/mobile && npx expo prebuild --clean && npx expo run:ios`. Re-run prebuild whenever the iOS client id changes.
5. Tap **Continue with Google**. If the required client ids are missing, the button shows a setup message.

### Try it on Android (mobile)

1. Register an Android OAuth client in the same Google Cloud project as the web client, with package
   `dev.urmirahman.authenticator` and the SHA-1 of the certificate signing the installed app.
   Development, EAS and Google Play builds can use different certificates; register each one you use.
2. For local builds, set `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` and
   `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `apps/mobile/.env`. The EAS development, preview and
   production profiles also include these public client ids in `apps/mobile/eas.json`.
3. The native SDK has no `androidClientId` option. It identifies the Android client using the package
   name and signing certificate; `webClientId` requests an ID token for the server's web client ID.
4. Run `pnpm -F @authenticator/mobile android`, or create a new EAS Android build with the desired
   profile. Restart Metro with `npx expo start --dev-client --clear` after changing local env values.
5. Tap **Continue with Google** and complete the account picker.

## Facebook (Meta) — not used at launch

1. <https://developers.facebook.com> → **My Apps → Create app** → use case "Authenticate and request data from users with Facebook Login".
2. **Facebook Login → Settings**: Valid OAuth Redirect URIs = the Facebook callback above.
3. **App settings → Basic**: **App ID** → `FACEBOOK_CLIENT_ID`, **App secret** → `FACEBOOK_CLIENT_SECRET`.
4. Request the `email` permission. Note: we never link accounts by a Facebook email (Facebook doesn't say it is verified).
5. Mobile: the native SDK gives an access token → `POST /v1/auth/oauth/facebook/token {"accessToken": "..."}`.

## Apple (Sign in with Apple) — not used at launch

Needs a paid Apple Developer account.

1. **Certificates, Identifiers & Profiles → Identifiers → App IDs**: your app (`dev.urmirahman.authenticator`), enable **Sign in with Apple**.
2. **Identifiers → Services IDs → +**: e.g. `dev.urmirahman.authenticator.web`. Enable Sign in with Apple → Configure:
   primary App ID = the one above, domain = your API host, return URL = the Apple callback (HTTPS).
   This Services ID is `APPLE_CLIENT_ID`.
3. **Keys → +**: enable Sign in with Apple, download the **`.p8`** (only once!). Note the **Key ID** → `APPLE_KEY_ID`.
4. Your **Team ID** (top-right of the portal) → `APPLE_TEAM_ID`.
5. Paste the `.p8` contents into `APPLE_PRIVATE_KEY` (keep the `-----BEGIN PRIVATE KEY-----` lines).
6. `APPLE_EXTRA_AUDIENCES` = the iOS bundle id, so tokens from the native iOS button are accepted.

Why the `.p8`? Apple has no static client secret. The server signs a short-lived ES256 JWT with that key
for every token exchange (`pkg/applesecret`). Apple also sends the user's **name only on the first sign-in**;
we save it then.

To test Apple locally, expose the API over HTTPS (e.g. `cloudflared tunnel --url http://localhost:8787`) and use that host.

## Passkeys (WebAuthn)

- `WEBAUTHN_RP_ID` = the bare domain (no scheme/port), e.g. `localhost` or `auth.example.com`.
- `WEBAUTHN_RP_ORIGINS` = the exact origins allowed, e.g. `http://localhost:3001`.
- iOS: host `/.well-known/apple-app-site-association` with `webcredentials` for the app; Android: `/.well-known/assetlinks.json`.
