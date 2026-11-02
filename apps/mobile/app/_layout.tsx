import '@/lib/polyfills'; // must be first: gives Hermes crypto.getRandomValues / randomUUID
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppLock } from '@/features/security/app-lock';
import { VaultProvider } from '@/features/vault/vault-store';

export default function RootLayout() {
  return (
    <VaultProvider>
      <AppLock>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }} />
      </AppLock>
    </VaultProvider>
  );
}
