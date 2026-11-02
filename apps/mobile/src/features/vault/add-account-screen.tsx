import { base32Decode } from '@repo/crypto';
import { dedupe, importAny, type ImportedAccount } from '@repo/importers';
import { toAccountData, toImported } from '@repo/vault';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Input, Label, styles as ui } from '@/components/ui';
import { FolderPicker } from './folder-picker';
import { useVault } from './vault-store';

/**
 * Add accounts by scanning a QR code (single otpauth:// or a Google Authenticator export QR,
 * which can hold up to 10 accounts) or by typing the secret key.
 */
export function AddAccountScreen() {
  const vault = useVault();
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [permission, requestPermission] = useCameraPermissions();
  const [found, setFound] = useState<ImportedAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scanned = useRef(false); // the camera fires many events per second; handle only the first
  const [form, setForm] = useState<{
    issuer: string;
    label: string;
    secret: string;
    folderId?: string;
  }>({ issuer: '', label: '', secret: '' });

  const onScan = (data: string) => {
    if (scanned.current) return;
    scanned.current = true;
    try {
      const existing = vault.accounts.map((a) => toImported(a.data));
      const fresh = dedupe(existing, importAny(data).accounts);
      if (fresh.length === 0) throw new Error('Already in your vault.');
      setFound(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Not an authenticator QR code');
      setTimeout(() => (scanned.current = false), 1500);
    }
  };

  const saveAll = async (accounts: ImportedAccount[]) => {
    setBusy(true);
    setError(null);
    try {
      for (const a of accounts) await vault.save('account', toAccountData(a, form.folderId));
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const saveManual = () => {
    const secret = form.secret.replace(/\s|-/g, '').toUpperCase();
    try {
      base32Decode(secret);
    } catch {
      return setError('That secret key is not valid base32.');
    }
    if (!form.issuer && !form.label) return setError('Add an issuer or a label.');
    saveAll([
      {
        type: 'totp',
        issuer: form.issuer.trim(),
        label: form.label.trim(),
        secret,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
      },
    ]);
  };

  if (found) {
    return (
      <View style={s.pad}>
        <Text style={s.title}>Add {found.length} account(s)?</Text>
        {found.map((a, i) => (
          <Text key={i}>
            • {a.issuer || '—'} {a.label}
          </Text>
        ))}
        <Button title={busy ? 'Saving…' : 'Add'} onPress={() => saveAll(found)} disabled={busy} />
        <Button
          variant="secondary"
          title="Cancel"
          onPress={() => ((scanned.current = false), setFound(null))}
        />
        {error && <Text style={ui.error}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={s.flex}>
      <View style={s.tabs}>
        <Button
          variant={mode === 'scan' ? 'primary' : 'secondary'}
          title="Scan QR"
          onPress={() => setMode('scan')}
        />
        <Button
          variant={mode === 'manual' ? 'primary' : 'secondary'}
          title="Enter key"
          onPress={() => setMode('manual')}
        />
      </View>
      {mode === 'scan' ? (
        !permission ? null : !permission.granted ? (
          <View style={s.pad}>
            <Text>We need the camera to scan QR codes.</Text>
            <Button title="Allow camera" onPress={requestPermission} />
          </View>
        ) : (
          <CameraView
            style={s.flex}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => onScan(data)}
          />
        )
      ) : (
        <ScrollView contentContainerStyle={s.pad}>
          <Label>Issuer</Label>
          <Input
            value={form.issuer}
            onChangeText={(issuer) => setForm({ ...form, issuer })}
            placeholder="GitHub"
          />
          <Label>Account</Label>
          <Input
            value={form.label}
            onChangeText={(label) => setForm({ ...form, label })}
            placeholder="you@example.com"
          />
          <Label>Secret key</Label>
          <Input value={form.secret} onChangeText={(secret) => setForm({ ...form, secret })} />
          <FolderPicker
            value={form.folderId}
            onChange={(folderId) => setForm({ ...form, folderId })}
          />
          <Button title={busy ? 'Saving…' : 'Add account'} onPress={saveManual} disabled={busy} />
        </ScrollView>
      )}
      {error && <Text style={[ui.error, s.center]}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 16, gap: 10 },
  tabs: { flexDirection: 'row', gap: 8, padding: 12 },
  title: { fontSize: 20, fontWeight: '600' },
  center: { textAlign: 'center', padding: 8 },
});
