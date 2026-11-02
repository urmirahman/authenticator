import * as LocalAuthentication from 'expo-local-authentication';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVault } from '@/features/vault/vault-store';

/** After this long in the background, forget the vault key (master password needed again). */
const HARD_LOCK_MS = 5 * 60_000;

/**
 * Three protections:
 * 1. Screenshots / screen recording are blocked (Android) or blanked (iOS) via expo-screen-capture.
 * 2. App-switcher privacy: when the app goes inactive we cover it, so the codes don't show in the
 *    task switcher thumbnail.
 * 3. Biometric app lock: coming back from the background asks for Face ID / fingerprint. If the app
 *    stayed away longer than HARD_LOCK_MS, the vault is fully locked instead.
 */
export function AppLock({ children }: { children: ReactNode }) {
  usePreventScreenCapture();
  const vault = useVault();
  const [covered, setCovered] = useState(false);
  const [needsBiometric, setNeedsBiometric] = useState(false);
  const leftAt = useRef<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        setCovered(true);
        leftAt.current ??= Date.now();
        return;
      }
      setCovered(false);
      const away = leftAt.current ? Date.now() - leftAt.current : 0;
      leftAt.current = null;
      if (vault.status !== 'unlocked') return;
      if (away > HARD_LOCK_MS) vault.lock();
      else if (away > 2000) setNeedsBiometric(true);
    });
    return () => sub.remove();
  }, [vault]);

  const authenticate = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) {
      // No biometrics set up: fall back to the master password.
      setNeedsBiometric(false);
      vault.lock();
      return;
    }
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Authenticator',
    });
    if (res.success) setNeedsBiometric(false);
  };

  useEffect(() => {
    if (needsBiometric) authenticate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per lock event
  }, [needsBiometric]);

  return (
    <View style={styles.fill}>
      {children}
      {(covered || needsBiometric) && (
        <View style={styles.cover}>
          <Text style={styles.lockIcon}>🔐</Text>
          {needsBiometric && !covered && (
            <Pressable style={styles.button} onPress={authenticate}>
              <Text style={styles.buttonText}>Unlock</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  lockIcon: { fontSize: 48 },
  button: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { color: 'white', fontWeight: '600' },
});
