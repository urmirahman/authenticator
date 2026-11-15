import { dedupe, type ImportedAccount } from '@repo/importers';
import {
  decryptItem,
  toAccountData,
  toImported,
  unlockEnvelope,
  type AccountData,
} from '@repo/vault';
import { localVault } from './local-vault';

export async function hasLocalVaultData(): Promise<boolean> {
  if (await localVault.loadLocalEnvelope()) return true;
  return (await localVault.loadLocalItems()).length > 0;
}

interface CloudVault {
  sync(): Promise<void>;
  accounts: { data: AccountData }[];
  save(kind: 'account', data: AccountData): Promise<string>;
}

/** Merge offline vault items into the unlocked cloud vault, then wipe local storage. */
export async function importLocalAccounts(
  localPassword: string,
  vault: CloudVault,
): Promise<{ added: number; skipped: number }> {
  const envelope = await localVault.loadLocalEnvelope();
  if (!envelope) throw new Error('No offline vault found on this device.');
  const localKey = await unlockEnvelope(localPassword, envelope);
  try {
    const localAccounts: ImportedAccount[] = [];
    for (const it of await localVault.loadLocalItems()) {
      if (it.deleted || it.kind !== 'account') continue;
      try {
        localAccounts.push(toImported(decryptItem<AccountData>(localKey, it)));
      } catch {
        /* skip unreadable items */
      }
    }
    if (localAccounts.length === 0) {
      await localVault.clearLocalVault();
      return { added: 0, skipped: 0 };
    }
    await vault.sync();
    const fresh = dedupe(
      vault.accounts.map((a) => toImported(a.data)),
      localAccounts,
    );
    for (const a of fresh) await vault.save('account', toAccountData(a));
    await vault.sync();
    await localVault.clearLocalVault();
    return { added: fresh.length, skipped: localAccounts.length - fresh.length };
  } finally {
    localKey.fill(0);
  }
}
