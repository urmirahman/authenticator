'use client';

import { DEFAULT_PREFERENCES, parsePreferences, type Preferences } from '@repo/vault';
import { useEffect, useSyncExternalStore } from 'react';

/** Per-browser preferences (shape + defaults shared with mobile in @repo/vault). */
export type Settings = Preferences;

const KEY = 'settings';
export const DEFAULT_SETTINGS = DEFAULT_PREFERENCES;

const listeners = new Set<() => void>();
let cache: Settings | null = null;

function read(): Settings {
  if (cache) return cache;
  cache = parsePreferences(localStorage.getItem(KEY));
  return cache;
}

export function updateSettings(patch: Partial<Settings>) {
  cache = { ...read(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(cache));
  listeners.forEach((l) => l());
}

/** React hook: re-renders when settings change (useSyncExternalStore = subscribe to a non-React store). */
export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => DEFAULT_SETTINGS,
  );
}

/** Adds/removes the "dark" class on <html>, following the OS when theme is "system". */
export function useApplyTheme() {
  const { theme } = useSettings();
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () =>
      document.documentElement.classList.toggle(
        'dark',
        theme === 'dark' || (theme === 'system' && mq.matches),
      );
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}
