'use client';

import { base32Decode } from '@repo/crypto';
import { dedupe, importAny, type ImportedAccount } from '@repo/importers';
import { Button } from '@repo/ui/button';
import { useState, type FormEvent } from 'react';
import { useVault } from '@/features/vault/vault-context';
import type { AccountData, Decrypted } from '@/features/vault/vault-codec';
import { Dialog, Field, inputClass } from '@/components/ui';
import { readQrFromFile } from './qr';
import { toAccountData } from './to-account-data';

type Tab = 'manual' | 'qr' | 'paste';

/**
 * Three ways to add accounts:
 *  - manual: type the secret key the website shows under "can't scan?"
 *  - qr: upload a screenshot of the QR code (decoded in the browser)
 *  - paste: otpauth:// link, Google Authenticator export link, or 2FAS / Aegis JSON
 * Editing an existing account reuses the manual form.
 */
export function AddAccountDialog({
  editing,
  folderId,
  onClose,
}: {
  editing?: Decrypted<AccountData>;
  folderId?: string;
  onClose: () => void;
}) {
  const vault = useVault();
  const [tab, setTab] = useState<Tab>('manual');
  const [found, setFound] = useState<ImportedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  /** Parse any supported text, and hide accounts we already have. */
  const parse = (text: string) => {
    const { accounts } = importAny(text.trim());
    const existing = vault.accounts.map(
      (a) => ({ ...a.data, type: a.data.type ?? 'totp' }) as ImportedAccount,
    );
    const fresh = dedupe(existing, accounts);
    if (fresh.length === 0) throw new Error('Nothing new to import (already in your vault).');
    setFound(fresh);
  };

  const importFound = () =>
    run(async () => {
      for (const a of found) await vault.save('account', toAccountData(a, folderId));
      onClose();
    });

  const submitManual = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    run(async () => {
      const secret = String(f.get('secret')).replace(/\s|-/g, '').toUpperCase();
      base32Decode(secret); // throws on invalid characters
      const data: AccountData = {
        ...editing?.data,
        issuer: String(f.get('issuer')).trim(),
        label: String(f.get('label')).trim(),
        secret,
        algorithm: f.get('algorithm') as AccountData['algorithm'],
        digits: Number(f.get('digits')),
        period: Number(f.get('period')),
        folderId: String(f.get('folderId')) || undefined,
      };
      if (!data.issuer && !data.label) throw new Error('Add an issuer or a label');
      await vault.save('account', data, editing?.id);
      onClose();
    });
  };

  const d = editing?.data;
  return (
    <Dialog title={editing ? 'Edit account' : 'Add account'} onClose={onClose}>
      {!editing && (
        <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1 text-sm dark:bg-slate-800">
          {(['manual', 'qr', 'paste'] as Tab[]).map((t) => (
            <button
              key={t}
              className={`flex-1 rounded-lg py-1.5 ${tab === t ? 'bg-white shadow-sm dark:bg-slate-700' : ''}`}
              onClick={() => {
                setTab(t);
                setFound([]);
                setError(null);
              }}
            >
              {{ manual: 'Enter key', qr: 'QR image', paste: 'Paste / import' }[t]}
            </button>
          ))}
        </div>
      )}

      {tab === 'manual' && (
        <form onSubmit={submitManual} className="space-y-3">
          <Field label="Issuer (e.g. GitHub)">
            <input name="issuer" defaultValue={d?.issuer} className={inputClass} />
          </Field>
          <Field label="Account (e.g. you@example.com)">
            <input name="label" defaultValue={d?.label} className={inputClass} />
          </Field>
          <Field label="Secret key">
            <input
              name="secret"
              required
              defaultValue={d?.secret}
              className={`${inputClass} font-mono`}
              autoComplete="off"
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Algorithm">
              <select name="algorithm" defaultValue={d?.algorithm ?? 'SHA1'} className={inputClass}>
                <option>SHA1</option>
                <option>SHA256</option>
                <option>SHA512</option>
              </select>
            </Field>
            <Field label="Digits">
              <select name="digits" defaultValue={d?.digits ?? 6} className={inputClass}>
                <option>6</option>
                <option>7</option>
                <option>8</option>
              </select>
            </Field>
            <Field label="Period (s)">
              <input
                name="period"
                type="number"
                min={10}
                max={120}
                defaultValue={d?.period ?? 30}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Folder">
            <select
              name="folderId"
              defaultValue={d?.folderId ?? folderId ?? ''}
              className={inputClass}
            >
              <option value="">No folder</option>
              {vault.folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.data.name}
                </option>
              ))}
            </select>
          </Field>
          <Button disabled={busy}>{editing ? 'Save' : 'Add account'}</Button>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              className="text-red-600"
              disabled={busy}
              onClick={() =>
                confirm('Delete this account? You may lose access to the site.') &&
                run(async () => {
                  await vault.remove(editing.id);
                  onClose();
                })
              }
            >
              Delete account
            </Button>
          )}
        </form>
      )}

      {tab === 'qr' && found.length === 0 && (
        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Choose a screenshot of the QR code
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) run(async () => parse(await readQrFromFile(file)));
            }}
          />
        </label>
      )}

      {tab === 'paste' && found.length === 0 && (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const text = String(new FormData(e.currentTarget).get('text'));
            run(async () => parse(text));
          }}
        >
          <textarea
            name="text"
            rows={6}
            className={`${inputClass} font-mono text-xs`}
            placeholder="otpauth://totp/...  or  otpauth-migration://offline?data=...  or 2FAS / Aegis JSON (unencrypted)"
          />
          <Button disabled={busy}>Read</Button>
        </form>
      )}

      {found.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm">Found {found.length} new account(s):</p>
          <ul className="max-h-48 space-y-1 overflow-auto text-sm">
            {found.map((a, i) => (
              <li key={i} className="rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                {a.issuer || '—'} · {a.label}
              </li>
            ))}
          </ul>
          <Button disabled={busy} onClick={importFound}>
            Import {found.length}
          </Button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Dialog>
  );
}
