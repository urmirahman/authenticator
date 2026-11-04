'use client';

import type { Device } from '@repo/types';
import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/ui';
import { useDialogs } from '@/components/dialogs';
import { session } from '@/features/session/session';
import { api } from '@/lib/api';

/** Every browser/phone you signed in on. "Sign out" revokes that device's session remotely. */
export function DevicesScreen() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = session.deviceId();

  const load = () => api.devices.list().then(setDevices, (e: Error) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const ask = useDialogs();

  const revoke = async (d: Device) => {
    const ok = await ask.confirm({
      title: `Sign out “${d.name}”?`,
      message: 'That device will need to sign in again to see your codes.',
      confirmLabel: 'Sign out',
      danger: true,
    });
    if (!ok) return;
    await api.devices.revoke(d.id).catch((e: Error) => setError(e.message));
    load();
  };

  return (
    <>
      <PageTitle>Devices</PageTitle>
      {error && <p className="mb-3 text-sm text-danger">{error}</p>}
      {!devices ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-xl bg-surface p-4 ring-1 ring-line"
            >
              <div>
                <p className="font-medium">
                  {d.name}{' '}
                  {d.id === current && <span className="text-xs text-success">(this device)</span>}
                </p>
                <p className="text-xs text-muted">
                  {d.platform} · last seen {new Date(d.lastSeenAt).toLocaleString()}
                </p>
              </div>
              {d.id !== current && (
                <button className="text-sm text-danger" onClick={() => revoke(d)}>
                  Sign out
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {ask.dialogs}
    </>
  );
}
