import '@/lib/polyfills'; // must be first: gives Hermes crypto.getRandomValues / randomUUID
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppLock } from '@/features/security/app-lock';
import { PreferencesProvider } from '@/features/settings/preferences';
import { VaultProvider } from '@/features/vault/vault-store';

export default function RootLayout() {
  return (
    <PreferencesProvider>
      <VaultProvider>
        <AppLock>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }} />
        </AppLock>
      </VaultProvider>
    </PreferencesProvider>
  );
}
