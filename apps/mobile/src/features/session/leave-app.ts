import { router } from 'expo-router';
import { signOutGoogle } from '@/features/auth/google-sign-in';
import { clearBiometricKey } from '@/features/security/biometric-key';
import { localVault } from '@/features/vault/local-vault';
import { signOut } from '@/lib/api';
import { session } from './session';

/**
 * Leave the signed-in shell and return to the sign-in screen.
 * Offline mode also wipes the on-device vault so the next start is empty.
 */
export async function leaveApp(vault: { lock(): void; reset(): void }) {
  vault.lock();
  await clearBiometricKey();
  if (await session.isOffline()) {
    await localVault.clearLocalVault();
    await session.clear();
    vault.reset();
    router.replace('/sign-in');
    return;
  }
  await signOutGoogle();
  await signOut();
  router.replace('/sign-in');
}
