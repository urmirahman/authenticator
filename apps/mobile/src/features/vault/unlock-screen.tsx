import { MIN_MASTER_PASSWORD, strengthOf } from '@repo/vault';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { logoMark } from '@/components/brand-images';
import { useColors } from '@/components/theme';
import { Button, Input, Label, styles as ui } from '@/components/ui';
import { useVault } from './vault-store';

const INTRO = [
  {
    title: 'Your codes, encrypted on this phone',
    body: 'Bloom encrypts every 2FA account on your device before it syncs. Our servers only ever see ciphertext.',
  },
  {
    title: 'One master password unlocks it',
    body: 'Pick a long passphrase you’ll remember. It never leaves your device — not even to us.',
  },
  {
    title: 'Nobody can reset it',
    body: 'If you forget it, your vault can’t be recovered. Write it down and keep it somewhere safe, and keep encrypted backups.',
  },
];

/** First-run explainer shown before creating the master password. */
function Onboarding({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const [step, setStep] = useState(0);
  const last = step === INTRO.length - 1;
  const page = INTRO[step]!;
  return (
    <View style={[s.container, { backgroundColor: c.bg }]}>
      <View style={s.inner}>
        <Image source={logoMark} style={s.logo} accessibilityLabel="Bloom logo" />
        <Text style={[s.step, { color: c.accent }]}>
          Step {step + 1} of {INTRO.length}
        </Text>
        <Text style={[s.title, { color: c.text }]} accessibilityRole="header">
          {page.title}
        </Text>
        <Text style={{ color: c.muted, fontSize: 16 }}>{page.body}</Text>
        <Button
          title={last ? 'Create master password' : 'Next'}
          onPress={() => (last ? onDone() : setStep(step + 1))}
        />
        {step > 0 && <Button variant="secondary" title="Back" onPress={() => setStep(step - 1)} />}
      </View>
    </View>
  );
}

/** Create (first time) or enter the master password, or use Face ID / fingerprint if enabled. */
export function UnlockScreen() {
  const vault = useVault();
  const c = useColors();
  const isSetup = vault.status === 'needs-setup';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const [ack, setAck] = useState(false);
  const strength = strengthOf(password);

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
    if (isSetup && password.length < MIN_MASTER_PASSWORD)
      return setError(`Use at least ${MIN_MASTER_PASSWORD} characters.`);
    if (isSetup && !ack) return setError('Please confirm you understand it can’t be recovered.');
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

  if (isSetup && !introDone) return <Onboarding onDone={() => setIntroDone(true)} />;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.inner}>
          <Text accessibilityRole="header" style={[s.title, { color: c.text }]}>
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
          {isSetup && password.length > 0 && (
            <View accessible accessibilityLabel={`Strength: ${strength.label}`}>
              <View style={[s.meter, { backgroundColor: c.border }]}>
                <View
                  style={[
                    s.meterFill,
                    {
                      width: `${(strength.score / 3) * 100}%`,
                      backgroundColor:
                        strength.score >= 2
                          ? c.success
                          : strength.score >= 1
                            ? c.warning
                            : c.danger,
                    },
                  ]}
                />
              </View>
              <Text style={{ color: c.muted, fontSize: 12 }}>{strength.label}</Text>
            </View>
          )}
          {isSetup && (
            <View>
              <Label>Confirm</Label>
              <Input secureTextEntry value={confirm} onChangeText={setConfirm} />
            </View>
          )}
          {isSetup && (
            <Pressable
              onPress={() => setAck(!ack)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: ack }}
              style={s.ack}
            >
              <View
                style={[
                  s.box,
                  { borderColor: c.accent, backgroundColor: ack ? c.accent : 'transparent' },
                ]}
              >
                {ack && <Text style={{ color: c.accentText, fontWeight: '700' }}>✓</Text>}
              </View>
              <Text style={{ color: c.text, flex: 1 }}>
                I understand Bloom can’t recover my vault if I forget this password.
              </Text>
            </Pressable>
          )}
          {busy ? (
            <ActivityIndicator />
          ) : (
            <Button title={isSetup ? 'Create vault' : 'Unlock'} onPress={submit} />
          )}
          {!isSetup && vault.biometric.enabled && (
            <Button variant="secondary" title="Use Face ID / fingerprint" onPress={tryBiometric} />
          )}
          {error && (
            <Text style={ui.error} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  inner: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 12 },
  logo: { width: 96, height: 96, alignSelf: 'center' },
  step: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  meter: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  meterFill: { height: 6 },
  ack: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 24, fontWeight: '700' },
});
