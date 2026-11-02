import type { AccountData, Decrypted, FolderData } from './vault-codec';

/** Special filter value meaning "every folder". */
export const ALL_FOLDERS = '__all';

/** Filter by folder and a search query (issuer or label, case-insensitive). */
export function filterAccounts(
  accounts: Decrypted<AccountData>[],
  folderId: string,
  query: string,
) {
  const q = query.trim().toLowerCase();
  return accounts.filter(
    (a) =>
      (folderId === ALL_FOLDERS || a.data.folderId === folderId) &&
      (!q || `${a.data.issuer} ${a.data.label}`.toLowerCase().includes(q)),
  );
}

/** Accounts that must be moved out before a folder is deleted (accounts are never deleted with it). */
export function accountsInFolder(accounts: Decrypted<AccountData>[], folderId: string) {
  return accounts.filter((a) => a.data.folderId === folderId);
}

export function sortFolders(folders: Decrypted<FolderData>[]) {
  return [...folders].sort((a, b) =>
    a.data.name.localeCompare(b.data.name, undefined, { sensitivity: 'base' }),
  );
}

/** Split selected accounts into Google-migration-sized chunks count (10 per QR). */
export const qrCountFor = (selected: number, perQr = 10) => Math.ceil(selected / perQr);
