import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from '@repo/types';

/**
 * Tokens live in the iOS Keychain / Android Keystore (SecureStore), not in plain AsyncStorage.
 * The vault key is never stored: it lives in memory only while unlocked.
 */
const ACCESS = 'accessToken';
const REFRESH = 'refreshToken';
const DEVICE = 'deviceId';

export const session = {
  accessToken: () => SecureStore.getItemAsync(ACCESS),
  refreshToken: () => SecureStore.getItemAsync(REFRESH),
  deviceId: () => SecureStore.getItemAsync(DEVICE),
  async isSignedIn() {
    return !!(await SecureStore.getItemAsync(REFRESH));
  },
  async save(t: AuthTokens) {
    await SecureStore.setItemAsync(ACCESS, t.accessToken);
    await SecureStore.setItemAsync(REFRESH, t.refreshToken);
  },
  setDeviceId: (id: string) => SecureStore.setItemAsync(DEVICE, id),
  async clear() {
    await Promise.all([ACCESS, REFRESH, DEVICE].map((k) => SecureStore.deleteItemAsync(k)));
  },
};
