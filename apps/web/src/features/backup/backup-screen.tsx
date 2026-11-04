'use client';

import { defaultKdfParams } from '@repo/crypto';
import { dedupe } from '@repo/importers';
import type { BackupMeta } from '@repo/types';
import { Button } from '@repo/ui/button';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Field, inputClass, PageTitle } from '@/components/ui';
import { useDialogs } from '@/components/dialogs';
import { toAccountData, toImported } from '@repo/vault';
import { useVault } from '@/features/vault/vault-context';
import { api } from '@/lib/api';
import { decryptBackup, encryptBackup, type BackupKdf } from '@repo/vault';

/** Let the "Working…" text paint before Argon2id blocks the main thread for ~1s. */
const yieldToBrowser = () => new Promise((r) => setTimeout(r, 30));

export function BackupScreen() {
  const vault = useVault();
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const load = useCallback(() => api.backups.list().then(setBackups, () => undefined), []);
  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setMsg(null);
    await yieldToBrowser();
    try {
      setMsg(await fn());
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const create = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const pw = String(f.get('password'));
    if (pw.length < 10) return setMsg('Use a backup password of at least 10 characters.');
    if (pw !== f.get('confirm')) return setMsg('Passwords do not match.');
    run(async () => {
      const accounts = vault.accounts.map((a) => toImported(a.data));
      const enc = await encryptBackup(pw, accounts, defaultKdfParams());
      await api.backups.create({
        name: String(f.get('name')) || `Backup ${new Date().toLocaleString()}`,
        ...enc,
        kdf: { ...enc.kdf },
        itemCount: accounts.length,
      });
      form.reset();
      await load();
      return `Backup saved (${accounts.length} accounts).`;
    });
  };

  const restore = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const pw = String(new FormData(e.currentTarget).get('password'));
    run(async () => {
      const b = await api.backups.get(restoreId!);
      const accounts = await decryptBackup(pw, { ...b, kdf: b.kdf as unknown as BackupKdf });
      // Skip anything already in the vault (same secret + issuer + label).
      const fresh = dedupe(
        vault.accounts.map((a) => toImported(a.data)),
        accounts,
      );
      for (const a of fresh) await vault.save('account', toAccountData(a));
      setRestoreId(null);
      return `Restored ${fresh.length} account(s), skipped ${accounts.length - fresh.length} duplicate(s).`;
    });
  };

  const ask = useDialogs();

  const remove = async (b: BackupMeta) => {
    const ok = await ask.confirm({
      title: `Delete “${b.name}”?`,
      message: 'This backup will be gone for good. Your vault itself isn’t affected.',
      confirmLabel: 'Delete backup',
      danger: true,
    });
    if (!ok) return;
    await api.backups.remove(b.id);
    load();
  };

  return (
    <div className="space-y-4">
      <PageTitle>Encrypted backups</PageTitle>
      <p className="text-sm text-muted">
        Backups are encrypted in this browser with a separate backup password. We cannot open them
        or reset that password.
      </p>

      <form onSubmit={create} className="space-y-3 rounded-2xl bg-surface p-5 ring-1 ring-line">
        <h2 className="font-semibold">New backup ({vault.accounts.length} accounts)</h2>
        <Field label="Name (optional)">
          <input name="name" className={inputClass} />
        </Field>
        <Field label="Backup password">
          <input
            name="password"
            type="password"
            required
            className={inputClass}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm">
          <input
            name="confirm"
            type="password"
            required
            className={inputClass}
            autoComplete="new-password"
          />
        </Field>
        <Button disabled={busy || vault.accounts.length === 0}>
          {busy ? 'Working…' : 'Create backup'}
        </Button>
      </form>

      <ul className="space-y-2">
        {backups.map((b) => (
          <li key={b.id} className="rounded-xl bg-surface p-4 ring-1 ring-line">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{b.name}</p>
                <p className="text-xs text-muted">
                  {new Date(b.createdAt).toLocaleString()} · {b.itemCount} accounts ·{' '}
                  {(b.sizeBytes / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <button
                  className="text-accent"
                  onClick={() => setRestoreId(restoreId === b.id ? null : b.id)}
                >
                  Restore
                </button>
                <button className="text-danger" onClick={() => remove(b)}>
                  Delete
                </button>
              </div>
            </div>
            {restoreId === b.id && (
              <form onSubmit={restore} className="mt-3 flex gap-2">
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="Backup password"
                  className={inputClass}
                />
                <div className="w-32">
                  <Button disabled={busy}>{busy ? '…' : 'Restore'}</Button>
                </div>
              </form>
            )}
          </li>
        ))}
        {backups.length === 0 && <li className="text-sm text-muted">No backups yet.</li>}
      </ul>
      {msg && <p className="text-sm">{msg}</p>}
      {ask.dialogs}
    </div>
  );
}
