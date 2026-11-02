import type {
  AuthTokens,
  Device,
  OAuthProvider,
  Session,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
  User,
  Vault,
} from '@repo/types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Where tokens live differs per platform: memory/cookie on web, SecureStore on mobile. */
  getAccessToken?: () => string | null | Promise<string | null>;
  fetch?: typeof fetch;
}

/** Tiny typed client shared by web and mobile. One method per API endpoint. */
export function createApiClient({ baseUrl, getAccessToken, fetch: f = fetch }: ApiClientOptions) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await getAccessToken?.();
    const res = await f(`${baseUrl}/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as {
        error?: { code: string; message: string };
      } | null;
      throw new ApiError(
        res.status,
        err?.error?.code ?? 'unknown',
        err?.error?.message ?? res.statusText,
      );
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  return {
    health: () => request<{ status: string }>('GET', '/health'),
    auth: {
      /** URL to send the browser to; the server handles the OAuth dance and redirects back. */
      oauthStartUrl: (provider: OAuthProvider, redirectUri: string) =>
        `${baseUrl}/v1/auth/oauth/${provider}/start?redirect_uri=${encodeURIComponent(redirectUri)}`,
      /** Mobile: exchange a native id_token (Google/Apple SDK) for our session. */
      exchangeIdToken: (provider: OAuthProvider, idToken: string) =>
        request<Session>('POST', `/auth/oauth/${provider}/token`, { idToken }),
      refresh: (refreshToken: string) =>
        request<AuthTokens>('POST', '/auth/refresh', { refreshToken }),
      logout: (refreshToken: string) => request<void>('POST', '/auth/logout', { refreshToken }),
    },
    passkeys: {
      beginLogin: () =>
        request<{ challengeId: string; options: unknown }>('POST', '/passkeys/login/begin'),
      finishLogin: (challengeId: string, credential: unknown) =>
        request<Session>('POST', '/passkeys/login/finish', { challengeId, credential }),
      beginRegister: () =>
        request<{ challengeId: string; options: unknown }>('POST', '/passkeys/register/begin'),
      finishRegister: (challengeId: string, credential: unknown) =>
        request<void>('POST', '/passkeys/register/finish', { challengeId, credential }),
    },
    users: { me: () => request<User>('GET', '/users/me') },
    devices: {
      list: () => request<Device[]>('GET', '/devices'),
      register: (d: Pick<Device, 'name' | 'platform' | 'publicKey'>) =>
        request<Device>('POST', '/devices', d),
      revoke: (id: string) => request<void>('DELETE', `/devices/${id}`),
    },
    vaults: {
      list: () => request<Vault[]>('GET', '/vaults'),
      create: (v: Pick<Vault, 'name' | 'kdf' | 'wrappedKey'>) =>
        request<Vault>('POST', '/vaults', v),
    },
    sync: {
      pull: (vaultId: string, cursor?: string) =>
        request<SyncPullResponse>(
          'GET',
          `/sync/${vaultId}?cursor=${encodeURIComponent(cursor ?? '')}`,
        ),
      push: (req: SyncPushRequest) => request<SyncPushResponse>('POST', '/sync', req),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
