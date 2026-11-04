'use client';

import type { ImportedAccount } from '@repo/importers';
import { Button } from '@repo/ui/button';
import { toAccountData } from '@repo/vault';
import { useState } from 'react';
import { inputClass, Notice } from '@/components/ui';
import { findNewAccounts } from '@/features/add-account/import-accounts';
import { useVault } from '@/features/vault/vault-context';

/**
 * Settings → Import: paste otpauth:// links, a Google Authenticator export link
 * (otpauth-migration://), or an unencrypted 2FAS / Aegis JSON file. Everything stays on-device.
 */
export function ImportSection() {
  const vault = useVault();
  const [text, setText] = useState('');
  const [found, setFound] = useState<ImportedAccount[]>([]);
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const read = () => {
    setMsg(null);
    try {
      setFound(findNewAccounts(text, vault.accounts));
    } catch (e) {
      setMsg({
        tone: 'error',
        text:
          e instanceof Error && e.message.startsWith('Nothing new')
            ? e.message
            : 'We couldn’t read that. Paste an otpauth:// link, a Google export link, or an unencrypted 2FAS / Aegis file.',
      });
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      for (const a of found) await vault.save('account', toAccountData(a));
      setMsg({
        tone: 'success',
        text: `Added ${found.length} account${found.length === 1 ? '' : 's'}.`,
      });
      setFound([]);
      setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Moving from Google Authenticator, 2FAS or Aegis? Paste an export here — it’s read on this
        device only.
      </p>
      {found.length === 0 ? (
        <>
          <label className="sr-only" htmlFor="import-text">
            Export to import
          </label>
          <textarea
            id="import-text"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`${inputClass} font-mono text-xs`}
            placeholder="otpauth://totp/…  ·  otpauth-migration://offline?data=…  ·  2FAS / Aegis JSON"
          />
          <Button variant="secondary" disabled={!text.trim()} onClick={read}>
            Read accounts
          </Button>
        </>
      ) : (
        <>
          <ul className="max-h-48 space-y-1 overflow-auto text-sm">
            {found.map((a, i) => (
              <li key={i} className="rounded-lg bg-surface-muted px-3 py-1.5">
                <span className="font-medium">{a.issuer || '—'}</span>{' '}
                <span className="text-muted">{a.label}</span>
              </li>
            ))}
          </ul>
          <Button disabled={busy} onClick={save}>
            Add {found.length} account{found.length === 1 ? '' : 's'}
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
