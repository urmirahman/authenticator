import { createApiClient } from '@repo/api-client';
import type { AuthTokens } from '@repo/types';
import { Platform } from 'react-native';
import { session } from '@/features/session/session';

/** On a real phone, set EXPO_PUBLIC_API_URL to your Mac's LAN IP (localhost is the phone itself). */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';
export const DEV_AUTH = process.env.EXPO_PUBLIC_DEV_AUTH === 'true';

let refreshing: Promise<boolean> | null = null;

/** Same idea as the web app: on 401, swap the refresh token once and retry. */
async function refreshTokens(): Promise<boolean> {
  const rt = await session.refreshToken();
  if (!rt) return false;
  refreshing ??= fetch(`${API_URL}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  })
    .then(async (res) => {
      if (!res.ok) {
        await session.clear();
        return false;
      }
      await session.save((await res.json()) as AuthTokens);
      return true;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

const fetchWithRefresh: typeof fetch = async (input, init) => {
  const res = await fetch(input, init);
  if (res.status !== 401 || String(input).includes('/v1/auth/')) return res;
  if (!(await refreshTokens())) return res;
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${await session.accessToken()}`);
  return fetch(input, { ...init, headers });
};

export const api = createApiClient({
  baseUrl: API_URL,
  getAccessToken: () => session.accessToken(),
  getDeviceId: () => session.deviceId(),
  fetch: fetchWithRefresh,
});

export async function completeSignIn(tokens: AuthTokens) {
  await session.save(tokens);
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const device = await api.devices.register({
    name: `${Platform.OS === 'ios' ? 'iPhone' : 'Android'} app`,
    platform,
    publicKey: '',
  });
  await session.setDeviceId(device.id);
}

export async function signOut() {
  const rt = await session.refreshToken();
  if (rt) await api.auth.logout(rt).catch(() => undefined);
  await session.clear();
}
