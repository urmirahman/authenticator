'use client';

import type { Passkey } from '@repo/types';
import { Button } from '@repo/ui/button';
import { useEffect, useState } from 'react';
import { Field, inputClass, PageTitle } from '@/components/ui';
import { passkeysSupported, registerPasskey } from '@/features/auth/passkey';
import { api } from '@/lib/api';
import { ChangePasswordForm } from './change-password';
import { updateSettings, useSettings, type Settings } from './settings';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl bg-surface p-5 ring-1 ring-line">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsScreen() {
  const s = useSettings();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const loadPasskeys = () => api.passkeys.list().then(setPasskeys, () => undefined);
  useEffect(() => {
    loadPasskeys();
  }, []);

  const num = (k: keyof Settings) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    updateSettings({ [k]: Number(e.target.value) });

  const addPasskey = async () => {
    const name = prompt('Name this passkey', 'My laptop');
    if (!name) return;
    try {
      await registerPasskey(name);
      setMsg('Passkey added');
      loadPasskeys();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    }
  };

  /** "Download my data": saves the server's JSON export as a file. */
  const exportData = async () => {
    const data = await api.users.exportData();
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: 'authenticator-export.json',
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <PageTitle>Settings</PageTitle>

      <Section title="Security">
        <Field label="Auto-lock after inactivity">
          <select
            value={s.autoLockMinutes}
            onChange={num('autoLockMinutes')}
            className={inputClass}
          >
            {[1, 5, 15, 60, 0].map((m) => (
              <option key={m} value={m}>
                {m === 0 ? 'Never' : `${m} min`}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Clear clipboard after copying a code">
          <select
            value={s.clipboardClearSeconds}
            onChange={num('clipboardClearSeconds')}
            className={inputClass}
          >
            {[15, 30, 60, 0].map((v) => (
              <option key={v} value={v}>
                {v === 0 ? 'Never' : `${v} s`}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Appearance">
        <div className="flex gap-2">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <Button
              key={t}
              variant={s.theme === t ? 'primary' : 'secondary'}
              onClick={() => updateSettings({ theme: t })}
            >
              {t[0]!.toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
      </Section>

      <Section title="Master password">
        <ChangePasswordForm />
      </Section>

      <Section title="Passkeys">
        <ul className="space-y-1 text-sm">
          {passkeys.map((p) => (
            <li key={p.id} className="flex items-center">
              <span>
                {p.name}{' '}
                <span className="text-xs text-muted">
                  added {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </span>
              <button
                className="ml-auto mr-3 text-accent"
                onClick={() => {
                  const name = prompt('Rename passkey', p.name)?.trim();
                  if (name && name !== p.name) api.passkeys.rename(p.id, name).then(loadPasskeys);
                }}
              >
                Rename
              </button>
              <button
                className="text-danger"
                onClick={() =>
                  confirm(`Remove ${p.name}?`) && api.passkeys.remove(p.id).then(loadPasskeys)
                }
              >
                Remove
              </button>
            </li>
          ))}
          {passkeys.length === 0 && <li className="text-muted">No passkeys yet.</li>}
        </ul>
        {passkeysSupported() && (
          <Button variant="secondary" onClick={addPasskey}>
            Add a passkey
          </Button>
        )}
        {msg && <p className="text-sm">{msg}</p>}
      </Section>

      <Section title="Your data">
        <Button variant="secondary" onClick={exportData}>
          Download my data (JSON)
        </Button>
      </Section>
    </div>
  );
}
