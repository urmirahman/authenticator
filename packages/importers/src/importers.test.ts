import { describe, expect, it } from 'vitest';
import {
  dedupe,
  importAny,
  ImportError,
  issuerIcon,
  issuerInitials,
  parse2fas,
  parseAegis,
  parseGoogleMigration,
  parseOtpAuth,
  toGoogleMigration,
  toOtpAuth,
  type ImportedAccount,
} from './index';

const github: ImportedAccount = {
  type: 'totp',
  issuer: 'GitHub',
  label: 'urmi@example.com',
  secret: 'JBSWY3DPEHPK3PXP',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
};

describe('otpauth://', () => {
  it.each([
    [
      'issuer from path',
      'otpauth://totp/GitHub:urmi%40example.com?secret=JBSWY3DPEHPK3PXP',
      github,
    ],
    [
      'all params',
      'otpauth://totp/x?secret=jbsw%20y3dp&issuer=AWS&algorithm=SHA256&digits=8&period=60',
      {
        type: 'totp',
        issuer: 'AWS',
        label: 'x',
        secret: 'JBSWY3DP',
        algorithm: 'SHA256',
        digits: 8,
        period: 60,
      },
    ],
    [
      'hotp',
      'otpauth://hotp/Bank:me?secret=JBSWY3DP&counter=5',
      {
        type: 'hotp',
        issuer: 'Bank',
        label: 'me',
        secret: 'JBSWY3DP',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        counter: 5,
      },
    ],
  ])('%s', (_, uri, want) => {
    expect(parseOtpAuth(uri)).toEqual(want);
  });

  it.each([
    ['not a uri', 'hello'],
    ['wrong scheme', 'https://x?secret=ABC'],
    ['no secret', 'otpauth://totp/x'],
    ['bad base32', 'otpauth://totp/x?secret=abc1!'],
    ['bad digits', 'otpauth://totp/x?secret=JBSWY3DP&digits=5'],
    ['md5', 'otpauth://totp/x?secret=JBSWY3DP&algorithm=MD5'],
  ])('rejects %s', (_, uri) => {
    expect(() => parseOtpAuth(uri)).toThrow(ImportError);
  });

  it('round-trips', () => {
    expect(parseOtpAuth(toOtpAuth(github))).toEqual(github);
  });
});

describe('Google Authenticator export', () => {
  it('round-trips through our encoder and parses batches', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ ...github, label: `user${i}` }));
    const uris = toGoogleMigration(many, 10);
    expect(uris).toHaveLength(2);
    const first = parseGoogleMigration(uris[0]!);
    expect(first.batchSize).toBe(2);
    expect(first.accounts).toHaveLength(10);
    expect(first.accounts[0]).toEqual({ ...github, label: 'user0' });
  });

  it('parses a real Google Authenticator payload', () => {
    // Hand-built fixture: one TOTP account "Example:alice" with secret "Hello!\xde\xad\xbe\xef"
    const uri =
      'otpauth-migration://offline?data=CjEKCkhlbGxvId6tvu8SGEV4YW1wbGU6YWxpY2VAZ29vZ2xlLmNvbRoHRXhhbXBsZSABKAEwAhABGAEgACgA';
    const { accounts } = parseGoogleMigration(uri);
    expect(accounts[0]).toMatchObject({
      issuer: 'Example',
      label: 'alice@google.com',
      secret: 'JBSWY3DPEHPK3PXP',
      type: 'totp',
      digits: 6,
    });
  });
});

describe('2FAS and Aegis', () => {
  it('parses 2FAS', () => {
    const json = JSON.stringify({
      schemaVersion: 4,
      services: [
        {
          name: 'GitHub',
          secret: 'JBSWY3DPEHPK3PXP',
          otp: {
            account: 'urmi@example.com',
            digits: 6,
            period: 30,
            algorithm: 'SHA1',
            tokenType: 'TOTP',
          },
        },
      ],
    });
    expect(parse2fas(json)).toEqual([github]);
  });

  it('refuses encrypted 2FAS', () => {
    expect(() => parse2fas('{"servicesEncrypted":"abc"}')).toThrow(/password-protected/);
  });

  it('parses Aegis plain export', () => {
    const json = JSON.stringify({
      version: 1,
      header: { slots: null, params: null },
      db: {
        version: 2,
        entries: [
          {
            type: 'totp',
            name: 'urmi@example.com',
            issuer: 'GitHub',
            info: { secret: 'JBSWY3DPEHPK3PXP', algo: 'SHA1', digits: 6, period: 30 },
          },
          { type: 'steam', name: 'skip', issuer: 'Steam', info: { secret: 'AAAA' } },
        ],
      },
    });
    expect(parseAegis(json)).toEqual([github]);
  });

  it('refuses encrypted Aegis', () => {
    expect(() => parseAegis('{"header":{"slots":[{}]},"db":"base64..."}')).toThrow(/encrypted/);
  });
});

describe('importAny + dedupe', () => {
  it('detects formats', () => {
    expect(
      importAny(toOtpAuth(github) + '\n' + toOtpAuth({ ...github, label: 'b' })).accounts,
    ).toHaveLength(2);
    expect(importAny(toGoogleMigration([github])[0]!).source).toBe('google');
    expect(() => importAny('nonsense')).toThrow(ImportError);
  });

  it('drops duplicates', () => {
    expect(dedupe([github], [github, { ...github, label: 'other' }])).toHaveLength(1);
  });

  it('keeps a different secret when issuer and label match', () => {
    const rotated = { ...github, secret: 'NBSWY3DPEHPK3PXP' };
    expect(dedupe([github], [github, rotated])).toEqual([rotated]);
  });
});

describe('issuer icons', () => {
  it.each([
    ['GitHub', 'github'],
    ['github.com', 'github'],
    ['Amazon Web Services', 'amazonwebservices'],
    ['Twitter', 'x'],
  ])('%s -> %s', (issuer, slug) => {
    expect(issuerIcon(issuer)?.slug).toBe(slug);
  });
  it('unknown issuer', () => {
    expect(issuerIcon('My Bank')).toBeUndefined();
    expect(issuerInitials('My Bank')).toBe('MB');
  });
});
