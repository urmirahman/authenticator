import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Input, Label, styles as ui } from '@/components/ui';
import { useVault } from './vault-store';

/** Create (first time) or enter the master password. Key derivation runs on the phone. */
export function UnlockScreen() {
  const vault = useVault();
  const isSetup = vault.status === 'needs-setup';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (isSetup && password.length < 10) return setError('Use at least 10 characters.');
    if (isSetup && password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    await new Promise((r) => setTimeout(r, 50)); // let the spinner render before heavy work
    try {
      await (isSetup ? vault.setup(password) : vault.unlock(password));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>{isSetup ? 'Create master password' : 'Unlock vault'}</Text>
      <Text style={s.hint}>
        {isSetup
          ? 'It encrypts your codes on this phone. Nobody can reset it.'
          : 'Codes are decrypted only on this phone.'}
      </Text>
      <View>
        <Label>Master password</Label>
        <Input secureTextEntry value={password} onChangeText={setPassword} autoFocus />
      </View>
      {isSetup && (
        <View>
          <Label>Confirm</Label>
          <Input secureTextEntry value={confirm} onChangeText={setConfirm} />
        </View>
      )}
      {busy ? (
        <ActivityIndicator />
      ) : (
        <Button title={isSetup ? 'Create vault' : 'Unlock'} onPress={submit} />
      )}
      {error && <Text style={ui.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
  hint: { color: '#64748b' },
});
