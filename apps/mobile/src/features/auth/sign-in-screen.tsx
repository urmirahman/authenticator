import { brand } from '@repo/brand';
import type { OAuthProvider } from '@repo/types';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { logoMark } from '@/components/brand-images';
import { useColors } from '@/components/theme';
import { Button, Card, FadeIn, Input, Label, styles as ui } from '@/components/ui';
import { openWebPage } from '@/lib/web-url';
import { api, completeSignIn, DEV_AUTH } from '@/lib/api';
import { googleSignInConfigured, signInWithGoogle } from './google-sign-in';

/** Providers still waiting for setup. Google is real (below) and hidden when not configured. */
const PLACEHOLDERS: Array<{
  id: OAuthProvider;
  label: string;
  icon: 'logo-apple' | 'logo-facebook';
}> = [
  { id: 'apple', label: 'Continue with Apple', icon: 'logo-apple' },
  { id: 'facebook', label: 'Continue with Facebook', icon: 'logo-facebook' },
];

/**
 * OAuth on mobile uses the native SDKs. They return an id_token / auth code, which we send to
 * api.auth.nativeSignIn(provider, ...). Google is wired up (google-sign-in.ts); Apple and Facebook
 * still need their app IDs, so those buttons are placeholders.
 */
export function SignInScreen() {
  const c = useColors();
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.inner}>
          <FadeIn>
            <View style={s.hero}>
              <Image source={logoMark} style={s.logo} accessibilityLabel="Bloom logo" />
              <Text style={[s.title, { color: c.text }]} accessibilityRole="header">
                Welcome to Bloom
              </Text>
              <Text style={[s.tagline, { color: c.muted }]}>{brand.tagline}</Text>
            </View>
          </FadeIn>
          {googleSignInConfigured && (
            <Button
              icon="logo-google"
              title="Continue with Google"
              onPress={google}
              disabled={busy}
            />
          )}
          {PLACEHOLDERS.map((p) => (
            <Button
              key={p.id}
              icon={p.icon}
              variant="secondary"
              title={p.label}
              onPress={() =>
                Alert.alert(
                  'Coming soon',
                  `${p.label.replace('Continue with ', '')} sign-in isn't set up yet.`,
                )
              }
            />
          ))}
          {DEV_AUTH && (
            <Card style={s.dev}>
              <Label>Developer sign-in (local only)</Label>
              <Input value={email} onChangeText={setEmail} keyboardType="email-address" />
              <Button
                variant="secondary"
                title={busy ? 'Signing in…' : 'Dev sign in'}
                onPress={devLogin}
                disabled={busy}
              />
            </Card>
          )}
          {error && <Text style={[ui.error, { textAlign: 'center' }]}>{error}</Text>}
          <Text style={[s.legal, { color: c.muted }]}>
            By continuing you agree to the{' '}
            <Text
              style={{ color: c.accent }}
              accessibilityRole="link"
              onPress={() => openWebPage('/terms')}
            >
              Terms
            </Text>{' '}
            and{' '}
            <Text
              style={{ color: c.accent }}
              accessibilityRole="link"
              onPress={() => openWebPage('/privacy')}
            >
              Privacy policy
            </Text>
            .
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  inner: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 12 },
  hero: { alignItems: 'center', gap: 8, marginBottom: 24 },
  logo: { width: 112, height: 112 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
  tagline: { fontSize: 16, textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },
  dev: { gap: 8, marginTop: 16 },
  legal: { fontSize: 13, textAlign: 'center', marginTop: 16, lineHeight: 19 },
});
