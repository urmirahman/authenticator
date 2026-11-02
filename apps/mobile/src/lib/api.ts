import { createApiClient } from '@repo/api-client';
import * as SecureStore from 'expo-secure-store';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

/** Tokens live in the iOS Keychain / Android Keystore via SecureStore. */
export const api = createApiClient({
  baseUrl: API_URL,
  getAccessToken: () => SecureStore.getItemAsync('accessToken'),
});
