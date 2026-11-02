import type {
  ActivityPage,
  Backup,
  BackupMeta,
  AuthTokens,
  Device,
  EncryptedVaultItem,
  NativeSignInRequest,
  OAuthProvider,
  Passkey,
  PasskeyBegin,
  SyncPullResponse,
  SyncPushRequest,
  SyncPushResponse,
  User,
  Vault,
  VaultItemKind,
} from '@repo/types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Where tokens live differs per platform: memory/cookie on web, SecureStore on mobile. */
  getAccessToken?: () => string | null | Promise<string | null>;
  /** Sent as X-Device-Id so the server's change log knows which device wrote what. */
  getDeviceId?: () => string | null | Promise<string | null>;
  fetch?: typeof fetch;
}

/** Tiny typed client shared by web and mobile. One method per API endpoint (see apps/server/api/openapi.yaml). */
export function createApiClient({
  baseUrl,
  getAccessToken,
  getDeviceId,
  fetch: f = fetch,
}: ApiClientOptions) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const [token, deviceId] = await Promise.all([getAccessToken?.(), getDeviceId?.()]);
    const res = await f(`${baseUrl}/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(deviceId ? { 'X-Device-Id': deviceId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as {
        error?: { code: string; message: string };
      } | null;
      throw new ApiError(
        res.status,
        err?.error?.code ?? (res.status === 409 ? 'conflict' : 'unknown'),
        err?.error?.message ?? res.statusText,
        err,
      );
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  const items = (vaultId: string) => `/vaults/${vaultId}/items`;

  return {
    health: () => request<{ status: string }>('GET', '/health'),
    auth: {
      /** Web: send the browser here. It comes back to redirectUri?code=..., then call exchange(code). */
      oauthStartUrl: (provider: OAuthProvider, redirectUri: string) =>
        `${baseUrl}/v1/auth/oauth/${provider}/start?redirect_uri=${encodeURIComponent(redirectUri)}`,
      exchange: (code: string) => request<AuthTokens>('POST', '/auth/exchange', { code }),
      /** Mobile: native SDK result (id_token / Apple auth code / Facebook access token) -> our tokens. */
      nativeSignIn: (provider: OAuthProvider, body: NativeSignInRequest) =>
        request<AuthTokens>('POST', `/auth/oauth/${provider}/token`, body),
      refresh: (refreshToken: string) =>
        request<AuthTokens>('POST', '/auth/refresh', { refreshToken }),
      logout: (refreshToken: string) => request<void>('POST', '/auth/logout', { refreshToken }),
    },
    passkeys: {
      beginLogin: () => request<PasskeyBegin>('POST', '/passkeys/login/begin'),
      finishLogin: (challengeId: string, credential: unknown) =>
        request<AuthTokens>('POST', '/passkeys/login/finish', { challengeId, credential }),
      beginRegister: () => request<PasskeyBegin>('POST', '/passkeys/register/begin'),
      finishRegister: (challengeId: string, credential: unknown, name?: string) =>
        request<Passkey>('POST', '/passkeys/register/finish', { challengeId, credential, name }),
      list: () => request<Passkey[]>('GET', '/passkeys'),
      rename: (id: string, name: string) => request<void>('PATCH', `/passkeys/${id}`, { name }),
      remove: (id: string) => request<void>('DELETE', `/passkeys/${id}`),
    },
    users: {
      me: () => request<User>('GET', '/users/me'),
      update: (displayName: string) => request<User>('PATCH', '/users/me', { displayName }),
      deleteAccount: () => request<void>('DELETE', '/users/me'),
      /** "Download my data" (vault items stay encrypted). */
      exportData: () => request<Record<string, unknown>>('GET', '/users/me/export'),
    },
    devices: {
      list: () => request<Device[]>('GET', '/devices'),
      register: (d: Pick<Device, 'name' | 'platform' | 'publicKey'>) =>
        request<Device>('POST', '/devices', d),
      /** Remote sign-out. */
      revoke: (id: string) => request<void>('DELETE', `/devices/${id}`),
    },
    vaults: {
      list: () => request<Vault[]>('GET', '/vaults'),
      get: (id: string) => request<Vault>('GET', `/vaults/${id}`),
      create: (v: Pick<Vault, 'name' | 'kdf' | 'wrappedKey'>) =>
        request<Vault>('POST', '/vaults', v),
      rekey: (id: string, v: Pick<Vault, 'kdf' | 'wrappedKey'>) =>
        request<Vault>('PUT', `/vaults/${id}/key`, v),
    },
    items: {
      list: (vaultId: string) => request<EncryptedVaultItem[]>('GET', items(vaultId)),
      get: (vaultId: string, id: string) =>
        request<EncryptedVaultItem>('GET', `${items(vaultId)}/${id}`),
      /** version 1 creates; server version + 1 updates; 409 ApiError.body.conflicts holds the server copy. */
      put: (
        vaultId: string,
        id: string,
        item: { kind?: VaultItemKind; ciphertext: string; nonce: string; version: number },
      ) => request<SyncPushResponse>('PUT', `${items(vaultId)}/${id}`, item),
      remove: (vaultId: string, id: string, version: number) =>
        request<SyncPushResponse>('DELETE', `${items(vaultId)}/${id}?version=${version}`),
    },
    sync: {
      pull: (vaultId: string, cursor?: string) =>
        request<SyncPullResponse>(
          'GET',
          `/sync/${vaultId}?cursor=${encodeURIComponent(cursor ?? '')}`,
        ),
      push: (req: SyncPushRequest) => request<SyncPushResponse>('POST', '/sync', req),
    },
    backups: {
      list: () => request<BackupMeta[]>('GET', '/backups'),
      get: (id: string) => request<Backup>('GET', `/backups/${id}`),
      create: (b: {
        name: string;
        ciphertext: string;
        nonce: string;
        kdf?: Record<string, unknown>;
        itemCount?: number;
      }) => request<BackupMeta>('POST', '/backups', b),
      remove: (id: string) => request<void>('DELETE', `/backups/${id}`),
    },
    /** Only exists when the server runs with DEV_AUTH=true (local development). */
    dev: {
      token: (email: string, name = '') =>
        request<AuthTokens>('POST', '/dev/token', { email, name }),
    },
    activity: {
      list: (before?: string, limit = 50) =>
        request<ActivityPage>(
          'GET',
          `/activity?limit=${limit}${before ? `&before=${before}` : ''}`,
        ),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
