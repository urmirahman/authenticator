'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { session } from '@/features/session/session';
import { UnlockScreen } from '@/features/vault/unlock-screen';
import { useAutoLock } from '@/features/vault/use-auto-lock';
import { useVault } from '@/features/vault/vault-context';
import { signOut } from '@/lib/api';

const NAV = [
  { href: '/vault', label: 'Codes' },
  { href: '/backups', label: 'Backups' },
  { href: '/transfer', label: 'Transfer' },
  { href: '/devices', label: 'Devices' },
  { href: '/activity', label: 'Activity' },
  { href: '/settings', label: 'Settings' },
];

/**
 * Wraps every signed-in page:
 *  1. not signed in -> go to /sign-in
 *  2. needsUnlock and the vault is locked -> show the master password screen instead of the page
 */
export function AppShell({
  children,
  needsUnlock = false,
}: {
  children: ReactNode;
  needsUnlock?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const vault = useVault();
  const [ready, setReady] = useState(false);
  useAutoLock();

  useEffect(() => {
    if (!session.isSignedIn()) {
      router.replace('/sign-in');
      return;
    }
    setReady(true);
    if (vault.status === 'loading') {
      vault.load().catch(() => {
        // refresh token rejected -> back to sign in
        if (!session.isSignedIn()) router.replace('/sign-in');
      });
    }
  }, [router, vault]);

  if (!ready) return null;

  const locked = vault.status === 'locked' || vault.status === 'needs-setup';
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <header className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-auto font-semibold">🔐 Authenticator</span>
        <nav className="flex gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3 py-1.5 ${pathname === n.href ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        {vault.status === 'unlocked' && (
          <button
            className="rounded-lg px-3 py-1.5 text-sm hover:bg-slate-200 dark:hover:bg-slate-800"
            onClick={vault.lock}
          >
            Lock
          </button>
        )}
        <button
          className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
          onClick={async () => {
            vault.lock();
            await signOut();
            router.replace('/sign-in');
          }}
        >
          Sign out
        </button>
      </header>
      {vault.status === 'loading' ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : needsUnlock && locked ? (
        <UnlockScreen />
      ) : (
        children
      )}
    </div>
  );
}
