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
import { useLogoMark } from '@/components/brand-images';
import { useColors } from '@/components/theme';
import { Button, FadeIn, IconBubble, Input, Label, styles as ui } from '@/components/ui';
import { leaveApp } from '@/features/session/leave-app';
import { session } from '@/features/session/session';
import { useHaptics } from '@/lib/motion';
import { useVault } from './vault-store';

const INTRO = [
  {
    icon: 'lock-closed-outline' as const,
    title: 'Encrypted on this device',
    body: 'Servers only see locked data.',
  },
  {
    icon: 'key-outline' as const,
    title: 'One master password',
    body: 'It never leaves this device.',
  },
  {
    icon: 'heart-outline' as const,
    title: 'Nobody can open it',
    body: 'If you forget it, nobody can open the vault. Write it down.',
  },
];

/** First-run explainer shown before creating the master password. */
function Onboarding({
  onDone,
  onLeave,
  leaveLabel,
  leaving,
}: {
  onDone: () => void;
  onLeave: () => void;
  leaveLabel: string;
  leaving: boolean;
}) {
  const c = useColors();
  const mark = useLogoMark();
  const [step, setStep] = useState(0);
  const last = step === INTRO.length - 1;
  const page = INTRO[step]!;
  return (
    <View style={[s.container, { backgroundColor: c.bg }]}>
      <View style={s.inner}>
        <Image source={mark} style={s.logo} accessibilityLabel="Bloom logo" />
        <View style={s.dots} accessible accessibilityLabel={`Step ${step + 1} of ${INTRO.length}`}>
          {INTRO.map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                { backgroundColor: i === step ? c.accent : c.border },
                i === step && { width: 22 },
              ]}
            />
          ))}
        </View>
        <FadeIn key={step}>
          <View style={{ gap: 10, alignItems: 'center' }}>
            <IconBubble name={page.icon} />
            <Text
              style={[s.title, { color: c.text, textAlign: 'center' }]}
              accessibilityRole="header"
            >
              {page.title}
            </Text>
            <Text style={[s.body, { color: c.muted }]}>{page.body}</Text>
          </View>
        </FadeIn>
        <View style={{ height: 8 }} />
        <Button
          title={last ? 'Create' : 'Next'}
          onPress={() => (last ? onDone() : setStep(step + 1))}
        />
        {step > 0 && <Button variant="ghost" title="Back" onPress={() => setStep(step - 1)} />}
        <Button variant="ghost" title={leaveLabel} onPress={onLeave} disabled={leaving} />
      </View>
    </View>
  );
}

/** Create (first time) or enter the master password, or use Face ID / fingerprint if enabled. */
export function UnlockScreen() {
  const vault = useVault();
  const c = useColors();
  const mark = useLogoMark();
  const haptic = useHaptics();
  const isSetup = vault.status === 'needs-setup';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [introDone, setIntroDone] = useState(false);
  const [ack, setAck] = useState(false);
  const [offline, setOffline] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const strength = strengthOf(password);
  const leaveLabel = offline || isSetup ? 'Leave' : 'Sign out';

  useEffect(() => {
    session.isOffline().then(setOffline);
  }, []);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    leaveApp(vault).catch(() => {
      setLeaving(false);
      setError('Could not sign out. Try again.');
    });
  };

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
      haptic('warning');
      setError(
        isSetup
          ? e instanceof Error
            ? e.message
            : 'Something went wrong'
          : 'That password didn’t open your vault. Try again?',
      );
    } finally {
      setBusy(false);
    }
  };

  if (isSetup && !introDone)
    return (
      <Onboarding
        onDone={() => setIntroDone(true)}
        onLeave={leave}
        leaveLabel={leaveLabel}
        leaving={leaving}
      />
    );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        <View style={s.inner}>
          <Image source={mark} style={s.logo} accessibilityLabel="Bloom logo" />
          <Text
            accessibilityRole="header"
            style={[s.title, { color: c.text, textAlign: 'center' }]}
          >
            {isSetup ? 'Create your master password' : 'Welcome back'}
          </Text>
          <Text style={[s.body, { color: c.muted }]}>
            {isSetup
              ? 'A long, memorable phrase works best. It never leaves this phone.'
              : 'Enter your master password to open your vault.'}
          </Text>
          <View style={{ height: 8 }} />
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
            <View style={s.busy}>
              <ActivityIndicator color={c.accent} />
              <Text style={{ color: c.muted }}>
                {isSetup ? 'Planting your vault…' : 'Opening your vault…'}
              </Text>
            </View>
          ) : (
            <Button
              title={isSetup ? 'Create vault' : 'Unlock'}
              icon={isSetup ? 'leaf-outline' : 'lock-open-outline'}
              onPress={submit}
            />
          )}
          {!isSetup && vault.biometric.enabled && (
            <Button variant="ghost" icon="scan-outline" title="Face ID" onPress={tryBiometric} />
          )}
          <Button variant="ghost" title={leaveLabel} onPress={leave} disabled={busy || leaving} />
          {error && (
            <Text style={[ui.error, { textAlign: 'center' }]} accessibilityLiveRegion="polite">
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
  logo: { width: 88, height: 88, alignSelf: 'center' },
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
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 23, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 6, alignSelf: 'center', marginVertical: 8 },
  dot: { height: 8, width: 8, borderRadius: 4 },
  busy: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
});
