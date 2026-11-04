import type { ImportedAccount } from '@repo/importers';
import { findNewAccounts as findShared, type AccountData, type Decrypted } from '@repo/vault';

/** Parse exports and drop accounts we already have (shared logic lives in @repo/vault). */
export function findNewAccounts(
  inputs: string | string[],
  existing: Decrypted<AccountData>[],
): ImportedAccount[] {
  return findShared(
    inputs,
    existing.map((a) => a.data),
  );
}
