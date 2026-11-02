'use client';

import { useEffect } from 'react';
import { useSettings } from '@/features/settings/settings';
import { useVault } from './vault-context';

/** Locks the vault after N idle minutes (no mouse / keyboard / touch). */
export function useAutoLock() {
  const { autoLockMinutes } = useSettings();
  const { status, lock } = useVault();

  useEffect(() => {
    if (status !== 'unlocked' || autoLockMinutes <= 0) return;
    let timer = setTimeout(lock, autoLockMinutes * 60_000);
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(lock, autoLockMinutes * 60_000);
    };
    const events = ['mousemove', 'keydown', 'pointerdown', 'scroll'] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [status, autoLockMinutes, lock]);
}
