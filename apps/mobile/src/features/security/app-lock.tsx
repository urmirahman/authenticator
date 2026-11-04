import { logoMarkDark } from '@/components/brand-images';
import { dark } from '@repo/brand';
import * as LocalAuthentication from 'expo-local-authentication';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePreferences } from '@/features/settings/preferences';
import { useVault } from '@/features/vault/vault-store';

/**
 * Three protections:
 * 1. Screenshots / screen recording are blocked (Android) or blanked (iOS) via expo-screen-capture.
 * 2. App-switcher privacy: when the app goes inactive we cover it, so the codes don't show in the
 *    task switcher thumbnail.
 * 3. Biometric app lock: coming back from the background asks for Face ID / fingerprint. If the app
 *    stayed away longer than the auto-lock setting, the vault is fully locked instead.
 */
export function AppLock({ children }: { children: ReactNode }) {
  usePreventScreenCapture();
  const vault = useVault();
  // After this long in the background, forget the vault key (0 = never).
  const { autoLockMinutes } = usePreferences();
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
      if (autoLockMinutes > 0 && away > autoLockMinutes * 60_000) vault.lock();
      else if (away > 2000) setNeedsBiometric(true);
    });
    return () => sub.remove();
  }, [vault, autoLockMinutes]);

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
          <Image source={logoMarkDark} style={styles.logo} accessibilityLabel="Bloom is locked" />
          {needsBiometric && !covered && (
            <Pressable
              style={styles.button}
              onPress={authenticate}
              accessibilityRole="button"
              accessibilityLabel="Unlock with Face ID or fingerprint"
            >
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
    backgroundColor: dark.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  logo: { width: 120, height: 120 },
  button: {
    backgroundColor: dark.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { color: dark.accentText, fontWeight: '600' },
});
