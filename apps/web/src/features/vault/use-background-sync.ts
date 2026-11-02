'use client';

import { useEffect } from 'react';
import { useVault } from './vault-context';

/** Pull changes from other devices every 30s and whenever the tab becomes visible again. */
export function useBackgroundSync(intervalMs = 30_000) {
  const { status, sync } = useVault();
  useEffect(() => {
    if (status !== 'unlocked') return;
    const id = setInterval(sync, intervalMs);
    const onVisible = () => document.visibilityState === 'visible' && sync();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [status, sync, intervalMs]);
}
