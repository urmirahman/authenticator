'use client';

import { ApiError } from '@repo/api-client';
import { Button } from '@repo/ui/button';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Dialog, Field, inputClass } from '@/components/ui';
import { session } from '@/features/session/session';
import { useVault } from '@/features/vault/vault-context';
import { api } from '@/lib/api';

/**
 * Danger zone: permanent deletion (ADR 35).
 *  1. type DELETE, 2. re-enter the master password (checked locally; guards against accidents),
 *  3. the server requires a sign-in from the last 10 minutes; if older we ask you to sign in again.
 */
export function DeleteAccount() {
  const vault = useVault();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError(null);
    if (f.get('confirm') !== 'DELETE') return setError('Type DELETE in capitals to confirm.');
    setBusy(true);
    try {
      await vault.verifyPassword(String(f.get('password')));
      await api.users.deleteAccount('DELETE');
      vault.lock();
      session.clear();
      router.replace('/');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'reauth_required') setNeedsReauth(true);
      else setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const reauth = () => {
    vault.lock();
    session.clear();
    router.replace('/sign-in');
  };

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete account…
      </Button>
      {open && (
        <Dialog title="Delete your account" onClose={() => setOpen(false)}>
          {needsReauth ? (
            <div className="space-y-3 text-sm">
              <p>
                For your safety, deleting your account needs a fresh sign-in (within the last 10
                minutes).
              </p>
              <Button onClick={reauth}>Sign in again</Button>
              <p className="text-muted">Then come back to Settings → Delete account.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3 text-sm">
              <p>
                This permanently deletes your vault, backups, devices and activity from our servers.{' '}
                <strong>It can&apos;t be undone.</strong> Turn off 2FA on websites first, or move
                those accounts elsewhere with Transfer.
              </p>
              <Field label="Master password">
                <input
                  name="password"
                  type="password"
                  required
                  className={inputClass}
                  autoComplete="current-password"
                />
              </Field>
              <Field label='Type "DELETE" to confirm'>
                <input name="confirm" required className={inputClass} autoComplete="off" />
              </Field>
              <Button variant="danger" disabled={busy}>
                {busy ? 'Deleting…' : 'Permanently delete my account'}
              </Button>
              {error && (
                <p role="alert" className="text-danger">
                  {error}
                </p>
              )}
            </form>
          )}
        </Dialog>
      )}
    </>
  );
}
