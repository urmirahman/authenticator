import { dedupe, importAny, type ImportedAccount } from '@repo/importers';
import { toImported } from './account-mapping';
import type { AccountData } from './vault-codec';

export const NOTHING_NEW = 'Nothing new to add — these accounts are already in your vault.';

/**
 * Parse one or more exports (otpauth links, Google export QRs — which Google splits across
 * several QRs — or 2FAS / Aegis JSON), merge them, and drop accounts already in the vault or
 * repeated across inputs. Throws a friendly error when nothing new is left.
 */
export function findNewAccounts(
  inputs: string | string[],
  existing: AccountData[],
): ImportedAccount[] {
  const list = (Array.isArray(inputs) ? inputs : [inputs]).map((t) => t.trim()).filter(Boolean);
  let have = existing.map(toImported);
  const fresh: ImportedAccount[] = [];
  for (const text of list) {
    const next = dedupe(have, importAny(text).accounts);
    fresh.push(...next);
    have = [...have, ...next];
  }
  if (fresh.length === 0) throw new Error(NOTHING_NEW);
  return fresh;
}
