import type { ImportedAccount } from '@repo/importers';
import { findNewAccounts, NOTHING_NEW, toAccountData } from '@repo/vault';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/components/theme';
import { Button, Card, IconBubble, Input, Muted, Notice, monoFont } from '@/components/ui';
import { useHaptics } from '@/lib/motion';
import { NO_QR_MESSAGE, pickQrImages } from './qr-images';
import { useVault } from './vault-store';

const GOOGLE_STEPS = [
  'Google Authenticator, then Transfer accounts, then Export.',
  'Select the accounts and show the QR.',
  'Scan or upload it here.',
];

type Msg = { tone: 'success' | 'error' | 'info'; text: string } | null;

/**
 * Import from another app. Main path: scan the export QR codes (several in a row — Google splits
 * big exports). Also: photos, a 2FAS / Aegis file, or pasted text. Read on this device only;
 * accounts already in the vault are skipped.
 */
export function ImportScreen() {
  const c = useColors();
  const haptic = useHaptics();
  const vault = useVault();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [scans, setScans] = useState<string[]>([]);
  const seen = useRef(new Set<string>());
  const [pasting, setPasting] = useState(false);
  const [text, setText] = useState('');
  const [found, setFound] = useState<ImportedAccount[] | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  const preview = (inputs: string[]) => {
    setMsg(null);
    try {
      setFound(
        findNewAccounts(
          inputs,
          vault.accounts.map((a) => a.data),
        ),
      );
    } catch (e) {
      setMsg({
        tone: 'error',
        text:
          e instanceof Error && e.message === NOTHING_NEW
            ? NOTHING_NEW
            : 'We couldn’t read that. Try your other app’s export QR, an otpauth:// link, or an unencrypted 2FAS / Aegis file.',
      });
    }
  };

  const startScan = async () => {
    if (!permission?.granted) {
      const p = await requestPermission();
      if (!p.granted) {
        setMsg({
          tone: 'error',
          text: 'Bloom needs the camera to scan. You can allow it in Settings, or use photos instead.',
        });
        return;
      }
    }
    seen.current = new Set();
    setScans([]);
    setScanning(true);
  };

  const onScan = (data: string) => {
    if (seen.current.has(data)) return;
    seen.current.add(data);
    haptic('success');
    setScans((s) => [...s, data]);
  };

  const fromPhotos = async () => {
    const res = await pickQrImages(true);
    if (!res) return;
    if (res.texts.length === 0) return setMsg({ tone: 'error', text: NO_QR_MESSAGE });
    preview(res.texts);
  };

  const fromFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    try {
      preview([await new File(res.assets[0]!.uri).text()]);
    } catch {
      setMsg({ tone: 'error', text: 'We couldn’t open that file. Try exporting it again.' });
    }
  };

  const save = async () => {
    if (!found) return;
    setBusy(true);
    try {
      for (const a of found) await vault.save('account', toAccountData(a));
      haptic('success');
      setMsg({
        tone: 'success',
        text: `Added ${found.length} account${found.length === 1 ? '' : 's'}. Check a code or two matches your old app before removing it there.`,
      });
      setFound(null);
      setText('');
    } finally {
      setBusy(false);
    }
  };

  if (scanning) {
    return (
      <View style={[s.flex, { backgroundColor: 'black' }]}>
        <CameraView
          style={s.flex}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => onScan(data)}
          accessibilityLabel="Camera viewfinder for QR codes"
        />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.centered]}>
          <View style={[s.frame, { borderColor: c.accent }]} />
          <Text style={s.hint}>
            {scans.length === 0
              ? 'Point at the export QR'
              : `${scans.length} QR code${scans.length === 1 ? '' : 's'} scanned — show the next one, or tap Done`}
          </Text>
        </View>
        <View style={s.bottom}>
          <Button
            title={scans.length ? `Done (${scans.length})` : 'Cancel'}
            onPress={() => {
              setScanning(false);
              if (scans.length) preview(scans);
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={s.pad}>
      {msg && (
        <Notice tone={msg.tone} onDismiss={() => setMsg(null)}>
          {msg.text}
        </Notice>
      )}
      {found ? (
        <>
          <Text style={[s.title, { color: c.text }]} accessibilityRole="header">
            Found {found.length} new account{found.length === 1 ? '' : 's'}
          </Text>
          <Muted>Ones already in Bloom are skipped.</Muted>
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
            title={busy ? 'Adding…' : 'Add'}
            onPress={save}
            disabled={busy}
          />
          <Button variant="ghost" title="Cancel" onPress={() => setFound(null)} />
        </>
      ) : (
        <>
          <IconBubble name="swap-horizontal-outline" />
          <Text style={[s.title, { color: c.text }]} accessibilityRole="header">
            Bring your accounts
          </Text>
          <Button icon="qr-code-outline" title="Scan QR" onPress={startScan} />
          {permission && !permission.granted && !permission.canAskAgain && (
            <Button variant="ghost" title="Allow camera" onPress={() => Linking.openSettings()} />
          )}
          <Button variant="secondary" icon="images-outline" title="Photos" onPress={fromPhotos} />
          <Button variant="secondary" icon="document-outline" title="File" onPress={fromFile} />
          <Card style={{ gap: 6 }}>
            <Text style={{ color: c.text, fontWeight: '600' }}>From Google Authenticator</Text>
            {GOOGLE_STEPS.map((step, i) => (
              <Text key={step} style={{ color: c.muted }}>
                {i + 1}. {step}
              </Text>
            ))}
          </Card>
          <Button
            variant="ghost"
            title={pasting ? 'Hide' : 'Paste'}
            onPress={() => setPasting(!pasting)}
          />
          {pasting && (
            <>
              <Input
                value={text}
                onChangeText={setText}
                multiline
                placeholder="otpauth://…  or  otpauth-migration://…"
                accessibilityLabel="Link or file contents"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ fontFamily: monoFont, minHeight: 110, textAlignVertical: 'top' }}
              />
              <Button
                variant="secondary"
                title="Read"
                disabled={!text.trim()}
                onPress={() => preview([text])}
              />
            </>
          )}
          <Button variant="ghost" title="Back" onPress={() => router.back()} />
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  pad: { padding: 20, gap: 12, width: '100%', maxWidth: 560, alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  centered: { alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderWidth: 3, borderRadius: 32 },
  hint: {
    color: 'white',
    marginTop: 16,
    paddingHorizontal: 24,
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
  bottom: { position: 'absolute', left: 20, right: 20, bottom: 40 },
});
