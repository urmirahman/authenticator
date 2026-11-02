import { parseOtpAuthUri } from '@repo/crypto';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

/** Scan an otpauth:// QR code. Next step: encrypt with the vault key and push via sync. */
export function AddAccountScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<string | null>(null);

  if (!permission) return null;
  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text>We need the camera to scan QR codes.</Text>
        <Button title="Allow camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          try {
            const parsed = parseOtpAuthUri(data);
            setResult(`${parsed.issuer} (${parsed.label})`);
          } catch {
            setResult('Not an authenticator QR code');
          }
        }}
      />
      {result && <Text style={styles.result}>{result}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  result: { padding: 16, textAlign: 'center' },
});
