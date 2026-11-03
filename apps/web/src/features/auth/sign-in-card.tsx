'use client';

import type { OAuthProvider } from '@repo/types';
import { Button } from '@repo/ui/button';
import { Card } from '@repo/ui/card';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/ui';
import { api, completeSignIn, DEV_AUTH } from '@/lib/api';
import { signInWithPasskey } from './passkey';

const PROVIDERS: Array<{ id: OAuthProvider; label: string }> = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'apple', label: 'Continue with Apple' },
  { id: 'facebook', label: 'Continue with Facebook' },
];

/**
 * OAuth flow (web): we send the browser to the API, the API sends it to Google/Apple/Facebook,
 * which sends it back to the API, which finally redirects to /auth/callback?code=... (one-time code).
 */
export function SignInCard() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const startOAuth = (provider: OAuthProvider) => {
    window.location.href = api.auth.oauthStartUrl(
      provider,
      `${window.location.origin}/auth/callback`,
    );
  };

  const passkey = () =>
    signInWithPasskey()
      .then(() => router.replace('/vault'))
      .catch((e: Error) => setError(e.message));

  const devLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email'));
    api.dev
      .token(email, email.split('@')[0])
      .then(completeSignIn)
      .then(() => router.replace('/vault'))
      .catch((err: Error) => setError(err.message));
  };

  return (
    <Card className="w-full max-w-sm space-y-3">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="text-sm text-muted">
        Your codes are encrypted on this device before they sync.
      </p>
      <Button onClick={passkey}>Sign in with a passkey</Button>
      <div className="py-1 text-center text-xs text-muted">or</div>
      {PROVIDERS.map((p) => (
        <Button key={p.id} variant="secondary" onClick={() => startOAuth(p.id)}>
          {p.label}
        </Button>
      ))}
      {DEV_AUTH && (
        <form onSubmit={devLogin} className="space-y-2 border-t border-dashed border-line pt-3">
          <Field label="Dev login (DEV_AUTH only)">
            <input
              name="email"
              type="email"
              required
              defaultValue="dev@example.com"
              className={inputClass}
            />
          </Field>
          <Button variant="ghost">Dev sign in</Button>
        </form>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
