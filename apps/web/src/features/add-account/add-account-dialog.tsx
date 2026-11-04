'use client';

import type { ImportedAccount } from '@repo/importers';
import { Button } from '@repo/ui/button';
import type { AccountData, Decrypted } from '@repo/vault';
import {
  friendlyKeyError,
  isExpiryDate,
  normalizeSecret,
  secretKeyError,
  toAccountData,
  toExpiryDate,
  withExpiry,
} from '@repo/vault';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Dialog, Field, inputClass } from '@/components/ui';
import { useVault } from '@/features/vault/vault-context';
import { findNewAccounts } from './import-accounts';
import { readQrFromFile } from './qr';

type Tab = 'qr' | 'manual';

/**
 * Add an account the Google Authenticator way: scan a QR (upload or drop a screenshot) or enter
 * the key. Importing from other apps lives in Settings → Import. Editing reuses the key form.
 */
export function AddAccountDialog({
  editing,
  folderId,
  onClose,
  onDelete,
}: {
  editing?: Decrypted<AccountData>;
  folderId?: string;
  onClose: () => void;
  /** Editing only: ask for confirmation and delete (handled by the caller's dialog). */
  onDelete?: () => void;
}) {
  const vault = useVault();
  const d = editing?.data;
  const [tab, setTab] = useState<Tab>(editing ? 'manual' : 'qr');
  const [found, setFound] = useState<ImportedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState({
    issuer: d?.issuer ?? '',
    label: d?.label ?? '',
    secret: d?.secret ?? '',
    expiresAt: d?.expiresAt ?? '',
    folderId: d?.folderId ?? folderId ?? '',
  });
  const [advanced, setAdvanced] = useState(!!d?.expiresAt);
  const [touchedKey, setTouchedKey] = useState(false);

  const secret = normalizeSecret(form.secret);
  const keyError = secretKeyError(secret);
  const expiryInvalid = form.expiresAt !== '' && !isExpiryDate(form.expiresAt);
  const canSave = form.issuer.trim().length > 0 && !keyError && !expiryInvalid && !busy;

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

  const readImage = (file: File) =>
    run(async () => {
      let text: string;
      try {
        text = await readQrFromFile(file);
      } catch {
        throw new Error(
          'We couldn’t find a QR code in that image. Try a sharper, uncropped screenshot.',
        );
      }
      setFound(findNewAccounts(text, vault.accounts));
    });

  const importFound = () =>
    run(async () => {
      for (const a of found) await vault.save('account', toAccountData(a, folderId));
      onClose();
    });

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setTouchedKey(true);
    if (!canSave) return;
    run(async () => {
      try {
        // Typed keys always use the standard settings; edits keep what a QR import carried.
        const data: AccountData = withExpiry(
          {
            ...d,
            type: d?.type ?? 'totp',
            issuer: form.issuer.trim(),
            label: form.label.trim(),
            secret,
            algorithm: d?.algorithm ?? 'SHA1',
            digits: d?.digits ?? 6,
            period: d?.period ?? 30,
            folderId: form.folderId || undefined,
          },
          form.expiresAt || undefined,
        );
        await vault.save('account', data, editing?.id);
        onClose();
      } catch (err) {
        throw new Error(friendlyKeyError(err));
      }
    });
  };

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <Dialog title={editing ? 'Edit account' : 'Add account'} onClose={onClose}>
      {!editing && found.length === 0 && (
        <div role="tablist" className="mb-4 flex gap-1 rounded-xl bg-surface-muted p-1 text-sm">
          {(['qr', 'manual'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`flex-1 rounded-lg py-2 font-medium ${tab === t ? 'bg-surface shadow-sm' : 'text-muted'}`}
              onClick={() => {
                setTab(t);
                setError(null);
              }}
            >
              {t === 'qr' ? 'Scan QR' : 'Enter key'}
            </button>
          ))}
        </div>
      )}

      {tab === 'qr' && found.length === 0 && (
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) readImage(file);
          }}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center text-sm transition-colors focus-within:ring-2 focus-within:ring-accent ${
            dragging ? 'border-accent bg-accent-soft' : 'border-line text-muted'
          }`}
        >
          <span aria-hidden className="text-3xl">
            ▣
          </span>
          <span className="font-medium text-fg">Drop a screenshot of the QR code</span>
          <span>or click to choose an image</span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) readImage(file);
            }}
          />
        </label>
      )}

      {tab === 'manual' && found.length === 0 && (
        <form onSubmit={submit} className="space-y-3" noValidate>
          <Field label="Name (e.g. GitHub)">
            <input
              value={form.issuer}
              onChange={set('issuer')}
              className={inputClass}
              autoFocus={!editing}
              required
            />
          </Field>
          <Field label="Account (optional)">
            <input
              value={form.label}
              onChange={set('label')}
              placeholder="you@example.com"
              className={inputClass}
            />
          </Field>
          <Field label="Key">
            <input
              value={form.secret}
              onChange={set('secret')}
              onBlur={() => setTouchedKey(true)}
              placeholder="JBSW Y3DP EHPK 3PXP"
              className={`${inputClass} font-mono uppercase`}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={touchedKey && !!keyError}
              aria-describedby="key-help"
            />
          </Field>
          <p
            id="key-help"
            className={`text-xs ${touchedKey && keyError ? 'text-danger' : 'text-muted'}`}
            aria-live="polite"
          >
            {touchedKey && keyError
              ? keyError
              : 'The key the website shows under “Can’t scan the code?”. Spaces are fine.'}
          </p>
          {vault.folders.length > 0 && (
            <Field label="Folder">
              <select value={form.folderId} onChange={set('folderId')} className={inputClass}>
                <option value="">No folder</option>
                {vault.folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.data.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <button
            type="button"
            onClick={() => setAdvanced(!advanced)}
            aria-expanded={advanced}
            className="text-xs font-medium text-muted hover:text-fg"
          >
            {advanced ? '▾' : '▸'} Advanced
          </button>
          {advanced && (
            <div className="space-y-2 rounded-xl bg-surface-muted p-3">
              <Field label="Expires">
                <select
                  value={form.expiresAt ? 'date' : 'never'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      expiresAt:
                        e.target.value === 'never'
                          ? ''
                          : toExpiryDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
                    })
                  }
                  className={inputClass}
                >
                  <option value="never">Never</option>
                  <option value="date">On a date…</option>
                </select>
              </Field>
              {form.expiresAt !== '' && (
                <Field label="Expiry date">
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={set('expiresAt')}
                    className={inputClass}
                    aria-invalid={expiryInvalid}
                  />
                </Field>
              )}
              <p className="text-xs text-muted">
                Bloom hides the code after this date and reminds you a week before.
              </p>
            </div>
          )}
          <Button disabled={!canSave}>{editing ? 'Save' : 'Add account'}</Button>
          {editing && onDelete && (
            <Button type="button" variant="danger" disabled={busy} onClick={onDelete}>
              Delete account
            </Button>
          )}
        </form>
      )}

      {found.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm">
            Found {found.length} new account{found.length === 1 ? '' : 's'}:
          </p>
          <ul className="max-h-48 space-y-1 overflow-auto text-sm">
            {found.map((a, i) => (
              <li key={i} className="rounded-lg bg-surface-muted px-3 py-1.5">
                <span className="font-medium">{a.issuer || '—'}</span>{' '}
                <span className="text-muted">{a.label}</span>
              </li>
            ))}
          </ul>
          <Button disabled={busy} onClick={importFound}>
            {found.length === 1 ? 'Add it' : `Add all ${found.length}`}
          </Button>
          <Button variant="ghost" onClick={() => setFound([])}>
            Choose another image
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {!editing && (
        <p className="mt-4 text-center text-xs text-muted">
          Importing from another app?{' '}
          <Link
            href="/settings#import"
            className="font-medium text-accent underline"
            onClick={onClose}
          >
            Go to Settings → Import
          </Link>
        </p>
      )}
    </Dialog>
  );
}
