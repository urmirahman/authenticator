'use client';

import { friendlyPasskeyError, type FriendlyError } from '@repo/vault/passkey-errors';

import type { OAuthProvider } from '@repo/types';
import { Button } from '@repo/ui/button';
import { Card } from '@repo/ui/card';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Field, inputClass, Notice } from '@/components/ui';
import { api, completeSignIn, DEV_AUTH } from '@/lib/api';
import { signInWithPasskey } from './passkey';

/** Small key icon for the passkey button (inherits the button's text colour). */
function KeyIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="M10.7 12.3 21 2" />
      <path d="m16 7 3 3" />
      <path d="m19 4 2 2" />
    </svg>
  );
}

/** Official multicolour Google "G" mark (brand guidelines: keep its colours). */
function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/** Google is the only sign-in provider for launch (ADR 39). Server code for others stays, unregistered. */
const PROVIDERS: Array<{ id: OAuthProvider; label: string }> = [
  { id: 'google', label: 'Continue with Google' },
];

/**
 * OAuth flow (web): we send the browser to the API, the API sends it to Google,
 * which sends it back to the API, which finally redirects to /auth/callback?code=... (one-time code).
 */
export function SignInCard() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<FriendlyError | null>(null);

  const startOAuth = (provider: OAuthProvider) => {
    window.location.href = api.auth.oauthStartUrl(
      provider,
      `${window.location.origin}/auth/callback`,
    );
  };

  const passkey = () => {
    setNotice(null);
    signInWithPasskey()
      .then(() => router.replace('/vault'))
      .catch((e: unknown) => setNotice(friendlyPasskeyError(e, 'signin')));
  };

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
      <Button onClick={passkey}>
        <span className="inline-flex items-center justify-center gap-2">
          <KeyIcon />
          Sign in with a passkey
        </span>
      </Button>
      <div className="py-1 text-center text-xs text-muted">or</div>
      {PROVIDERS.map((p) => (
        <Button key={p.id} variant="secondary" onClick={() => startOAuth(p.id)}>
          <span className="inline-flex items-center justify-center gap-2">
            {p.id === 'google' && <GoogleIcon />}
            {p.label}
          </span>
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
      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.message}
        </Notice>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </Card>
  );
}
