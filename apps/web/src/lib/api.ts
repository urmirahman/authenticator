import { createApiClient } from '@repo/api-client';
import type { AuthTokens } from '@repo/types';
import { session } from '@/features/session/session';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
/** Shows the "dev login" form. Only works if the API runs with DEV_AUTH=true. */
export const DEV_AUTH = process.env.NEXT_PUBLIC_DEV_AUTH === 'true';

let refreshing: Promise<boolean> | null = null;

/** Swap the refresh token for a new pair. Shared promise so parallel 401s refresh only once. */
function refreshTokens(): Promise<boolean> {
  const rt = session.refreshToken();
  if (!rt) return Promise.resolve(false);
  refreshing ??= fetch(`${API_URL}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  })
    .then(async (res) => {
      if (!res.ok) {
        session.clear();
        return false;
      }
      session.save((await res.json()) as AuthTokens);
      return true;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * fetch wrapper: when the access token expired (401), refresh once and retry the same request.
 * Auth endpoints are skipped so a bad refresh token can't loop.
 */
const fetchWithRefresh: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  if (res.status !== 401 || String(input).includes('/v1/auth/')) return res;
  if (!(await refreshTokens())) return res;
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${session.accessToken()}`);
  return fetch(input, { ...init, headers });
};

export const api = createApiClient({
  baseUrl: API_URL,
  getAccessToken: () => session.accessToken(),
  getDeviceId: () => session.deviceId(),
  fetch: fetchWithRefresh,
});

/** Called right after any successful sign-in: store tokens and register this browser as a device. */
export async function completeSignIn(tokens: AuthTokens) {
  session.save(tokens);
  const ua = navigator.userAgent;
  const browser = /Firefox/.test(ua)
    ? 'Firefox'
    : /Edg/.test(ua)
      ? 'Edge'
      : /Chrome/.test(ua)
        ? 'Chrome'
        : /Safari/.test(ua)
          ? 'Safari'
          : 'Browser';
  const device = await api.devices.register({
    name: `${browser} (web)`,
    platform: 'web',
    publicKey: '',
  });
  session.setDeviceId(device.id);
}

export async function signOut() {
  const rt = session.refreshToken();
  if (rt) await api.auth.logout(rt).catch(() => undefined);
  session.clear();
}
