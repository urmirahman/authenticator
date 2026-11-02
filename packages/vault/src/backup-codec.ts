import { nobleVaultCrypto, type KdfParams, type VaultCrypto } from '@repo/crypto';
import type { ImportedAccount } from '@repo/importers';
import { fromBase64, toBase64 } from './base64';

/**
 * Encrypted backup file format (version 1). Separate password from the master password, so you
 * can hand a backup to "future you" without exposing the live vault.
 *
 *   backup password --Argon2id(salt)--> key --XChaCha20-Poly1305--> JSON { v:1, accounts:[...] }
 *
 * The server stores { ciphertext, nonce, kdf } and can't read any of it.
 */

const AD = new TextEncoder().encode('authenticator-backup-v1');

export interface BackupKdf {
  algorithm: 'argon2id';
  salt: string;
  memoryKiB: number;
  iterations: number;
  parallelism: number;
}

export interface EncryptedBackup {
  ciphertext: string;
  nonce: string;
  kdf: BackupKdf;
}

interface Payload {
  v: 1;
  createdAt: string;
  accounts: ImportedAccount[];
}

export async function encryptBackup(
  password: string,
  accounts: ImportedAccount[],
  params: KdfParams,
  crypto: VaultCrypto = nobleVaultCrypto,
): Promise<EncryptedBackup> {
  const key = await crypto.deriveKey(password, params);
  const payload: Payload = { v: 1, createdAt: new Date().toISOString(), accounts };
  const sealed = crypto.seal(key, new TextEncoder().encode(JSON.stringify(payload)), AD);
  return {
    ciphertext: toBase64(sealed.ciphertext),
    nonce: toBase64(sealed.nonce),
    kdf: {
      algorithm: 'argon2id',
      salt: toBase64(params.salt),
      memoryKiB: params.memoryKiB,
      iterations: params.iterations,
      parallelism: params.parallelism,
    },
  };
}

export async function decryptBackup(
  password: string,
  backup: EncryptedBackup,
  crypto: VaultCrypto = nobleVaultCrypto,
): Promise<ImportedAccount[]> {
  const key = await crypto.deriveKey(password, {
    ...backup.kdf,
    salt: fromBase64(backup.kdf.salt),
  });
  let plain: Uint8Array;
  try {
    plain = crypto.open(
      key,
      { ciphertext: fromBase64(backup.ciphertext), nonce: fromBase64(backup.nonce) },
      AD,
    );
  } catch {
    throw new Error('Wrong backup password (or the file is damaged)');
  }
  const payload = JSON.parse(new TextDecoder().decode(plain)) as Payload;
  if (payload.v !== 1 || !Array.isArray(payload.accounts))
    throw new Error('Unsupported backup version');
  return payload.accounts;
}
