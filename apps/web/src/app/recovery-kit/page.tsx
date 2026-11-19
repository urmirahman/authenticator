'use client';

import type { User } from '@repo/types';
import { LogoMark } from '@repo/ui/logo';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SITE_URL } from '@/lib/site-url';

/**
 * Printable "recovery kit" (emergency sheet). It contains how to get back in — sign-in address,
 * email, steps — and an EMPTY box where you may hand-write your master password.
 * We never put the password on it; it is never stored or sent anywhere.
 */
export default function RecoveryKitPage() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    api.users.me().then(setUser, () => undefined);
  }, []);

  return (
    <main id="main" className="mx-auto max-w-2xl p-6 print:p-0">
      <div className="mb-6 flex gap-3 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-md bg-accent px-4 py-2 font-semibold text-accent-fg"
        >
          Print / save as PDF
        </button>
        <a href="/settings" className="rounded-md px-4 py-2 ring-1 ring-line">
          Back to settings
        </a>
      </div>
      <article className="space-y-6 rounded-lg bg-white p-8 text-black ring-1 ring-line print:ring-0">
        <header className="flex items-center gap-3">
          <LogoMark size={44} />
          <div>
            <h1 className="text-2xl font-bold">Bloom recovery kit</h1>
            <p className="text-sm text-neutral-600">
              Created {new Date().toLocaleDateString()} · keep it somewhere safe and offline
            </p>
          </div>
        </header>
        <table className="w-full text-sm">
          <tbody>
            <tr>
              <th className="w-40 py-2 text-left">Sign-in address</th>
              <td>{SITE_URL}</td>
            </tr>
            <tr>
              <th className="py-2 text-left">Account email</th>
              <td>{user?.email ?? '—'}</td>
            </tr>
            <tr>
              <th className="py-2 text-left">Signed in with</th>
              <td>Google</td>
            </tr>
          </tbody>
        </table>
        <section>
          <h2 className="font-semibold">Master password</h2>
          <p className="text-sm text-neutral-600">
            Optional: write it by hand. Bloom never fills this in and cannot recover it.
          </p>
          <div className="mt-2 h-16 rounded-md border-2 border-dashed border-neutral-400" />
        </section>
        <section className="text-sm">
          <h2 className="font-semibold">If you lose access</h2>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Go to the sign-in address above and sign in with the same method and email.</li>
            <li>Enter your master password to unlock your vault.</li>
            <li>
              Forgot it? Restore from an encrypted backup (needs its backup password), or use each
              website&apos;s own backup codes to reset 2FA there.
            </li>
            <li>
              Lost a device? Sign it out under <strong>Devices</strong>.
            </li>
          </ol>
        </section>
        <p className="text-xs text-neutral-500">
          Anyone holding this sheet AND your password can open your vault. Store them carefully.
        </p>
      </article>
    </main>
  );
}
