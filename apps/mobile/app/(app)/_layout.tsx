import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useColors } from '@/components/theme';
import { SkeletonList } from '@/components/ui';
import { session } from '@/features/session/session';
import { LocalVaultImportPrompt } from '@/features/vault/local-vault-import-prompt';
import { UnlockScreen } from '@/features/vault/unlock-screen';
import { useVault } from '@/features/vault/vault-store';

/** Signed-in area: loads the vault header, and shows the unlock screen until the key is in memory. */
export default function AppLayout() {
  const vault = useVault();
  const { status, load } = vault;
  const c = useColors();

  useEffect(() => {
    if (status !== 'loading') return;
    load().catch(async () => {
      if (!(await session.isSignedIn())) router.replace('/sign-in');
    });
  }, [status, load]);

  // Pull changes from other devices every 30s while unlocked (cloud only).
  useEffect(() => {
    if (vault.status !== 'unlocked') return;
    let active = true;
    let id: ReturnType<typeof setInterval> | null = null;
    session.isOffline().then((offline) => {
      if (!active || offline) return;
      id = setInterval(vault.sync, 30_000);
    });
    return () => {
      active = false;
      if (id) clearInterval(id);
    };
  }, [vault.status, vault.sync]);

  if (vault.status === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, padding: 24, paddingTop: 96 }}>
        <SkeletonList count={4} />
      </View>
    );
  }
  if (vault.status !== 'unlocked') return <UnlockScreen />;
  return (
    <>
      <LocalVaultImportPrompt />
      <Stack
        screenOptions={{
          headerTintColor: c.accent,
          headerStyle: { backgroundColor: c.bg },
          headerTitleStyle: { color: c.text, fontWeight: '600' },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false, title: '' }} />
        <Stack.Screen
          name="add-account"
          options={{ title: 'Add account', presentation: 'modal' }}
        />
        <Stack.Screen
          name="edit-account"
          options={{ title: 'Edit account', presentation: 'modal' }}
        />
        <Stack.Screen name="import" options={{ title: 'Import accounts' }} />
        <Stack.Screen name="backups" options={{ title: 'Encrypted backups' }} />
        <Stack.Screen name="transfer" options={{ title: 'Move to a new phone' }} />
        <Stack.Screen name="devices" options={{ title: 'Devices' }} />
        <Stack.Screen name="activity" options={{ title: 'Recent activity' }} />
        <Stack.Screen name="help" options={{ title: 'Help & about' }} />
      </Stack>
    </>
  );
}
