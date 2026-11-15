import { router } from 'expo-router';
import { signOutGoogle } from '@/features/auth/google-sign-in';
import { clearBiometricKey } from '@/features/security/biometric-key';
import { localVault } from '@/features/vault/local-vault';
import { signOut } from '@/lib/api';
import { session } from './session';

type VaultLeave = { abandon(): void };

let leaving: Promise<void> | null = null;

/**
 * Leave the signed-in shell and return to the sign-in screen.
 * Offline mode also wipes the on-device vault so the next start is empty.
 * Concurrent calls share one in-flight promise.
 */
async function leaveOnce(vault: VaultLeave) {
  await clearBiometricKey();
  if (await session.isOffline()) {
    await localVault.clearLocalVault();
    await session.clear();
  } else {
    await signOutGoogle();
    await signOut();
  }
  vault.abandon();
  router.replace('/sign-in');
}

export function leaveApp(vault: VaultLeave) {
  leaving ??= leaveOnce(vault).finally(() => {
    leaving = null;
  });
  return leaving;
}
