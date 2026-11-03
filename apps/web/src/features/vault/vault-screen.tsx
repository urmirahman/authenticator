'use client';

import { Button } from '@repo/ui/button';
import { useMemo, useState } from 'react';
import { inputClass, PageTitle } from '@/components/ui';
import { AddAccountDialog } from '@/features/add-account/add-account-dialog';
import { CodeList } from '@/features/totp/code-list';
import type { AccountData, Decrypted } from '@repo/vault';
import { useVault } from './vault-context';

const ALL = '__all';

/** Main screen: search, folder chips, the list of live codes, and add/edit dialogs. */
export function VaultScreen() {
  const vault = useVault();
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState<string>(ALL);
  const [dialog, setDialog] = useState<{ editing?: Decrypted<AccountData> } | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vault.accounts.filter(
      (a) =>
        (folder === ALL || a.data.folderId === folder) &&
        (!q || `${a.data.issuer} ${a.data.label}`.toLowerCase().includes(q)),
    );
  }, [vault.accounts, query, folder]);

  const addFolder = async () => {
    const name = prompt('Folder name')?.trim();
    if (name) setFolder(await vault.save('folder', { name }));
  };

  const editFolder = async () => {
    const f = vault.folders.find((x) => x.id === folder);
    if (!f) return;
    const name = prompt('Rename folder (leave empty to delete it)', f.data.name);
    if (name === null) return;
    if (name.trim()) return void (await vault.save('folder', { name: name.trim() }, f.id));
    // Deleting a folder keeps its accounts: move them out first.
    for (const a of vault.accounts.filter((x) => x.data.folderId === f.id)) {
      await vault.save('account', { ...a.data, folderId: undefined }, a.id);
    }
    await vault.remove(f.id);
    setFolder(ALL);
  };

  const chip = (id: string, label: string) => (
    <button
      key={id}
      onClick={() => setFolder(id)}
      className={`rounded-full px-3 py-1 text-sm ${folder === id ? 'bg-accent text-accent-fg' : 'bg-surface-muted'}`}
    >
      {label}
    </button>
  );

  return (
    <>
      <PageTitle
        action={
          <div className="w-36">
            <Button onClick={() => setDialog({})}>+ Add</Button>
          </div>
        }
      >
        Your codes
      </PageTitle>

      <input
        type="search"
        placeholder="Search issuer or account"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={`${inputClass} mb-3`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {chip(ALL, 'All')}
        {vault.folders.map((f) => chip(f.id, f.data.name))}
        <button onClick={addFolder} className="rounded-full px-3 py-1 text-sm text-accent">
          + Folder
        </button>
        {folder !== ALL && (
          <button onClick={editFolder} className="rounded-full px-3 py-1 text-sm text-muted">
            Edit folder
          </button>
        )}
      </div>

      <CodeList
        accounts={visible}
        folders={vault.folders}
        onEdit={(a) => setDialog({ editing: a })}
      />

      <p className="mt-6 flex items-center gap-2 text-xs text-muted">
        {vault.syncing
          ? 'Syncing…'
          : vault.lastSyncedAt
            ? `Synced ${vault.lastSyncedAt.toLocaleTimeString()}`
            : ''}
        <button className="underline" onClick={vault.sync}>
          Sync now
        </button>
        {vault.error && <span className="text-danger">{vault.error}</span>}
      </p>

      {dialog && (
        <AddAccountDialog
          editing={dialog.editing}
          folderId={folder === ALL ? undefined : folder}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
