'use client';

import type { OAuthProvider } from '@repo/types';
import { Button } from '@repo/ui/button';
import { Card } from '@repo/ui/card';
import { useState } from 'react';
import { api } from '@/lib/api';
import { signInWithPasskey } from './passkey';

const PROVIDERS: Array<{ id: OAuthProvider; label: string }> = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'apple', label: 'Continue with Apple' },
  { id: 'facebook', label: 'Continue with Facebook' },
];

export function SignInCard() {
  const [error, setError] = useState<string | null>(null);

  const startOAuth = (provider: OAuthProvider) => {
    window.location.href = api.auth.oauthStartUrl(provider, `${window.location.origin}/vault`);
  };

  return (
    <Card className="w-full max-w-sm space-y-3">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="text-sm text-slate-500">
        Your codes are encrypted on this device before they sync.
      </p>
      <Button onClick={() => signInWithPasskey().catch((e: Error) => setError(e.message))}>
        Sign in with a passkey
      </Button>
      <div className="py-1 text-center text-xs text-slate-400">or</div>
      {PROVIDERS.map((p) => (
        <Button key={p.id} variant="secondary" onClick={() => startOAuth(p.id)}>
          {p.label}
        </Button>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </Card>
  );
}
