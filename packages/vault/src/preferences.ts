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
  /** Gentle vibration on copy and other actions (mobile). */
  haptics: boolean;
  /** Show codes as "123 456" instead of "123456". */
  groupDigits: boolean;
  /** Code text size in the list. */
  codeSize: 'compact' | 'large';
  /** Also show the upcoming code near the end of each period. */
  showNextCode: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
  theme: 'system',
  haptics: true,
  groupDigits: true,
  codeSize: 'large',
  showNextCode: false,
};

export const CODE_SIZE_OPTIONS = ['compact', 'large'] as const;

export const AUTO_LOCK_OPTIONS = [1, 5, 15, 60, 0] as const;
export const CLIPBOARD_CLEAR_OPTIONS = [15, 30, 60, 0] as const;

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

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
      haptics: bool(v.haptics, DEFAULT_PREFERENCES.haptics),
      groupDigits: bool(v.groupDigits, DEFAULT_PREFERENCES.groupDigits),
      codeSize: v.codeSize === 'compact' ? 'compact' : 'large',
      showNextCode: bool(v.showNextCode, DEFAULT_PREFERENCES.showNextCode),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export const minutesLabel = (m: number) => (m === 0 ? 'Never' : `${m} min`);
export const secondsLabel = (s: number) => (s === 0 ? 'Never' : `${s} s`);

/** "123456" -> "123 456", "12345678" -> "1234 5678" (3-3 / 4-4); other lengths unchanged. */
export function formatCode(code: string, group: boolean): string {
  if (!group) return code;
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
  if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`;
  return code;
}
