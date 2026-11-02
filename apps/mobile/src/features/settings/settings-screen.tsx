import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { useVault } from '@/features/vault/vault-store';
import { signOut } from '@/lib/api';

/** More settings (devices, backups, change password) exist in the web app; mobile versions are TODO. */
export function SettingsScreen() {
  const vault = useVault();
  return (
    <View style={s.container}>
      <Text style={s.title}>Settings</Text>
      <Text style={s.hint}>
        Screenshots are blocked, the app hides itself in the app switcher, and asks for Face ID /
        fingerprint when you come back. After 5 minutes away you need the master password.
      </Text>
      <Button
        title={vault.syncing ? 'Syncing…' : 'Sync now'}
        onPress={vault.sync}
        variant="secondary"
      />
      <Button title="Lock now" onPress={vault.lock} variant="secondary" />
      <Button
        title="Sign out"
        onPress={async () => {
          vault.lock();
          await signOut();
          router.replace('/sign-in');
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '600' },
  hint: { color: '#64748b' },
});
