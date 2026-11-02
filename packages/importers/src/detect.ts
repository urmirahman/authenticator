import { parseGoogleMigration } from './google-migration';
import { parse2fas, parseAegis } from './json-apps';
import { parseOtpAuth } from './otpauth';
import { ImportError, type ImportedAccount } from './types';

export type ImportSource = 'otpauth' | 'google' | '2fas' | 'aegis';

/** Paste anything (URI list, Google migration link, 2FAS/Aegis JSON) and get accounts back. */
export function importAny(input: string): { source: ImportSource; accounts: ImportedAccount[] } {
  const text = input.trim();
  if (text.startsWith('{')) {
    if (text.includes('"services"')) return { source: '2fas', accounts: parse2fas(text) };
    if (text.includes('"db"')) return { source: 'aegis', accounts: parseAegis(text) };
    throw new ImportError('Unknown JSON format');
  }
  const lines = text.split(/\s+/).filter(Boolean);
  if (lines.every((l) => l.startsWith('otpauth-migration://'))) {
    return { source: 'google', accounts: lines.flatMap((l) => parseGoogleMigration(l).accounts) };
  }
  if (lines.every((l) => l.startsWith('otpauth://'))) {
    return { source: 'otpauth', accounts: lines.map(parseOtpAuth) };
  }
  throw new ImportError('Paste otpauth:// links, a Google export link, or a 2FAS/Aegis JSON file');
}

/** Same secret + issuer + label = duplicate. */
export function dedupe(existing: ImportedAccount[], incoming: ImportedAccount[]) {
  const key = (a: ImportedAccount) =>
    `${a.secret}|${a.issuer.toLowerCase()}|${a.label.toLowerCase()}`;
  const seen = new Set(existing.map(key));
  return incoming.filter((a) => {
    const k = key(a);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
