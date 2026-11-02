import type { ImportedAccount } from '@repo/importers';
import { describe, expect, it } from 'vitest';
import { decryptBackup, encryptBackup } from './backup-codec';

const params = () => ({
  algorithm: 'argon2id' as const,
  salt: new Uint8Array(16).fill(3),
  memoryKiB: 64,
  iterations: 1,
  parallelism: 1,
});
const acc: ImportedAccount = {
  type: 'totp',
  issuer: 'GitHub',
  label: 'me',
  secret: 'JBSWY3DPEHPK3PXP',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
};

describe('backup codec', () => {
  it('round-trips with the right password', async () => {
    const b = await encryptBackup('backup pw', [acc], params());
    expect(await decryptBackup('backup pw', b)).toEqual([acc]);
  });

  it('rejects a wrong password and tampering', async () => {
    const b = await encryptBackup('backup pw', [acc], params());
    await expect(decryptBackup('nope', b)).rejects.toThrow('Wrong backup password');
    const bad = { ...b, ciphertext: b.ciphertext.replace(/^./, (c) => (c === 'A' ? 'B' : 'A')) };
    await expect(decryptBackup('backup pw', bad)).rejects.toThrow();
  });
});
