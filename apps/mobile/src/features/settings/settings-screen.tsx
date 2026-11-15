import {
  AUTO_LOCK_OPTIONS,
  CLIPBOARD_CLEAR_OPTIONS,
  CODE_SIZE_OPTIONS,
  MIN_MASTER_PASSWORD,
  minutesLabel,
  secondsLabel,
} from '@repo/vault';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { View } from 'react-native';
import {
  Button,
  Card,
  ChoiceRow,
  Group,
  Input,
  Label,
  Muted,
  Notice,
  Row,
  Screen,
  SwitchRow,
} from '@/components/ui';
import { useVault } from '@/features/vault/vault-store';
import { session } from '@/features/session/session';
import { api } from '@/lib/api';
import { useHaptics } from '@/lib/motion';
import { openWebPage } from '@/lib/web-url';
import { DeleteAccount } from './delete-account';
import { usePreferences } from './preferences';

function ChangePassword({ onDone }: { onDone: (message: string) => void }) {
  const vault = useVault();
  const haptic = useHaptics();
  const [f, setF] = useState({ current: '', next: '', confirm: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (f.next.length < MIN_MASTER_PASSWORD)
      return setMsg(`Use at least ${MIN_MASTER_PASSWORD} characters.`);
    if (f.next !== f.confirm) return setMsg('New passwords do not match.');
    setBusy(true);
    setMsg(null);
    await new Promise((r) => setTimeout(r, 50));
    try {
      await vault.changePassword(f.current, f.next);
      setF({ current: '', next: '', confirm: '' });
      haptic('success');
      onDone('Password changed. Biometric unlock was turned off — switch it back on if you like.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 6 }}>
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
      <View style={{ height: 6 }} />
      <Button
        title={busy ? 'Re-encrypting…' : 'Change master password'}
        disabled={busy}
        onPress={submit}
      />
      {msg && <Muted>{msg}</Muted>}
    </Card>
  );
}

export function SettingsScreen() {
  const vault = useVault();
  const prefs = usePreferences();
  const [bioMsg, setBioMsg] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  /** "Download my data": write the JSON to a temp file and open the share sheet. */
  const exportData = async () => {
    try {
      let data: unknown;
      if (await session.isOffline()) {
        const lp = await session.getLocalProfile();
        data = {
          exportedAt: new Date().toISOString(),
          user: { displayName: lp?.displayName || 'Anonymous Vault' },
          accounts: vault.accounts.map((a) => a.data),
          folders: vault.folders.map((f) => f.data),
        };
      } else {
        data = await api.users.exportData();
      }
      const file = new File(Paths.cache, 'bloom-export.json');
      file.write(JSON.stringify(data, null, 2));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
    } catch {
      setNotice({
        tone: 'error',
        text: 'We couldn’t prepare your export. Check your connection and try again.',
      });
    }
  };

  const cap = (t: string) => t[0]!.toUpperCase() + t.slice(1);

  return (
    <Screen title="Settings" subtitle="Make Bloom feel like home.">
      {notice && (
        <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
        </Notice>
      )}
      <Group
        title="Security"
        footer="Biometric unlock keeps a copy of the vault key in this phone's secure hardware. Screenshots and screen recording are always blocked while Bloom is open."
      >
        {vault.biometric.available && (
          <SwitchRow
            icon="scan-outline"
            label="Face ID / fingerprint"
            hint={bioMsg ?? 'Unlock without typing your password'}
            value={vault.biometric.enabled}
            onChange={(on) =>
              vault.setBiometric(on).then(
                () => setBioMsg(null),
                (e: Error) => setBioMsg(e.message),
              )
            }
          />
        )}
        <ChoiceRow
          label="Auto-lock after"
          options={AUTO_LOCK_OPTIONS}
          value={prefs.autoLockMinutes as (typeof AUTO_LOCK_OPTIONS)[number]}
          format={minutesLabel}
          onChange={(autoLockMinutes) => prefs.update({ autoLockMinutes })}
        />
        <Row icon="lock-closed-outline" label="Lock now" onPress={vault.lock} />
        <Row
          icon="key-outline"
          label="Change master password"
          onPress={() => setChanging(!changing)}
          last
        />
      </Group>
      {changing && (
        <ChangePassword
          onDone={(text) => {
            setChanging(false);
            setNotice({ tone: 'success', text });
          }}
        />
      )}

      <Group title="Preferences">
        <ChoiceRow
          label="Theme"
          options={['system', 'light', 'dark'] as const}
          value={prefs.theme}
          format={cap}
          onChange={(theme) => prefs.update({ theme })}
        />
        <ChoiceRow
          label="Clear clipboard after copying"
          options={CLIPBOARD_CLEAR_OPTIONS}
          value={prefs.clipboardClearSeconds as (typeof CLIPBOARD_CLEAR_OPTIONS)[number]}
          format={secondsLabel}
          onChange={(clipboardClearSeconds) => prefs.update({ clipboardClearSeconds })}
        />
        <ChoiceRow
          label="Code size"
          options={CODE_SIZE_OPTIONS}
          value={prefs.codeSize}
          format={cap}
          onChange={(codeSize) => prefs.update({ codeSize })}
        />
        <SwitchRow
          icon="pause-outline"
          label="Group digits"
          hint="Show 123 456 instead of 123456"
          value={prefs.groupDigits}
          onChange={(groupDigits) => prefs.update({ groupDigits })}
        />
        <SwitchRow
          icon="play-forward-outline"
          label="Show next code"
          hint="Peek at the upcoming code in the last 10 seconds"
          value={prefs.showNextCode}
          onChange={(showNextCode) => prefs.update({ showNextCode })}
        />
        <SwitchRow
          icon="pulse-outline"
          label="Haptics"
          hint="Gentle taps when you copy or switch"
          value={prefs.haptics}
          onChange={(haptics) => prefs.update({ haptics })}
          last
        />
      </Group>

      <Group title="Your data">
        <Row
          icon="swap-horizontal-outline"
          label="Import from another app"
          onPress={() => router.push('/import')}
        />
        <Row
          icon="cloud-upload-outline"
          label="Encrypted backups"
          onPress={() => router.push('/backups')}
        />
        <Row
          icon="qr-code-outline"
          label="Move to a new phone"
          onPress={() => router.push('/transfer')}
        />
        <Row
          icon="sync-outline"
          label={vault.syncing ? 'Syncing…' : 'Sync now'}
          onPress={vault.sync}
        />
        <Row
          icon="download-outline"
          label="Download my data"
          hint="A JSON copy; your codes stay encrypted"
          onPress={exportData}
          last
        />
      </Group>

      <Group title="About">
        <Row icon="help-buoy-outline" label="Help & FAQ" onPress={() => router.push('/help')} />
        <Row
          icon="shield-checkmark-outline"
          label="Privacy policy"
          external
          onPress={() => openWebPage('/privacy')}
        />
        <Row
          icon="document-text-outline"
          label="Terms of service"
          external
          onPress={() => openWebPage('/terms')}
        />
        <Row
          icon="flower-outline"
          label="Version"
          value={Constants.expoConfig?.version ?? '—'}
          last
        />
      </Group>

      <Group title="Danger zone">
        <Row
          icon="trash-outline"
          label="Delete account"
          destructive
          onPress={() => setDeleting(!deleting)}
          last
        />
      </Group>
      {deleting && <DeleteAccount />}
    </Screen>
  );
}
