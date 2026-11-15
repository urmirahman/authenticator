'use client';

import { Button } from '@repo/ui/button';
import { Card } from '@repo/ui/card';
import { LogoMark } from '@repo/ui/logo';
import { strengthOf } from '@repo/vault';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/ui';
import { useVault } from './vault-context';

/** Minimum length for a new master password. Length beats complexity rules. */
const MIN_LENGTH = 10;

const INTRO = [
  {
    title: 'Encrypted on this device',
    body: 'Servers only see locked data.',
  },
  {
    title: 'One master password',
    body: 'It never leaves this device.',
  },
  {
    title: 'Nobody can open it',
    body: 'If you forget it, nobody can open the vault. Write it down.',
  },
];

/**
 * First visit: a short 3-step explainer, then choose a master password (creates the encrypted vault).
 * Later visits: type it to unlock. Argon2id runs in the browser and takes ~1s on purpose.
 */
export function UnlockScreen() {
  const vault = useVault();
  const isSetup = vault.status === 'needs-setup';
  const [step, setStep] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const strength = strengthOf(password);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null);
    if (isSetup) {
      if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
      if (password !== f.get('confirm')) return setError('Passwords do not match.');
      if (!acknowledged)
        return setError('Please confirm you understand the password can’t be recovered.');
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 30)); // let "Working…" paint before heavy key derivation
    try {
      await (isSetup ? vault.setup(password) : vault.unlock(password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  if (isSetup && step < INTRO.length) {
    const s = INTRO[step]!;
    return (
      <Card className="mx-auto max-w-md space-y-5 text-center">
        <div className="flex justify-center">
          <LogoMark size={56} />
        </div>
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          Step {step + 1} of {INTRO.length + 1}
        </p>
        <h1 className="text-2xl font-bold">{s.title}</h1>
        <p className="text-muted">{s.body}</p>
        <Button onClick={() => setStep(step + 1)}>
          {step === INTRO.length - 1 ? 'Choose my password' : 'Next'}
        </Button>
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">
        {isSetup ? 'Create your master password' : 'Unlock your vault'}
      </h1>
      <p className="text-sm text-muted">
        {isSetup
          ? 'Tip: four or more random words make a strong, memorable passphrase.'
          : 'Your codes are decrypted only on this device.'}
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Master password">
          <input
            name="password"
            type="password"
            autoFocus
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete={isSetup ? 'new-password' : 'current-password'}
            aria-describedby={isSetup ? 'pw-strength' : undefined}
          />
        </Field>
        {isSetup && (
          <>
            <div id="pw-strength" aria-live="polite" className="flex items-center gap-2 text-xs">
              <div className="flex flex-1 gap-1" aria-hidden>
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${strength.score >= i ? 'bg-accent' : 'bg-surface-muted'}`}
                  />
                ))}
              </div>
              <span className="text-muted">{password ? strength.label : ''}</span>
            </div>
            <Field label="Confirm">
              <input
                name="confirm"
                type="password"
                required
                className={inputClass}
                autoComplete="new-password"
              />
            </Field>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 accent-(--bloom-accent)"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              <span>I understand Bloom can&apos;t reset or recover my master password.</span>
            </label>
          </>
        )}
        <Button disabled={busy}>{busy ? 'Working…' : isSetup ? 'Create vault' : 'Unlock'}</Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {isSetup && (
        <p className="text-xs text-muted">
          After creating your vault, print your{' '}
          <Link href="/recovery-kit" className="text-accent underline">
            recovery kit
          </Link>{' '}
          (also in Settings).
        </p>
      )}
    </Card>
  );
}
