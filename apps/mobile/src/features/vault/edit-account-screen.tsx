import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Button, EmptyState, Input, Label, Screen, styles as ui } from '@/components/ui';
import { FolderPicker } from './folder-picker';
import { useVault } from './vault-store';

/** Rename, move to a folder, or delete an account. The secret itself is not editable here. */
export function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vault = useVault();
  const item = vault.accounts.find((a) => a.id === id);
  const [form, setForm] = useState(() => ({
    issuer: item?.data.issuer ?? '',
    label: item?.data.label ?? '',
    folderId: item?.data.folderId,
  }));
  const [error, setError] = useState<string | null>(null);

  if (!item)
    return (
      <Screen>
        <EmptyState title="Account not found" body="It may have been deleted on another device." />
      </Screen>
    );

  const save = async () => {
    try {
      await vault.save('account', { ...item.data, ...form }, item.id);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  const remove = () =>
    Alert.alert(
      'Delete account?',
      'Make sure 2FA is turned off on the website first, or you may be locked out.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await vault.remove(item.id);
            router.back();
          },
        },
      ],
    );

  return (
    <Screen>
      <Label>Issuer</Label>
      <Input value={form.issuer} onChangeText={(issuer) => setForm({ ...form, issuer })} />
      <Label>Account</Label>
      <Input value={form.label} onChangeText={(label) => setForm({ ...form, label })} />
      <FolderPicker value={form.folderId} onChange={(folderId) => setForm({ ...form, folderId })} />
      <Button title="Save" onPress={save} />
      <Button variant="danger" title="Delete account" onPress={remove} />
      {error && <Text style={ui.error}>{error}</Text>}
    </Screen>
  );
}
