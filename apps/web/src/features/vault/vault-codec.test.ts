import { describe, expect, it } from 'vitest';
import { createEnvelope, decryptItem, encryptItem, unlockEnvelope } from './vault-codec';

// Small Argon2 settings so tests are fast. Real setup uses defaultKdfParams() (64 MiB).
const params = () => ({
  algorithm: 'argon2id' as const,
  salt: new Uint8Array(16).fill(7),
  memoryKiB: 64,
  iterations: 1,
  parallelism: 1,
});

describe('vault codec', () => {
  it('unwraps the vault key with the right password only', async () => {
    const { envelope, vaultKey } = await createEnvelope('correct horse', params());
    expect(await unlockEnvelope('correct horse', envelope)).toEqual(vaultKey);
    await expect(unlockEnvelope('wrong', envelope)).rejects.toThrow('Wrong master password');
  });

  it('round-trips an item and binds it to its id', async () => {
    const { vaultKey } = await createEnvelope('pw', params());
    const data = { name: 'Work' };
    const enc = encryptItem(vaultKey, 'id-1', data);
    expect(decryptItem(vaultKey, { id: 'id-1', ...enc })).toEqual(data);
    // Same ciphertext under another id must fail: the server can't swap items around.
    expect(() => decryptItem(vaultKey, { id: 'id-2', ...enc })).toThrow();
  });
});
