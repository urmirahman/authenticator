import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { UnlockScreen } from '@/features/vault/unlock-screen';
import { useVault } from '@/features/vault/vault-store';

/** Signed-in area: loads the vault header, and shows the unlock screen until the key is in memory. */
export default function AppLayout() {
  const vault = useVault();

  useEffect(() => {
    if (vault.status === 'loading') vault.load().catch(() => router.replace('/sign-in'));
  }, [vault]);

  // Pull changes from other devices every 30s while unlocked.
  useEffect(() => {
    if (vault.status !== 'unlocked') return;
    const id = setInterval(vault.sync, 30_000);
    return () => clearInterval(id);
  }, [vault.status, vault.sync]);

  if (vault.status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (vault.status !== 'unlocked') return <UnlockScreen />;
  return (
    <Stack>
      <Stack.Screen name="codes" options={{ title: 'Codes' }} />
      <Stack.Screen name="add-account" options={{ title: 'Add account', presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
