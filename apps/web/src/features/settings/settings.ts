'use client';

import { useEffect, useSyncExternalStore } from 'react';

/** Per-browser preferences. Nothing secret, so localStorage is fine. */
export interface Settings {
  /** Lock the vault after this many idle minutes (0 = never). */
  autoLockMinutes: number;
  /** Clear the clipboard this many seconds after copying a code (0 = never). */
  clipboardClearSeconds: number;
  theme: 'system' | 'light' | 'dark';
}

const KEY = 'settings';
export const DEFAULT_SETTINGS: Settings = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
  theme: 'system',
};

const listeners = new Set<() => void>();
let cache: Settings | null = null;

function read(): Settings {
  if (cache) return cache;
  try {
    cache = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    cache = DEFAULT_SETTINGS;
  }
  return cache!;
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
