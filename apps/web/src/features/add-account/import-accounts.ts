import { dedupe, importAny, type ImportedAccount } from '@repo/importers';
import type { AccountData, Decrypted } from '@repo/vault';

/** Parse any supported text (otpauth, Google export, 2FAS/Aegis JSON) and drop accounts we already have. */
export function findNewAccounts(
  text: string,
  existing: Decrypted<AccountData>[],
): ImportedAccount[] {
  const { accounts } = importAny(text.trim());
  const have = existing.map((a) => ({ ...a.data, type: a.data.type ?? 'totp' }) as ImportedAccount);
  const fresh = dedupe(have, accounts);
  if (fresh.length === 0)
    throw new Error('Nothing new to add — these accounts are already in your vault.');
  return fresh;
}
