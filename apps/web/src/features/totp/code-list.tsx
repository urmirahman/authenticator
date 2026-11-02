'use client';

import { issuerIcon, issuerInitials } from '@repo/importers';
import { CountdownRing } from '@repo/ui/countdown-ring';
import { useState } from 'react';
import { useSettings } from '@/features/settings/settings';
import type { AccountData, Decrypted, FolderData } from '@/features/vault/vault-codec';
import { copyCode } from './copy';
import { useTotp } from './use-totp';

/** Colored circle with initials. Brand color comes from the bundled issuer map (no network). */
function IssuerBadge({ issuer }: { issuer: string }) {
  const icon = issuerIcon(issuer);
  return (
    <span
      className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
      style={{ backgroundColor: icon ? `#${icon.color.replace('#', '')}` : '#64748b' }}
      aria-hidden
    >
      {issuerInitials(issuer || '?')}
    </span>
  );
}

interface RowProps {
  account: Decrypted<AccountData>;
  folders: Decrypted<FolderData>[];
  onEdit: (a: Decrypted<AccountData>) => void;
}

function CodeRow({ account, onEdit }: RowProps) {
  const a = account.data;
  const { code, remaining } = useTotp(a);
  const { clipboardClearSeconds } = useSettings();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await copyCode(code, clipboardClearSeconds);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <li className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <IssuerBadge issuer={a.issuer || a.label} />
      <button className="min-w-0 flex-1 text-left" onClick={copy} title="Click to copy">
        <p className="truncate text-sm text-slate-500">
          {a.issuer} {a.label && <span className="text-slate-400">· {a.label}</span>}
        </p>
        <p className="font-mono text-2xl tracking-widest">
          {a.type === 'hotp' ? 'HOTP (not yet)' : code.replace(/(\d{3})(?=\d)/g, '$1 ')}
        </p>
        {copied && <p className="text-xs text-emerald-600">Copied</p>}
      </button>
      <CountdownRing remaining={remaining} period={a.period} />
      <button
        className="text-sm text-slate-400 hover:text-slate-700"
        onClick={() => onEdit(account)}
        aria-label="Edit"
      >
        ✎
      </button>
    </li>
  );
}

export function CodeList(
  props: { accounts: Decrypted<AccountData>[] } & Omit<RowProps, 'account'>,
) {
  if (props.accounts.length === 0) {
    return <p className="py-10 text-center text-sm text-slate-500">No accounts here yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {props.accounts.map((a) => (
        <CodeRow key={a.id} account={a} folders={props.folders} onEdit={props.onEdit} />
      ))}
    </ul>
  );
}
