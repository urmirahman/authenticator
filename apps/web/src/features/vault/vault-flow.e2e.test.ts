import { createApiClient } from '@repo/api-client';
import { describe, expect, it } from 'vitest';
import { decryptBackup, encryptBackup, type BackupKdf } from '@/features/backup/backup-codec';
import {
  createEnvelope,
  decryptItem,
  encryptItem,
  unlockEnvelope,
  wrapVaultKey,
} from './vault-codec';

/**
 * End-to-end check against a REAL running API (skipped by default).
 * Run: start the API with DEV_AUTH=true, then
 *   API_E2E_URL=http://localhost:8787 pnpm -F @authenticator/web test
 * It does what the web app does: dev sign-in, create vault, add an account, sync from a "second device".
 */
const url = process.env.API_E2E_URL;

describe.skipIf(!url)('web vault flow (live API)', () => {
  it('creates, syncs and unlocks the vault', async () => {
    let token = '';
    const api = createApiClient({ baseUrl: url!, getAccessToken: () => token });
    token = (await api.dev.token(`e2e-${Date.now()}@example.com`, 'E2E')).accessToken;

    const params = {
      algorithm: 'argon2id' as const,
      salt: crypto.getRandomValues(new Uint8Array(16)),
      memoryKiB: 19456,
      iterations: 2,
      parallelism: 1,
    };
    const { envelope, vaultKey } = await createEnvelope('a long master password', params);
    const vault = await api.vaults.create({ name: 'Personal', ...envelope });

    const id = crypto.randomUUID();
    const account = {
      issuer: 'GitHub',
      label: 'me',
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'SHA1' as const,
      digits: 6,
      period: 30,
    };
    await api.items.put(vault.id, id, {
      kind: 'account',
      version: 1,
      ...encryptItem(vaultKey, id, account),
    });

    // "Second device": fetch the envelope, unlock with the password, pull and decrypt.
    const fetched = (await api.vaults.list())[0]!;
    const key2 = await unlockEnvelope('a long master password', fetched);
    const page = await api.sync.pull(fetched.id, '');
    const item = page.items.find((i) => i.id === id)!;
    expect(decryptItem(key2, item)).toEqual(account);

    // Change master password: same key, new envelope; old password stops working.
    await api.vaults.rekey(vault.id, await wrapVaultKey(key2, 'new master password', params));
    const rekeyed = await api.vaults.get(vault.id);
    expect(await unlockEnvelope('new master password', rekeyed)).toEqual(vaultKey);
    await expect(unlockEnvelope('a long master password', rekeyed)).rejects.toThrow();

    // Encrypted backup: upload, download, decrypt.
    const imported = { type: 'totp' as const, ...account };
    const enc = await encryptBackup('backup password!', [imported], params);
    const meta = await api.backups.create({
      name: 'e2e',
      ...enc,
      kdf: { ...enc.kdf },
      itemCount: 1,
    });
    const dl = await api.backups.get(meta.id);
    expect(
      await decryptBackup('backup password!', { ...dl, kdf: dl.kdf as unknown as BackupKdf }),
    ).toEqual([imported]);

    // Clean up: tombstone the item and delete the throwaway user.
    await api.items.remove(vault.id, id, 2);
    await api.users.deleteAccount();
  }, 30_000);
});
