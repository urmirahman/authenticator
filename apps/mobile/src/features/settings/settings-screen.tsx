import {
  AUTO_LOCK_OPTIONS,
  CLIPBOARD_CLEAR_OPTIONS,
  minutesLabel,
  secondsLabel,
} from '@repo/vault';
import { File, Paths } from 'expo-file-system';
import { router, type Href } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useColors } from '@/components/theme';
import { Button, Choice, Input, Label, Muted, Screen, Section } from '@/components/ui';
import { clearBiometricKey } from '@/features/security/biometric-key';
import { useVault } from '@/features/vault/vault-store';
import { api, signOut } from '@/lib/api';
import { usePreferences } from './preferences';

const LINKS: Array<{ href: Href; label: string }> = [
  { href: '/backups', label: 'Encrypted backups' },
  { href: '/transfer', label: 'Transfer to another phone' },
  { href: '/devices', label: 'Devices' },
  { href: '/activity', label: 'Activity log' },
];

function ChangePassword() {
  const vault = useVault();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (f.next.length < 10) return setMsg('Use at least 10 characters.');
    if (f.next !== f.confirm) return setMsg('New passwords do not match.');
    setBusy(true);
    setMsg(null);
    await new Promise((r) => setTimeout(r, 50));
    try {
      await vault.changePassword(f.current, f.next);
      setF({ current: '', next: '', confirm: '' });
      setMsg('Changed. Biometric unlock was turned off; turn it on again if you want it.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Label>Current master password</Label>
      <Input
        secureTextEntry
        value={f.current}
        onChangeText={(current) => setF({ ...f, current })}
      />
      <Label>New master password</Label>
      <Input secureTextEntry value={f.next} onChangeText={(next) => setF({ ...f, next })} />
      <Label>Confirm</Label>
      <Input
        secureTextEntry
        value={f.confirm}
        onChangeText={(confirm) => setF({ ...f, confirm })}
      />
      <Button
        variant="secondary"
        title={busy ? 'Working…' : 'Change master password'}
        disabled={busy}
        onPress={submit}
      />
      {msg && <Muted>{msg}</Muted>}
    </>
  );
}

export function SettingsScreen() {
  const vault = useVault();
  const prefs = usePreferences();
  const c = useColors();
  const [bioMsg, setBioMsg] = useState<string | null>(null);

  /** "Download my data": write the JSON to a temp file and open the share sheet. */
  const exportData = async () => {
    const data = await api.users.exportData();
    const file = new File(Paths.cache, 'authenticator-export.json');
    file.write(JSON.stringify(data, null, 2));
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
  };

  return (
    <Screen>
      {LINKS.map((l) => (
        <Pressable
          key={l.label}
          style={[s.link, { backgroundColor: c.card }]}
          onPress={() => router.push(l.href)}
        >
          <Text style={{ color: c.text }}>{l.label}</Text>
          <Text style={{ color: c.muted }}>›</Text>
        </Pressable>
      ))}

      <Section title="Security">
        <Label>Lock after this long in the background</Label>
        <Choice
          options={AUTO_LOCK_OPTIONS}
          value={prefs.autoLockMinutes as (typeof AUTO_LOCK_OPTIONS)[number]}
          label={minutesLabel}
          onChange={(autoLockMinutes) => prefs.update({ autoLockMinutes })}
        />
        <Label>Clear clipboard after copying</Label>
        <Choice
          options={CLIPBOARD_CLEAR_OPTIONS}
          value={prefs.clipboardClearSeconds as (typeof CLIPBOARD_CLEAR_OPTIONS)[number]}
          label={secondsLabel}
          onChange={(clipboardClearSeconds) => prefs.update({ clipboardClearSeconds })}
        />
        {vault.biometric.available && (
          <View style={s.switchRow}>
            <Text style={[s.flex, { color: c.text }]}>Unlock with Face ID / fingerprint</Text>
            <Switch
              value={vault.biometric.enabled}
              onValueChange={(on) =>
                vault.setBiometric(on).then(
                  () => setBioMsg(null),
                  (e: Error) => setBioMsg(e.message),
                )
              }
            />
          </View>
        )}
        <Muted>
          Biometric unlock keeps a copy of the vault key in this phone&apos;s secure hardware.
          Anyone who can pass your Face ID / fingerprint can open the vault. Off by default.
        </Muted>
        {bioMsg && <Muted>{bioMsg}</Muted>}
      </Section>

      <Section title="Appearance">
        <Choice
          options={['system', 'light', 'dark'] as const}
          value={prefs.theme}
          label={(t) => t[0]!.toUpperCase() + t.slice(1)}
          onChange={(theme) => prefs.update({ theme })}
        />
      </Section>

      <Section title="Master password">
        <ChangePassword />
      </Section>

      <Section title="Your data">
        <Button variant="secondary" title="Download my data (JSON)" onPress={exportData} />
      </Section>

      <Button
        title={vault.syncing ? 'Syncing…' : 'Sync now'}
        onPress={vault.sync}
        variant="secondary"
      />
      <Button title="Lock now" onPress={vault.lock} variant="secondary" />
      <Button
        variant="danger"
        title="Sign out"
        onPress={async () => {
          vault.lock();
          await clearBiometricKey(); // a new sign-in must opt in again
          await signOut();
          router.replace('/sign-in');
        }}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  link: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1 },
});
