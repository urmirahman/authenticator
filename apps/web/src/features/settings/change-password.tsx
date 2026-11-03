'use client';

import { Button } from '@repo/ui/button';
import { useState, type FormEvent } from 'react';
import { Field, inputClass } from '@/components/ui';
import { useVault } from '@/features/vault/vault-context';

/** Re-wraps the vault key with a new master password (see vault-context changePassword). */
export function ChangePasswordForm() {
  const vault = useVault();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const next = String(f.get('next'));
    if (next.length < 10) return setMsg('Use at least 10 characters.');
    if (next !== f.get('confirm')) return setMsg('New passwords do not match.');
    setBusy(true);
    setMsg(null);
    await new Promise((r) => setTimeout(r, 30));
    try {
      await vault.changePassword(String(f.get('current')), next);
      form.reset();
      setMsg('Master password changed. Use the new one on all your devices.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  if (vault.status !== 'unlocked')
    return <p className="text-sm text-muted">Unlock the vault first.</p>;
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Current master password">
        <input
          name="current"
          type="password"
          required
          className={inputClass}
          autoComplete="current-password"
        />
      </Field>
      <Field label="New master password">
        <input
          name="next"
          type="password"
          required
          className={inputClass}
          autoComplete="new-password"
        />
      </Field>
      <Field label="Confirm new password">
        <input
          name="confirm"
          type="password"
          required
          className={inputClass}
          autoComplete="new-password"
        />
      </Field>
      <Button variant="secondary" disabled={busy}>
        {busy ? 'Working…' : 'Change master password'}
      </Button>
      {msg && <p className="text-sm">{msg}</p>}
    </form>
  );
}
