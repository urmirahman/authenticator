'use client';

import { issuerIcon, issuerInitials } from '@repo/importers';
import { CountdownRing } from '@repo/ui/countdown-ring';
import { useState } from 'react';
import { useSettings } from '@/features/settings/settings';
import type { AccountData, Decrypted, FolderData } from '@repo/vault';
import { copyCode } from './copy';
import { useVault } from '@/features/vault/vault-context';
import { hotpCode, useTotp } from './use-totp';

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
  const isHotp = a.type === 'hotp';
  const live = useTotp(a);
  const code = isHotp ? hotpCode(a) : live.code;
  const vault = useVault();
  const [advancing, setAdvancing] = useState(false);

  /** HOTP: bump the counter and sync it, so every device shows the same next code. */
  const nextHotp = async () => {
    setAdvancing(true);
    try {
      await vault.save('account', { ...a, counter: (a.counter ?? 0) + 1 }, account.id);
    } finally {
      setAdvancing(false);
    }
  };
  const { clipboardClearSeconds } = useSettings();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await copyCode(code, clipboardClearSeconds);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <li className="flex items-center gap-3 rounded-xl bg-surface p-4 ring-1 ring-line">
      <IssuerBadge issuer={a.issuer || a.label} />
      <button className="min-w-0 flex-1 text-left" onClick={copy} title="Click to copy">
        <p className="truncate text-sm text-muted">
          {a.issuer} {a.label && <span className="text-muted">· {a.label}</span>}
        </p>
        <p className="font-mono text-2xl tracking-widest">
          {code.replace(/(\d{3})(?=\d)/g, '$1 ')}
        </p>
        {copied && <p className="text-xs text-success">Copied</p>}
      </button>
      {isHotp ? (
        <button
          className="rounded-lg px-2 py-1 text-xs text-accent ring-1 ring-accent/30 disabled:opacity-50"
          onClick={nextHotp}
          disabled={advancing}
          title={`Counter ${a.counter ?? 0}`}
        >
          Next
        </button>
      ) : (
        <CountdownRing remaining={live.remaining} period={a.period} />
      )}
      <button
        className="text-sm text-muted hover:text-fg"
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
    return <p className="py-10 text-center text-sm text-muted">No accounts here yet.</p>;
  }
  return (
    <ul className="space-y-3">
      {props.accounts.map((a) => (
        <CodeRow key={a.id} account={a} folders={props.folders} onEdit={props.onEdit} />
      ))}
    </ul>
  );
}
