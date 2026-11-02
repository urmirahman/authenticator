import {
  nobleVaultCrypto,
  openJson,
  sealJson,
  type KdfParams,
  type VaultCrypto,
} from '@repo/crypto';
import type { EncryptedVaultItem, TotpAccount, Vault, VaultItemKind } from '@repo/types';
import { fromBase64, toBase64 } from '@/lib/base64';

/**
 * Pure functions that turn passwords and plaintext into what the server stores, and back.
 * No React here, so it is easy to unit test (see vault-codec.test.ts).
 *
 *   master password --Argon2id--> KEK --unwraps--> vault key --decrypts--> each item
 */

/** What we put inside an "account" item. */
export interface AccountData extends Omit<TotpAccount, 'id' | 'digits'> {
  digits: number;
  type?: 'totp' | 'hotp';
  counter?: number;
  folderId?: string;
}

/** What we put inside a "folder" item. */
export interface FolderData {
  name: string;
}

export type ItemData = AccountData | FolderData;

/** A decrypted item plus the sync version we must send back on the next write. */
export interface Decrypted<T> {
  id: string;
  kind: VaultItemKind;
  version: number;
  data: T;
}

/** Associated data that binds the wrapped key to its purpose (can't be swapped for an item). */
const WRAP_AD = 'vault-key';

export type VaultEnvelope = Pick<Vault, 'kdf' | 'wrappedKey'>;

/** First-time setup: random vault key, wrapped with a key derived from the master password. */
export async function createEnvelope(
  password: string,
  params: KdfParams,
  crypto: VaultCrypto = nobleVaultCrypto,
): Promise<{ envelope: VaultEnvelope; vaultKey: Uint8Array }> {
  const vaultKey = crypto.generateKey();
  return { vaultKey, envelope: await wrapVaultKey(vaultKey, password, params, crypto) };
}

/**
 * Wrap an existing vault key with a (new) password. Used by setup and by "change master password":
 * the items stay encrypted with the same vault key, only this small envelope changes.
 */
export async function wrapVaultKey(
  vaultKey: Uint8Array,
  password: string,
  params: KdfParams,
  crypto: VaultCrypto = nobleVaultCrypto,
): Promise<VaultEnvelope> {
  const kek = await crypto.deriveKey(password, params);
  const sealed = crypto.seal(kek, vaultKey, new TextEncoder().encode(WRAP_AD));
  return {
    kdf: {
      algorithm: 'argon2id',
      salt: toBase64(params.salt),
      memoryKiB: params.memoryKiB,
      iterations: params.iterations,
      parallelism: params.parallelism,
    },
    // nonce (24 bytes) + ciphertext in one blob, so the server needs only one field.
    wrappedKey: toBase64(concat(sealed.nonce, sealed.ciphertext)),
  };
}

/** Unlock: re-derive the KEK and unwrap. A wrong password throws (the auth tag won't match). */
export async function unlockEnvelope(
  password: string,
  envelope: VaultEnvelope,
  crypto: VaultCrypto = nobleVaultCrypto,
): Promise<Uint8Array> {
  const kek = await crypto.deriveKey(password, {
    algorithm: 'argon2id',
    salt: fromBase64(envelope.kdf.salt),
    memoryKiB: envelope.kdf.memoryKiB,
    iterations: envelope.kdf.iterations,
    parallelism: envelope.kdf.parallelism,
  });
  const blob = fromBase64(envelope.wrappedKey);
  try {
    return crypto.open(
      kek,
      { nonce: blob.slice(0, 24), ciphertext: blob.slice(24) },
      new TextEncoder().encode(WRAP_AD),
    );
  } catch {
    throw new Error('Wrong master password');
  }
}

export function encryptItem(
  key: Uint8Array,
  id: string,
  data: ItemData,
  crypto = nobleVaultCrypto,
) {
  const sealed = sealJson(crypto, key, data, id);
  return { ciphertext: toBase64(sealed.ciphertext), nonce: toBase64(sealed.nonce) };
}

export function decryptItem<T = ItemData>(
  key: Uint8Array,
  item: Pick<EncryptedVaultItem, 'id' | 'ciphertext' | 'nonce'>,
  crypto = nobleVaultCrypto,
): T {
  return openJson<T>(
    crypto,
    key,
    { ciphertext: fromBase64(item.ciphertext), nonce: fromBase64(item.nonce) },
    item.id,
  );
}

export function concat(a: Uint8Array, b: Uint8Array) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}
