import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { withExpiry } from '@repo/vault';
import { Button, Card, EmptyState, Input, Label, Screen, styles as ui } from '@/components/ui';
import { ExpiryField } from './expiry-field';
import { FolderPicker } from './folder-picker';
import { useVault } from './vault-store';

/** Rename, move, set an expiry, or delete an account. The key itself is not editable here. */
export function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const vault = useVault();
  const item = vault.accounts.find((a) => a.id === id);
  const [form, setForm] = useState(() => ({
    issuer: item?.data.issuer ?? '',
    label: item?.data.label ?? '',
    folderId: item?.data.folderId,
    expiresAt: item?.data.expiresAt,
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
      const { expiresAt, ...rest } = form;
      await vault.save('account', withExpiry({ ...item.data, ...rest }, expiresAt), item.id);
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
      <Label>Name</Label>
      <Input value={form.issuer} onChangeText={(issuer) => setForm({ ...form, issuer })} />
      <Label>Account</Label>
      <Input value={form.label} onChangeText={(label) => setForm({ ...form, label })} />
      <FolderPicker value={form.folderId} onChange={(folderId) => setForm({ ...form, folderId })} />
      <Card>
        <ExpiryField
          value={form.expiresAt}
          onChange={(expiresAt) => setForm({ ...form, expiresAt })}
        />
      </Card>
      <Button title="Save" onPress={save} />
      <Button variant="danger" title="Delete account" onPress={remove} />
      {error && <Text style={ui.error}>{error}</Text>}
    </Screen>
  );
}
