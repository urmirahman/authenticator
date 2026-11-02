import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { randomBytes } from '@noble/ciphers/utils.js';
import { argon2id } from '@noble/hashes/argon2.js';

/**
 * End-to-end encryption helpers. Everything here runs on the device.
 * The server only ever receives the outputs (ciphertext, nonce, wrapped key, KDF params).
 *
 * Key hierarchy:
 *   master password --Argon2id(salt)--> KEK (key-encryption key)
 *   random 32-byte vault key, wrapped (encrypted) with the KEK -> stored on server
 *   each vault item encrypted with the vault key (XChaCha20-Poly1305, random 24-byte nonce)
 */

export interface KdfParams {
  algorithm: 'argon2id';
  salt: Uint8Array;
  memoryKiB: number;
  iterations: number;
  parallelism: number;
}

export interface Sealed {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}

/** The interface apps depend on, so we can swap in a native implementation on mobile later. */
export interface VaultCrypto {
  deriveKey(password: string, params: KdfParams): Promise<Uint8Array>;
  generateKey(): Uint8Array;
  seal(key: Uint8Array, plaintext: Uint8Array, associatedData?: Uint8Array): Sealed;
  open(key: Uint8Array, sealed: Sealed, associatedData?: Uint8Array): Uint8Array;
}

/** OWASP-ish defaults. Tune memory down on low-end phones if needed. */
export function defaultKdfParams(): KdfParams {
  return {
    algorithm: 'argon2id',
    salt: randomBytes(16),
    memoryKiB: 64 * 1024,
    iterations: 3,
    parallelism: 1,
  };
}

export const nobleVaultCrypto: VaultCrypto = {
  async deriveKey(password, { salt, memoryKiB, iterations, parallelism }) {
    return argon2id(new TextEncoder().encode(password), salt, {
      m: memoryKiB,
      t: iterations,
      p: parallelism,
      dkLen: 32,
    });
  },
  generateKey: () => randomBytes(32),
  seal(key, plaintext, ad) {
    const nonce = randomBytes(24);
    return { nonce, ciphertext: xchacha20poly1305(key, nonce, ad).encrypt(plaintext) };
  },
  open(key, { nonce, ciphertext }, ad) {
    // Throws if the ciphertext, nonce, key or associated data was tampered with.
    return xchacha20poly1305(key, nonce, ad).decrypt(ciphertext);
  },
};

/** Helpers for JSON payloads (e.g. a TotpAccount). Bind item id as associated data to stop swapping. */
export function sealJson(
  crypto: VaultCrypto,
  key: Uint8Array,
  value: unknown,
  itemId: string,
): Sealed {
  return crypto.seal(
    key,
    new TextEncoder().encode(JSON.stringify(value)),
    new TextEncoder().encode(itemId),
  );
}

export function openJson<T>(
  crypto: VaultCrypto,
  key: Uint8Array,
  sealed: Sealed,
  itemId: string,
): T {
  return JSON.parse(
    new TextDecoder().decode(crypto.open(key, sealed, new TextEncoder().encode(itemId))),
  ) as T;
}
