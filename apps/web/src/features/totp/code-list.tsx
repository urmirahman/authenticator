'use client';

import type { TotpAccount } from '@repo/types';
import { CountdownRing } from '@repo/ui/countdown-ring';
import { useTotp } from './use-totp';

function CodeRow({ account }: { account: TotpAccount }) {
  const { code, remaining } = useTotp(account);
  return (
    <li className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div>
        <p className="text-sm text-slate-500">{account.issuer}</p>
        <p className="text-xs text-slate-400">{account.label}</p>
        <p className="font-mono text-2xl tracking-widest">
          {code.replace(/(\d{3})(?=\d)/g, '$1 ')}
        </p>
      </div>
      <CountdownRing remaining={remaining} period={account.period} />
    </li>
  );
}

export function CodeList({ accounts }: { accounts: TotpAccount[] }) {
  return (
    <ul className="space-y-3">
      {accounts.map((a) => (
        <CodeRow key={a.id} account={a} />
      ))}
    </ul>
  );
}
