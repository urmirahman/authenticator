import { ApiError } from '@repo/api-client';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { Button, Card, Input, Label, Muted, styles as ui } from '@/components/ui';
import { leaveApp } from '@/features/session/leave-app';
import { session } from '@/features/session/session';
import { useVault } from '@/features/vault/vault-store';
import { api } from '@/lib/api';

/**
 * Danger zone: permanently delete the account. The master password is checked on-device (the
 * server never sees it); the server additionally requires a recent sign-in (ADR 35).
 */
export function DeleteAccount() {
  const vault = useVault();
  const [password, setPassword] = useState('');
  const [phrase, setPhrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leave = () => leaveApp(vault);

  const run = async () => {
    setError(null);
    setBusy(true);
    try {
      if (!(await vault.verifyPassword(password))) throw new Error('Wrong master password.');
      if (await session.isOffline()) {
        await leave();
        Alert.alert('Vault deleted', 'Your local vault and all data on this device were removed.');
        return;
      }
      await api.users.deleteAccount('DELETE');
      await leave();
      Alert.alert('Account deleted', 'Your account and encrypted vault were removed.');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'reauth_required') {
        Alert.alert(
          'Sign in again',
          'For safety, deleting needs a fresh sign-in. Sign in, then delete within 10 minutes.',
          [
            { text: 'Sign out', onPress: leave },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
      } else setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 12 }}>
      <Muted>
        Deletes your account, encrypted vault, backups, devices and history. This can’t be undone.
        Export a backup first if you might need your codes.
      </Muted>
      <View>
        <Label>Master password</Label>
        <Input secureTextEntry value={password} onChangeText={setPassword} />
      </View>
      <View>
        <Label>Type DELETE to confirm</Label>
        <Input autoCapitalize="characters" value={phrase} onChangeText={setPhrase} />
      </View>
      {busy ? (
        <ActivityIndicator />
      ) : (
        <Button
          variant="danger"
          title="Delete account permanently"
          disabled={phrase !== 'DELETE' || !password}
          onPress={run}
        />
      )}
      {error && <Text style={ui.error}>{error}</Text>}
    </Card>
  );
}
