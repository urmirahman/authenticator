/**
 * Shared DTOs. These mirror the JSON the Go API sends (see apps/server/internal/modules/* /model.go).
 * Keep both sides in sync when you change one.
 */

export type ISODate = string;
export type UUID = string;

export type OAuthProvider = 'google' | 'facebook' | 'apple';

export interface User {
  id: UUID;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: ISODate;
}

export interface AuthTokens {
  accessToken: string;
  /** Rotating refresh token: every refresh returns a new one and revokes the old one. */
  refreshToken: string;
  expiresIn: number;
}

export interface Session {
  user: User;
  tokens: AuthTokens;
}

export interface Device {
  id: UUID;
  name: string;
  platform: 'web' | 'ios' | 'android';
  /** Device public key (base64) used to wrap the vault key for this device. */
  publicKey: string;
  lastSeenAt: ISODate;
}

export type TotpAlgorithm = 'SHA1' | 'SHA256' | 'SHA512';

/** What lives INSIDE an encrypted vault item. The server never sees this shape. */
export interface TotpAccount {
  id: UUID;
  issuer: string;
  label: string;
  secret: string; // base32
  algorithm: TotpAlgorithm;
  digits: 6 | 7 | 8;
  period: number; // seconds
  icon?: string;
}

export interface Vault {
  id: UUID;
  name: string;
  /** KDF params so any device can re-derive the key from the master password. */
  kdf: {
    algorithm: 'argon2id';
    salt: string;
    memoryKiB: number;
    iterations: number;
    parallelism: number;
  };
  /** Vault key encrypted with the key derived from the master password (base64). */
  wrappedKey: string;
  createdAt: ISODate;
}

/** What the server stores and returns: opaque ciphertext plus sync metadata. */
export type VaultItemKind = 'account' | 'folder';

export interface EncryptedVaultItem {
  id: UUID;
  vaultId: UUID;
  kind: VaultItemKind;
  ciphertext: string; // base64
  nonce: string; // base64
  version: number;
  deleted: boolean;
  updatedAt: ISODate;
}

export interface SyncPullResponse {
  items: EncryptedVaultItem[];
  cursor: string;
  hasMore: boolean;
}

export interface SyncPushRequest {
  vaultId: UUID;
  deviceId: UUID;
  changes: VaultChange[];
}

export type VaultChange = Pick<
  EncryptedVaultItem,
  'id' | 'ciphertext' | 'nonce' | 'version' | 'deleted'
> & {
  kind?: VaultItemKind;
};

export interface SyncPushResponse {
  accepted: UUID[];
  /** Items where the server copy is newer; the client must merge and retry. */
  conflicts: EncryptedVaultItem[];
  cursor: string;
}

export interface ApiError {
  error: { code: string; message: string };
}

/** Body for POST /auth/oauth/{provider}/token (mobile native SDKs). */
export interface NativeSignInRequest {
  idToken?: string;
  nonce?: string;
  authorizationCode?: string;
  codeVerifier?: string;
  redirectUri?: string;
  accessToken?: string;
  name?: string;
}

export interface Passkey {
  id: UUID;
  name: string;
  backupEligible: boolean;
  createdAt: ISODate;
  lastUsedAt?: ISODate;
}

export interface PasskeyBegin {
  challengeId: UUID;
  /** Pass options.publicKey to navigator.credentials.create()/get(). */
  options: { publicKey: unknown };
}

export interface ActivityEvent {
  id: number;
  action: string;
  ip?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  createdAt: ISODate;
}

export interface ActivityPage {
  events: ActivityEvent[];
  next?: string;
}
