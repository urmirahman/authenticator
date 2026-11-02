'use client';

import { toGoogleMigration } from '@repo/importers';
import { Button } from '@repo/ui/button';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/ui';
import { toImported } from '@repo/vault';
import { useVault } from '@/features/vault/vault-context';

/**
 * Move accounts to a new phone: shows Google Authenticator-style "otpauth-migration" QR codes
 * (10 accounts per code). Google Authenticator, Aegis, 2FAS and this app's mobile version can scan them.
 * These QR codes contain your secrets in plain form, so they are hidden until you confirm.
 */
export function TransferScreen() {
  const vault = useVault();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!revealed) return setImages([]);
    const chosen = vault.accounts.filter((a) => selected.has(a.id)).map((a) => toImported(a.data));
    Promise.all(
      toGoogleMigration(chosen).map((uri) => QRCode.toDataURL(uri, { margin: 2, width: 320 })),
    ).then(setImages);
  }, [revealed, selected, vault.accounts]);

  // Hide automatically when you leave the tab.
  useEffect(() => {
    const hide = () => document.visibilityState === 'hidden' && setRevealed(false);
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (revealed && images.length > 0) {
    return (
      <div className="space-y-4 text-center">
        <PageTitle>
          Scan code {page + 1} of {images.length}
        </PageTitle>
        {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated locally */}
        <img
          src={images[page]}
          alt="Transfer QR code"
          className="mx-auto rounded-xl bg-white"
          width={320}
          height={320}
        />
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={page === images.length - 1}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
        <Button onClick={() => (setRevealed(false), setPage(0))}>Done, hide codes</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageTitle>Transfer to another phone</PageTitle>
      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:ring-amber-900">
        ⚠️ These QR codes contain your secret keys unencrypted. Anyone who sees or photographs them
        can generate your codes. Make sure nobody is watching and you are not screen-sharing.
      </div>
      <div className="flex gap-3 text-sm">
        <button
          className="text-indigo-600"
          onClick={() => setSelected(new Set(vault.accounts.map((a) => a.id)))}
        >
          Select all
        </button>
        <button className="text-slate-500" onClick={() => setSelected(new Set())}>
          Clear
        </button>
      </div>
      <ul className="space-y-1">
        {vault.accounts.map((a) => (
          <li key={a.id}>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
              {a.data.issuer} <span className="text-slate-400">{a.data.label}</span>
            </label>
          </li>
        ))}
      </ul>
      <Button disabled={selected.size === 0} onClick={() => setRevealed(true)}>
        Show {Math.ceil(selected.size / 10) || ''} QR code(s) for {selected.size} account(s)
      </Button>
    </div>
  );
}
