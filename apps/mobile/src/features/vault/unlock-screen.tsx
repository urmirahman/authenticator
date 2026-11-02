import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/components/theme';
import { Button, Input, Label, styles as ui } from '@/components/ui';
import { useVault } from './vault-store';

/** Create (first time) or enter the master password, or use Face ID / fingerprint if enabled. */
export function UnlockScreen() {
  const vault = useVault();
  const c = useColors();
  const isSetup = vault.status === 'needs-setup';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tryBiometric = async () => {
    setError(null);
    if (!(await vault.unlockWithBiometric()))
      setError('Biometric unlock failed. Use your master password.');
  };

  // Offer biometrics right away when it's turned on.
  useEffect(() => {
    if (!isSetup && vault.biometric.enabled) tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, [vault.biometric.enabled]);

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
    <View style={[s.container, { backgroundColor: c.bg }]}>
      <Text style={[s.title, { color: c.text }]}>
        {isSetup ? 'Create master password' : 'Unlock vault'}
      </Text>
      <Text style={{ color: c.muted }}>
        {isSetup
          ? 'It encrypts your codes on this phone. Nobody can reset it.'
          : 'Codes are decrypted only on this phone.'}
      </Text>
      <View>
        <Label>Master password</Label>
        <Input
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          autoFocus={!vault.biometric.enabled}
        />
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
      {!isSetup && vault.biometric.enabled && (
        <Button variant="secondary" title="Use Face ID / fingerprint" onPress={tryBiometric} />
      )}
      {error && <Text style={ui.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700' },
});
