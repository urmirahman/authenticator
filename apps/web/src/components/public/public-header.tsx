'use client';

import { Logo } from '@repo/ui/logo';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { session } from '@/features/session/session';

/** Header for public pages. Shows "Open vault" instead of "Sign in" when already signed in. */
export function PublicHeader() {
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => setSignedIn(session.isSignedIn()), []);
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" aria-label="Bloom Authenticator home" className="mr-auto rounded-md">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden gap-5 text-sm text-muted sm:flex">
          <Link href="/#how" className="hover:text-fg">
            How it works
          </Link>
          <Link href="/security" className="hover:text-fg">
            Security
          </Link>
          <Link href="/help" className="hover:text-fg">
            Help
          </Link>
        </nav>
        <Link
          href={signedIn ? '/vault' : '/sign-in'}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-fg hover:opacity-90"
        >
          {signedIn ? 'Open vault' : 'Sign in'}
        </Link>
      </div>
    </header>
  );
}
