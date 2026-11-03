'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, completeSignIn } from '@/lib/api';

/** The API redirects here with ?code=... (one-time, 60s). We swap it for tokens, then open the vault. */
export default function OAuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false); // React dev mode runs effects twice; a code can only be used once.

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) return setError(params.get('error') ?? 'Missing code');
    api.auth
      .exchange(code)
      .then(completeSignIn)
      .then(() => router.replace('/vault'))
      .catch((e: Error) => setError(e.message));
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-sm">
      {error ? (
        <p className="text-danger">
          Sign-in failed: {error}.{' '}
          <a className="underline" href="/sign-in">
            Try again
          </a>
        </p>
      ) : (
        <p className="text-muted">Signing you in…</p>
      )}
    </main>
  );
}
