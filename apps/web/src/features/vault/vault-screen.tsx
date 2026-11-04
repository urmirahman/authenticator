'use client';

import { Button } from '@repo/ui/button';
import { useMemo, useState } from 'react';
import { inputClass, PageTitle } from '@/components/ui';
import { useDialogs } from '@/components/dialogs';
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
  const ask = useDialogs();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vault.accounts.filter(
      (a) =>
        (folder === ALL || a.data.folderId === folder) &&
        (!q || `${a.data.issuer} ${a.data.label}`.toLowerCase().includes(q)),
    );
  }, [vault.accounts, query, folder]);

  const folderNameTaken = (exceptId?: string) => (name: string) =>
    vault.folders.some(
      (f) => f.id !== exceptId && f.data.name.trim().toLowerCase() === name.toLowerCase(),
    )
      ? 'You already have a folder with that name.'
      : null;

  const addFolder = async () => {
    const name = await ask.prompt({
      title: 'New folder',
      label: 'Folder name',
      placeholder: 'e.g. Work',
      confirmLabel: 'Create',
      validate: folderNameTaken(),
    });
    if (typeof name === 'string') setFolder(await vault.save('folder', { name }));
  };

  const editFolder = async () => {
    const f = vault.folders.find((x) => x.id === folder);
    if (!f) return;
    const result = await ask.prompt({
      title: 'Rename folder',
      label: 'Folder name',
      initial: f.data.name,
      confirmLabel: 'Save',
      validate: folderNameTaken(f.id),
      extraAction: 'Delete folder',
    });
    if (result === null) return;
    if (typeof result === 'string') {
      if (result !== f.data.name) await vault.save('folder', { name: result }, f.id);
      return;
    }
    const ok = await ask.confirm({
      title: `Delete “${f.data.name}”?`,
      message: 'The accounts inside stay safe — they move back to All.',
      confirmLabel: 'Delete folder',
      danger: true,
    });
    if (!ok) return;
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
          onDelete={async () => {
            const editing = dialog.editing;
            if (!editing) return;
            const ok = await ask.confirm({
              title: `Delete ${editing.data.issuer || editing.data.label}?`,
              message:
                'Turn off two-factor sign-in on that website first, or you may lose access to it.',
              confirmLabel: 'Delete account',
              danger: true,
            });
            if (!ok) return;
            await vault.remove(editing.id);
            setDialog(null);
          }}
        />
      )}
      {ask.dialogs}
    </>
  );
}
