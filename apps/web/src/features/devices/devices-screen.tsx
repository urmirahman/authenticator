'use client';

import type { Device } from '@repo/types';
import { useEffect, useState } from 'react';
import { PageTitle } from '@/components/ui';
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

  const revoke = async (d: Device) => {
    if (!confirm(`Sign out "${d.name}"?`)) return;
    await api.devices.revoke(d.id).catch((e: Error) => setError(e.message));
    load();
  };

  return (
    <>
      <PageTitle>Devices</PageTitle>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {!devices ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ul className="space-y-2">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between rounded-xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"
            >
              <div>
                <p className="font-medium">
                  {d.name}{' '}
                  {d.id === current && (
                    <span className="text-xs text-emerald-600">(this device)</span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {d.platform} · last seen {new Date(d.lastSeenAt).toLocaleString()}
                </p>
              </div>
              {d.id !== current && (
                <button className="text-sm text-red-600" onClick={() => revoke(d)}>
                  Sign out
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
