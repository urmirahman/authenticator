'use client';

import { Button } from '@repo/ui/button';
import { Card } from '@repo/ui/card';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/ui';
import { useVault } from './vault-context';

/** Minimum length for a new master password. Length beats complexity rules. */
const MIN_LENGTH = 10;

/**
 * First visit: choose a master password (creates the encrypted vault).
 * Later visits: type it to unlock. Argon2id runs in the browser and takes ~1s on purpose,
 * which makes guessing passwords slow for attackers too.
 */
export function UnlockScreen() {
  const vault = useVault();
  const isSetup = vault.status === 'needs-setup';
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password'));
    setError(null);
    if (isSetup) {
      if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
      if (password !== f.get('confirm')) return setError('Passwords do not match.');
    }
    setBusy(true);
    // Let React paint "Working…" before the CPU-heavy key derivation blocks the thread.
    await new Promise((r) => setTimeout(r, 30));
    try {
      await (isSetup ? vault.setup(password) : vault.unlock(password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto max-w-sm space-y-4 dark:bg-slate-900 dark:ring-slate-800">
      <h1 className="text-xl font-semibold">
        {isSetup ? 'Create your master password' : 'Unlock your vault'}
      </h1>
      <p className="text-sm text-slate-500">
        {isSetup
          ? 'It encrypts your codes on this device. We never see it and cannot reset it, so store it somewhere safe.'
          : 'Your codes are decrypted only on this device.'}
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Master password">
          <input
            name="password"
            type="password"
            autoFocus
            required
            className={inputClass}
            autoComplete={isSetup ? 'new-password' : 'current-password'}
          />
        </Field>
        {isSetup && (
          <Field label="Confirm">
            <input
              name="confirm"
              type="password"
              required
              className={inputClass}
              autoComplete="new-password"
            />
          </Field>
        )}
        <Button disabled={busy}>{busy ? 'Working…' : isSetup ? 'Create vault' : 'Unlock'}</Button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </Card>
  );
}
