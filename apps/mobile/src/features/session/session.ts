import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '@repo/types';

/**
 * Tokens live in the iOS Keychain / Android Keystore (SecureStore), not in plain AsyncStorage.
 * The vault key is never stored: it lives in memory only while unlocked.
 */
const ACCESS = 'accessToken';
const REFRESH = 'refreshToken';
const DEVICE = 'deviceId';
const OFFLINE = 'isOfflineMode';
const LOCAL_PROFILE = 'localProfile';

export interface LocalProfile {
  id: string;
  displayName: string;
  createdAt: number;
}

const ADJECTIVES = [
  'Silent',
  'Cryptic',
  'Hidden',
  'Midnight',
  'Solar',
  'Cosmic',
  'Stealth',
  'Iron',
  'Shadow',
  'Neon',
];
const NOUNS = [
  'Vault',
  'Keeper',
  'Falcon',
  'Sentinel',
  'Cipher',
  'Ghost',
  'Panda',
  'Phoenix',
  'Shield',
  'Ranger',
];

export function generateAnonymousProfile(): LocalProfile {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return {
    id: `local-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    displayName: `${adj} ${noun} #${num}`,
    createdAt: Date.now(),
  };
}

export const session = {
  accessToken: () => SecureStore.getItemAsync(ACCESS),
  refreshToken: () => SecureStore.getItemAsync(REFRESH),
  deviceId: () => SecureStore.getItemAsync(DEVICE),
  async isOffline() {
    return (await SecureStore.getItemAsync(OFFLINE)) === 'true';
  },
  async setOffline(enabled: boolean) {
    if (enabled) {
      await SecureStore.setItemAsync(OFFLINE, 'true');
    } else {
      await SecureStore.deleteItemAsync(OFFLINE).catch(() => undefined);
    }
  },
  async getLocalProfile(): Promise<LocalProfile | null> {
    const raw = await SecureStore.getItemAsync(LOCAL_PROFILE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LocalProfile;
    } catch {
      return null;
    }
  },
  async setLocalProfile(profile: LocalProfile) {
    await SecureStore.setItemAsync(LOCAL_PROFILE, JSON.stringify(profile));
  },
  async isSignedIn() {
    if (await this.isOffline()) return true;
    return !!(await SecureStore.getItemAsync(REFRESH));
  },
  async save(t: AuthTokens) {
    await this.setOffline(false);
    await SecureStore.setItemAsync(ACCESS, t.accessToken);
    await SecureStore.setItemAsync(REFRESH, t.refreshToken);
  },
  setDeviceId: (id: string) => SecureStore.setItemAsync(DEVICE, id),
  async clear() {
    await Promise.all(
      [
        SecureStore.deleteItemAsync(ACCESS),
        SecureStore.deleteItemAsync(REFRESH),
        SecureStore.deleteItemAsync(DEVICE),
        SecureStore.deleteItemAsync(OFFLINE),
        SecureStore.deleteItemAsync(LOCAL_PROFILE),
      ].map((p) => p.catch(() => undefined)),
    );
  },
};
