import { describe, expect, it } from 'vitest';
import { findNewAccounts, NOTHING_NEW } from './import-accounts';
import { toAccountData } from './account-mapping';
import { parseOtpAuth } from '@repo/importers';

const gh = 'otpauth://totp/GitHub:me?secret=JBSWY3DPEHPK3PXP&issuer=GitHub';
const gl = 'otpauth://totp/GitLab:me?secret=KRSXG5CTMVRXEZLU&issuer=GitLab';

describe('findNewAccounts', () => {
  it('merges several inputs and drops repeats across them', () => {
    const found = findNewAccounts([gh, gl, gh], []);
    expect(found.map((a) => a.issuer)).toEqual(['GitHub', 'GitLab']);
  });

  it('skips accounts already in the vault', () => {
    const existing = [toAccountData(parseOtpAuth(gh))];
    expect(findNewAccounts([gh, gl], existing).map((a) => a.issuer)).toEqual(['GitLab']);
  });

  it('says so when nothing is new', () => {
    expect(() => findNewAccounts(gh, [toAccountData(parseOtpAuth(gh))])).toThrow(NOTHING_NEW);
  });
});
