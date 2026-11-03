'use client';

import { Logo } from '@repo/ui/logo';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { session } from '@/features/session/session';
import { UnlockScreen } from '@/features/vault/unlock-screen';
import { useAutoLock } from '@/features/vault/use-auto-lock';
import { useVault } from '@/features/vault/vault-context';
import { signOut } from '@/lib/api';

const NAV = [
  { href: '/vault', label: 'Codes', icon: '🔢' },
  { href: '/backups', label: 'Backups', icon: '🛟' },
  { href: '/transfer', label: 'Transfer', icon: '📲' },
  { href: '/devices', label: 'Devices', icon: '💻' },
  { href: '/activity', label: 'Activity', icon: '🕘' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];
/** Shown in the phone-width bottom bar; the rest live in the menu drawer. */
const BOTTOM = ['/vault', '/backups', '/settings'];

/**
 * Wraps every signed-in page:
 *  1. not signed in -> go to /sign-in
 *  2. needsUnlock and the vault is locked -> show the master password screen instead of the page
 * Layout: top bar with inline nav on wide screens; on phones a menu drawer plus a bottom tab bar.
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
  const [menuOpen, setMenuOpen] = useState(false);
  useAutoLock();

  useEffect(() => {
    if (!session.isSignedIn()) {
      router.replace('/sign-in');
      return;
    }
    setReady(true);
    if (vault.status === 'loading') {
      vault.load().catch(() => {
        if (!session.isSignedIn()) router.replace('/sign-in');
      });
    }
  }, [router, vault]);

  // Close the drawer on navigation and with Escape.
  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!ready) return null;

  const doSignOut = async () => {
    vault.lock();
    await signOut();
    router.replace('/sign-in');
  };

  const navLink = (n: (typeof NAV)[number], extra = '') => (
    <Link
      key={n.href}
      href={n.href}
      aria-current={pathname === n.href ? 'page' : undefined}
      className={`rounded-md px-3 py-2 ${pathname === n.href ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:bg-surface-muted hover:text-fg'} ${extra}`}
    >
      {n.label}
    </Link>
  );

  const locked = vault.status === 'locked' || vault.status === 'needs-setup';
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Link href="/vault" className="mr-auto" aria-label="Bloom: your codes">
            <Logo />
          </Link>
          <nav aria-label="App" className="hidden gap-1 text-sm md:flex">
            {NAV.map((n) => navLink(n))}
          </nav>
          {vault.status === 'unlocked' && (
            <button
              className="rounded-md px-3 py-2 text-sm hover:bg-surface-muted"
              onClick={vault.lock}
              aria-label="Lock vault"
            >
              🔒 <span className="hidden sm:inline">Lock</span>
            </button>
          )}
          <button
            className="hidden rounded-md px-3 py-2 text-sm text-muted hover:bg-surface-muted md:block"
            onClick={doSignOut}
          >
            Sign out
          </button>
          <button
            className="rounded-md px-3 py-2 text-xl md:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="app-drawer"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="app-drawer"
            className="absolute top-0 right-0 flex h-full w-72 max-w-[85vw] flex-col gap-1 bg-surface p-4 shadow-xl motion-safe:animate-[slidein_.18s_ease-out]"
          >
            <button
              className="mb-2 self-end rounded-md px-3 py-2"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            >
              ✕
            </button>
            {NAV.map((n) => navLink(n, 'text-base'))}
            <hr className="my-3 border-line" />
            <Link href="/help" className="rounded-md px-3 py-2 text-muted hover:bg-surface-muted">
              Help
            </Link>
            <Link
              href="/privacy"
              className="rounded-md px-3 py-2 text-muted hover:bg-surface-muted"
            >
              Privacy
            </Link>
            <button
              className="mt-auto rounded-md px-3 py-2 text-left text-danger hover:bg-surface-muted"
              onClick={doSignOut}
            >
              Sign out
            </button>
          </nav>
        </div>
      )}

      <main id="main" className="mx-auto max-w-2xl p-4 sm:p-6">
        {vault.status === 'loading' ? (
          <div role="status" className="space-y-3" aria-label="Loading">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : needsUnlock && locked ? (
          <UnlockScreen />
        ) : (
          children
        )}
      </main>

      <nav
        aria-label="Quick"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV.filter((n) => BOTTOM.includes(n.href)).map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={pathname === n.href ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${pathname === n.href ? 'font-semibold text-accent' : 'text-muted'}`}
          >
            <span aria-hidden className="text-lg">
              {n.icon}
            </span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
