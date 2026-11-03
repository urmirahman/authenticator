'use client';

import { LogoMark } from '@repo/ui/logo';
import Link from 'next/link';

/** Shown when a page crashes. Your vault data is safe: nothing is lost by reloading. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <LogoMark size={64} />
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="max-w-md text-muted">
        Your vault is safe — nothing was changed. Try again, or reload the page.
        {error.digest && (
          <span className="mt-2 block font-mono text-xs">Error id: {error.digest}</span>
        )}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 font-semibold text-accent-fg"
        >
          Try again
        </button>
        <Link href="/" className="rounded-md px-4 py-2 font-semibold ring-1 ring-line">
          Home
        </Link>
      </div>
    </main>
  );
}
