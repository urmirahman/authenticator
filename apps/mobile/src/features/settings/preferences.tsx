import { DEFAULT_PREFERENCES, parsePreferences, type Preferences } from '@repo/vault';
import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance } from 'react-native';

/** Device preferences (auto-lock, clipboard, theme). Shape and defaults are shared with web via @repo/vault. */
const KEY = 'preferences';

interface PrefsState extends Preferences {
  update(patch: Partial<Preferences>): void;
}

const Ctx = createContext<PrefsState | null>(null);

export function usePreferences() {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePreferences must be used inside <PreferencesProvider>');
  return v;
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    SecureStore.getItemAsync(KEY).then((json) => setPrefs(parsePreferences(json)));
  }, []);

  // Theme: override the OS setting, or follow it ("unspecified").
  useEffect(() => {
    Appearance.setColorScheme(prefs.theme === 'system' ? 'unspecified' : prefs.theme);
  }, [prefs.theme]);

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      SecureStore.setItemAsync(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(() => ({ ...prefs, update }), [prefs, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
