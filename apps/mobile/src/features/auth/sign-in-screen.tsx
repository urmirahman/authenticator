import type { OAuthProvider } from '@repo/types';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const PROVIDERS: Array<{ id: OAuthProvider; label: string }> = [
  { id: 'apple', label: 'Continue with Apple' },
  { id: 'google', label: 'Continue with Google' },
  { id: 'facebook', label: 'Continue with Facebook' },
];

/**
 * Stubbed. Real flow: native SDK (expo-apple-authentication / Google Sign-In) returns an id_token,
 * then api.auth.exchangeIdToken(provider, idToken) gives us our own session.
 */
export function SignInScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authenticator</Text>
      <Pressable style={[styles.button, styles.primary]} onPress={() => router.replace('/codes')}>
        <Text style={styles.primaryText}>Sign in with a passkey</Text>
      </Pressable>
      {PROVIDERS.map((p) => (
        <Pressable key={p.id} style={styles.button} onPress={() => router.replace('/codes')}>
          <Text>{p.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  button: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  primary: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  primaryText: { color: 'white', fontWeight: '600' },
});
