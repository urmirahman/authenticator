/**
 * Per-device preferences shared by web and mobile (each platform stores them its own way).
 * Nothing secret lives here.
 */
export interface Preferences {
  /** Lock the vault after this many idle / background minutes (0 = never). */
  autoLockMinutes: number;
  /** Clear the clipboard this many seconds after copying a code (0 = never). */
  clipboardClearSeconds: number;
  theme: 'system' | 'light' | 'dark';
}

export const DEFAULT_PREFERENCES: Preferences = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
  theme: 'system',
};

export const AUTO_LOCK_OPTIONS = [1, 5, 15, 60, 0] as const;
export const CLIPBOARD_CLEAR_OPTIONS = [15, 30, 60, 0] as const;

/** Merge stored JSON over defaults, ignoring junk. */
export function parsePreferences(json: string | null | undefined): Preferences {
  try {
    const v = JSON.parse(json ?? '{}') as Partial<Preferences>;
    return {
      autoLockMinutes:
        typeof v.autoLockMinutes === 'number'
          ? v.autoLockMinutes
          : DEFAULT_PREFERENCES.autoLockMinutes,
      clipboardClearSeconds:
        typeof v.clipboardClearSeconds === 'number'
          ? v.clipboardClearSeconds
          : DEFAULT_PREFERENCES.clipboardClearSeconds,
      theme: v.theme === 'light' || v.theme === 'dark' ? v.theme : 'system',
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export const minutesLabel = (m: number) => (m === 0 ? 'Never' : `${m} min`);
export const secondsLabel = (s: number) => (s === 0 ? 'Never' : `${s} s`);
