import { fromBase64, toBase64 } from '@repo/vault';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/**
 * Optional "unlock with Face ID / fingerprint" (see docs/DECISIONS.md, ADR 32).
 *
 * We store the raw vault key in the Keychain / Keystore with requireAuthentication: the OS only
 * releases it after a successful biometric check, and it never leaves this device
 * (WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: not in backups, deleted if the phone passcode is removed).
 * If the user adds/removes a fingerprint or face, the OS invalidates the item and we fall back to
 * the master password.
 */
const KEY = 'vaultKey.biometric';
const VAULT_ID = 'vaultKey.vaultId';

const options: SecureStore.SecureStoreOptions = {
  requireAuthentication: true,
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  authenticationPrompt: 'Unlock your vault',
};

export async function biometricsAvailable() {
  return (
    (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync())
  );
}

export async function isBiometricEnabled(vaultId: string) {
  return (await SecureStore.getItemAsync(VAULT_ID)) === vaultId;
}

export async function saveBiometricKey(vaultId: string, key: Uint8Array) {
  await SecureStore.setItemAsync(KEY, toBase64(key), options);
  await SecureStore.setItemAsync(VAULT_ID, vaultId);
}

/** Shows the biometric prompt. Returns null if cancelled, invalidated or not set up. */
export async function loadBiometricKey(vaultId: string): Promise<Uint8Array | null> {
  if (!(await isBiometricEnabled(vaultId))) return null;
  try {
    const b64 = await SecureStore.getItemAsync(KEY, options);
    return b64 ? fromBase64(b64) : null;
  } catch {
    return null;
  }
}

export async function clearBiometricKey() {
  await SecureStore.deleteItemAsync(KEY, options).catch(() => undefined);
  await SecureStore.deleteItemAsync(VAULT_ID).catch(() => undefined);
}
