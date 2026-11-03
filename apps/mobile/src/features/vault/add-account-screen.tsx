import { base32Decode } from '@repo/crypto';
import { dedupe, importAny, type ImportedAccount } from '@repo/importers';
import { toAccountData, toImported } from '@repo/vault';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/components/theme';
import {
  Button,
  Card,
  Choice,
  IconBubble,
  Input,
  Label,
  Muted,
  styles as ui,
} from '@/components/ui';
import { useHaptics } from '@/lib/motion';
import { FolderPicker } from './folder-picker';
import { useVault } from './vault-store';

/**
 * Add accounts by scanning a QR code (single otpauth:// or a Google Authenticator export QR,
 * which can hold up to 10 accounts) or by typing the secret key.
 */
export function AddAccountScreen() {
  const c = useColors();
  const haptic = useHaptics();
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
      haptic('success');
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
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={s.pad}>
        <IconBubble name="sparkles-outline" />
        <Text style={[s.title, { color: c.text }]} accessibilityRole="header">
          Found {found.length} account{found.length === 1 ? '' : 's'}
        </Text>
        <Card style={{ gap: 8 }}>
          {found.map((a, i) => (
            <Text key={i} style={{ color: c.text }}>
              <Text style={{ fontWeight: '600' }}>{a.issuer || '—'}</Text>
              <Text style={{ color: c.muted }}> {a.label}</Text>
            </Text>
          ))}
        </Card>
        <Button
          icon="add-circle-outline"
          title={busy ? 'Saving…' : found.length === 1 ? 'Add it' : `Add all ${found.length}`}
          onPress={() => saveAll(found)}
          disabled={busy}
        />
        <Button
          variant="ghost"
          title="Scan again"
          onPress={() => ((scanned.current = false), setFound(null))}
        />
        {error && <Text style={ui.error}>{error}</Text>}
      </ScrollView>
    );
  }

  return (
    <View style={[s.flex, { backgroundColor: c.bg }]}>
      <View style={s.tabs}>
        <Choice
          options={['scan', 'manual'] as const}
          value={mode}
          label={(m) => (m === 'scan' ? 'Scan QR code' : 'Enter key')}
          onChange={setMode}
        />
      </View>
      {mode === 'scan' ? (
        !permission ? null : !permission.granted ? (
          <View style={[s.pad, s.centered]}>
            <IconBubble name="camera-outline" />
            <Text style={[s.title, { color: c.text }]}>Camera, please?</Text>
            <Muted>Bloom only uses it to read the QR code a site shows when you turn on 2FA.</Muted>
            <Button title="Allow camera" onPress={requestPermission} />
          </View>
        ) : (
          <View style={s.flex}>
            <CameraView
              style={s.flex}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                if (!scanned.current) haptic('success');
                onScan(data);
              }}
              accessibilityLabel="Camera viewfinder for QR codes"
            />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.centered]}>
              <View style={[s.frame, { borderColor: c.accent }]} />
              <Text style={s.scanHint}>Point at the QR code</Text>
            </View>
          </View>
        )
      ) : (
        <ScrollView contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
          <Label>Service</Label>
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
          <Input
            value={form.secret}
            onChangeText={(secret) => setForm({ ...form, secret })}
            placeholder="JBSW Y3DP EHPK 3PXP"
            autoCapitalize="characters"
          />
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
  pad: { padding: 20, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  tabs: { padding: 16, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  center: { textAlign: 'center', padding: 8 },
  centered: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  frame: { width: 240, height: 240, borderWidth: 3, borderRadius: 32 },
  scanHint: {
    color: 'white',
    marginTop: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
});
