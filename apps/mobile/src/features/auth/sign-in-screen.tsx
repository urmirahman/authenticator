import type { OAuthProvider } from '@repo/types';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Input, Label, styles as ui } from '@/components/ui';
import { api, completeSignIn, DEV_AUTH } from '@/lib/api';
import { googleSignInConfigured, signInWithGoogle } from './google-sign-in';

/** Providers still waiting for setup. Google is real (below) and hidden when not configured. */
const PLACEHOLDERS: Array<{ id: OAuthProvider; label: string }> = [
  { id: 'apple', label: 'Continue with Apple' },
  { id: 'facebook', label: 'Continue with Facebook' },
];

/**
 * OAuth on mobile uses the native SDKs. They return an id_token / auth code, which we send to
 * api.auth.nativeSignIn(provider, ...). Google is wired up (google-sign-in.ts); Apple and Facebook
 * still need their app IDs, so those buttons are placeholders.
 */
export function SignInScreen() {
  const [email, setEmail] = useState('dev@example.com');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const devLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await completeSignIn(await api.dev.token(email, email.split('@')[0]));
      router.replace('/codes');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setError(null);
    try {
      if (await signInWithGoogle()) router.replace('/codes');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Authenticator</Text>
      {googleSignInConfigured && (
        <Button title="Continue with Google" onPress={google} disabled={busy} />
      )}
      {PLACEHOLDERS.map((p) => (
        <Button
          key={p.id}
          variant="secondary"
          title={p.label}
          onPress={() =>
            Alert.alert(
              'Not configured yet',
              `Add your ${p.id} app IDs first (docs/OAUTH_SETUP.md).`,
            )
          }
        />
      ))}
      {DEV_AUTH && (
        <View style={s.dev}>
          <Label>Dev login (DEV_AUTH only)</Label>
          <Input value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Button title={busy ? 'Signing in…' : 'Dev sign in'} onPress={devLogin} disabled={busy} />
        </View>
      )}
      {error && <Text style={ui.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  dev: {
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
});
