'use client';

import type { ImportedAccount } from '@repo/importers';
import { Button } from '@repo/ui/button';
import { NOTHING_NEW, toAccountData } from '@repo/vault';
import { useState } from 'react';
import { inputClass, Notice } from '@/components/ui';
import { findNewAccounts } from '@/features/add-account/import-accounts';
import { readQrFromFile } from '@/features/add-account/qr';
import { useVault } from '@/features/vault/vault-context';

const GOOGLE_STEPS = [
  'Google Authenticator, then Transfer accounts, then Export.',
  'Select the accounts and show the QR.',
  'Scan or upload it here.',
];

/**
 * Settings → Import. Main path: upload one or more QR images (Google splits big exports across
 * several QRs; we merge them). Secondary: paste a link or file contents (2FAS / Aegis JSON).
 * Everything is read on this device; accounts already in the vault are skipped.
 */
export function ImportSection() {
  const vault = useVault();
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState('');
  const [found, setFound] = useState<ImportedAccount[]>([]);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const preview = (inputs: string[], skipped = 0) => {
    try {
      setFound(findNewAccounts(inputs, vault.accounts));
      if (skipped)
        setMsg({
          tone: 'error',
          text: `${skipped} image${skipped === 1 ? '' : 's'} had no QR code we could read, so ${skipped === 1 ? 'it was' : 'they were'} skipped.`,
        });
    } catch (e) {
      setMsg({
        tone: 'error',
        text:
          e instanceof Error && e.message === NOTHING_NEW
            ? NOTHING_NEW
            : 'We couldn’t read that. Try a QR from your other app’s export, an otpauth:// link, or an unencrypted 2FAS / Aegis file.',
      });
    }
  };

  const readImages = async (files: FileList | File[]) => {
    setMsg(null);
    setBusy(true);
    const texts: string[] = [];
    let skipped = 0;
    for (const f of Array.from(files)) {
      try {
        texts.push(await readQrFromFile(f));
      } catch {
        skipped++;
      }
    }
    setBusy(false);
    if (texts.length === 0) {
      setMsg({
        tone: 'error',
        text: 'We couldn’t find a QR code in that image. Try a sharper, uncropped screenshot.',
      });
      return;
    }
    preview(texts, skipped);
  };

  const save = async () => {
    setBusy(true);
    try {
      for (const a of found) await vault.save('account', toAccountData(a));
      setMsg({
        tone: 'success',
        text: `Added ${found.length} account${found.length === 1 ? '' : 's'}. Check a code or two matches your old app before removing it there.`,
      });
      setFound([]);
      setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {found.length === 0 ? (
        <>
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (e.dataTransfer.files.length) readImages(e.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center text-sm transition-colors focus-within:ring-2 focus-within:ring-accent ${
              dragging ? 'border-accent bg-accent-soft' : 'border-line text-muted'
            }`}
          >
            <span className="font-medium text-fg">{busy ? 'Reading…' : 'QR image'}</span>
            <span>Drop screenshots here or click to choose. You can pick several at once.</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files?.length) readImages(e.target.files);
                e.target.value = '';
              }}
            />
          </label>

          <div className="rounded-xl bg-surface-muted p-4 text-sm">
            <p className="mb-2 font-medium">From Google Authenticator</p>
            <ol className="list-decimal space-y-1 pl-5 text-muted">
              {GOOGLE_STEPS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </div>

          <button
            type="button"
            className="text-sm font-medium text-accent underline"
            aria-expanded={pasting}
            onClick={() => setPasting(!pasting)}
          >
            {pasting ? 'Hide' : 'Paste'}
          </button>
          {pasting && (
            <div className="space-y-2">
              <label className="sr-only" htmlFor="import-text">
                Link or file contents
              </label>
              <textarea
                id="import-text"
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={`${inputClass} font-mono text-xs`}
                placeholder="otpauth://…  ·  otpauth-migration://…  ·  2FAS or Aegis file contents"
              />
              <Button
                variant="secondary"
                disabled={!text.trim()}
                onClick={() => {
                  setMsg(null);
                  preview([text]);
                }}
              >
                Read
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <p className="text-sm">
            Found {found.length} new account{found.length === 1 ? '' : 's'} (ones already in Bloom
            are skipped):
          </p>
          <ul className="max-h-48 space-y-1 overflow-auto text-sm">
            {found.map((a, i) => (
              <li key={i} className="rounded-lg bg-surface-muted px-3 py-1.5">
                <span className="font-medium">{a.issuer || '—'}</span>{' '}
                <span className="text-muted">{a.label}</span>
              </li>
            ))}
          </ul>
          <Button disabled={busy} onClick={save}>
            Add
          </Button>
          <Button variant="ghost" onClick={() => setFound([])}>
            Cancel
          </Button>
        </>
      )}
      {msg && (
        <Notice tone={msg.tone} onDismiss={() => setMsg(null)}>
          {msg.text}
        </Notice>
      )}
    </div>
  );
}
