import { brand } from '@repo/brand';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLogoMark } from '@/components/brand-images';
import { useColors } from '@/components/theme';
import { useVault } from '@/features/vault/vault-store';
import { Button, Card, FadeIn, Input, Label, Notice, styles as ui } from '@/components/ui';
import { openWebPage } from '@/lib/web-url';
import { api, completeSignIn, DEV_AUTH } from '@/lib/api';
import { generateAnonymousProfile, session } from '@/features/session/session';
import { googleSignInConfigured, signInWithGoogle } from './google-sign-in';

/**
 * Google is the only sign-in option for launch (ADR 39). The native Google SDK returns an
 * id_token, which we send to api.auth.nativeSignIn('google', ...). The button always shows; if
 * this platform's client id is missing we explain that inline instead of hiding it.
 */
export function SignInScreen() {
  const c = useColors();
  const vault = useVault();
  const mark = useLogoMark();
  const [email, setEmail] = useState('dev@example.com');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [setupMissing, setSetupMissing] = useState(false);

  const devLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      await completeSignIn(await api.dev.token(email, email.split('@')[0]));
      vault.reset();
      router.replace('/codes');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    if (!googleSignInConfigured) {
      setSetupMissing(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (await signInWithGoogle()) {
        vault.reset();
        router.replace('/codes');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  const continueOffline = async () => {
    setBusy(true);
    setError(null);
    try {
      const existingProfile = await session.getLocalProfile();
      if (!existingProfile) {
        await session.setLocalProfile(generateAnonymousProfile());
      }
      await session.setOffline(true);
      vault.reset();
      router.replace('/codes');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start offline mode');
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
              <Image source={mark} style={s.logo} accessibilityLabel="Bloom logo" />
              <Text style={[s.title, { color: c.text }]} accessibilityRole="header">
                Welcome to Bloom
              </Text>
              <Text style={[s.tagline, { color: c.muted }]}>{brand.tagline}</Text>
            </View>
          </FadeIn>
          <Button
            icon="logo-google"
            title={busy ? 'Signing in…' : 'Continue with Google'}
            onPress={google}
            disabled={busy}
          />
          <Button
            variant="ghost"
            icon="lock-closed-outline"
            title="Offline"
            onPress={continueOffline}
            disabled={busy}
          />
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
          {setupMissing && (
            <Notice onDismiss={() => setSetupMissing(false)}>
              Google sign-in isn’t set up on this device yet. It needs a Google client id for{' '}
              {Platform.OS === 'ios'
                ? 'iOS'
                : Platform.OS === 'android'
                  ? 'Android'
                  : 'this platform'}
              {DEV_AUTH ? ' — use developer sign-in below for now.' : '.'}
            </Notice>
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
