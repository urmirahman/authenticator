import { strengthOf } from './strength';
import { describe, expect, it } from 'vitest';
import { activityLabel } from './activity';
import { accountsInFolder, ALL_FOLDERS, filterAccounts, qrCountFor } from './folders';
import { DEFAULT_PREFERENCES, parsePreferences } from './preferences';
import type { AccountData, Decrypted } from './vault-codec';

const acc = (id: string, issuer: string, folderId?: string): Decrypted<AccountData> => ({
  id,
  kind: 'account',
  version: 1,
  data: {
    issuer,
    label: `${issuer}@x`,
    secret: 'JBSWY3DP',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    folderId,
  },
});

describe('folders', () => {
  const list = [acc('1', 'GitHub', 'work'), acc('2', 'Google'), acc('3', 'GitLab', 'work')];
  it('filters by folder and query', () => {
    expect(filterAccounts(list, ALL_FOLDERS, '').map((a) => a.id)).toEqual(['1', '2', '3']);
    expect(filterAccounts(list, 'work', 'git').map((a) => a.id)).toEqual(['1', '3']);
    expect(filterAccounts(list, ALL_FOLDERS, 'goo').map((a) => a.id)).toEqual(['2']);
    expect(accountsInFolder(list, 'work')).toHaveLength(2);
  });
  it('counts QR codes', () => {
    expect([0, 1, 10, 11].map((n) => qrCountFor(n))).toEqual([0, 1, 1, 2]);
  });
});

describe('preferences', () => {
  it('falls back to defaults on junk', () => {
    expect(parsePreferences('nope')).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences('{"theme":"pink","autoLockMinutes":0}')).toEqual({
      ...DEFAULT_PREFERENCES,
      autoLockMinutes: 0,
    });
  });
});

describe('activity labels', () => {
  it('maps known actions and passes unknown through', () => {
    expect(activityLabel('backup.created')).toBe('Backup created');
    expect(activityLabel('x.y')).toBe('x.y');
  });
});

describe('password strength hint', () => {
  it('scores length and passphrases', () => {
    expect(strengthOf('short').score).toBe(0);
    expect(strengthOf('abcdefghij').score).toBe(1);
    expect(strengthOf('Abcdefghij1234').score).toBe(2);
    expect(strengthOf('correct horse battery staple').score).toBe(3);
  });
});
