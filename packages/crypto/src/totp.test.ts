import { describe, expect, it } from 'vitest';
import { base32Decode, base32Encode } from './base32';
import { nobleVaultCrypto, openJson, sealJson } from './encryption';
import { parseOtpAuthUri, secondsRemaining, totp, totpFromKey, type TotpAlgorithm } from './totp';

const ascii = (s: string) => new TextEncoder().encode(s);

// RFC 6238 Appendix B: seeds are ASCII "1234567890" repeated to the hash's block-ish length.
const SEEDS: Record<TotpAlgorithm, Uint8Array> = {
  SHA1: ascii('12345678901234567890'),
  SHA256: ascii('12345678901234567890123456789012'),
  SHA512: ascii('1234567890123456789012345678901234567890123456789012345678901234'),
};

const VECTORS: Array<[number, string, string, string]> = [
  [59, '94287082', '46119246', '90693936'],
  [1111111109, '07081804', '68084774', '25091201'],
  [1111111111, '14050471', '67062674', '99943326'],
  [1234567890, '89005924', '91819424', '93441116'],
  [2000000000, '69279037', '90698825', '38618901'],
  [20000000000, '65353130', '77737706', '47863826'],
];

describe('RFC 6238 test vectors', () => {
  for (const [t, s1, s256, s512] of VECTORS) {
    it(`T=${t}`, () => {
      const opts = { digits: 8, timestamp: t * 1000 };
      expect(totpFromKey(SEEDS.SHA1, { ...opts, algorithm: 'SHA1' })).toBe(s1);
      expect(totpFromKey(SEEDS.SHA256, { ...opts, algorithm: 'SHA256' })).toBe(s256);
      expect(totpFromKey(SEEDS.SHA512, { ...opts, algorithm: 'SHA512' })).toBe(s512);
    });
  }
});

describe('base32 + otpauth', () => {
  it('round-trips and computes from a base32 secret', () => {
    const secret = base32Encode(SEEDS.SHA1);
    expect(base32Decode(secret)).toEqual(SEEDS.SHA1);
    expect(totp(secret, { digits: 8, timestamp: 59_000 })).toBe('94287082');
  });

  it('parses an otpauth URI', () => {
    const u = parseOtpAuthUri(
      'otpauth://totp/GitHub:urmi?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&digits=6',
    );
    expect(u).toMatchObject({
      issuer: 'GitHub',
      label: 'urmi',
      secret: 'JBSWY3DPEHPK3PXP',
      digits: 6,
      period: 30,
    });
  });

  it('counts down the period', () => {
    expect(secondsRemaining(30, 59_000)).toBe(1);
  });
});

describe('vault encryption', () => {
  it('seals and opens, and rejects a swapped item id', () => {
    const key = nobleVaultCrypto.generateKey();
    const sealed = sealJson(nobleVaultCrypto, key, { secret: 'abc' }, 'item-1');
    expect(openJson(nobleVaultCrypto, key, sealed, 'item-1')).toEqual({ secret: 'abc' });
    expect(() => openJson(nobleVaultCrypto, key, sealed, 'item-2')).toThrow();
  });
});
