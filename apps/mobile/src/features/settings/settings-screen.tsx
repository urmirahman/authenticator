import { dedupe } from '@repo/importers';
import type { AccountData } from '@repo/vault';
import {
  AUTO_LOCK_OPTIONS,
  CLIPBOARD_CLEAR_OPTIONS,
  CODE_SIZE_OPTIONS,
  MIN_MASTER_PASSWORD,
  minutesLabel,
  secondsLabel,
  toImported,
} from '@repo/vault';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
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

function accountKey(a: { secret: string; issuer: string; label: string }) {
  return `${a.secret}|${a.issuer.toLowerCase()}|${a.label.toLowerCase()}`;
}

function asAccount(raw: unknown): AccountData | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Partial<AccountData>;
  if (typeof a.secret !== 'string' || !a.secret.trim()) return null;
  return {
    issuer: typeof a.issuer === 'string' ? a.issuer : '',
    label: typeof a.label === 'string' ? a.label : '',
    secret: a.secret,
    algorithm: a.algorithm ?? 'SHA1',
    digits: a.digits ?? 6,
    period: a.period ?? 30,
    type: a.type,
    counter: a.counter,
    folderId: typeof a.folderId === 'string' ? a.folderId : undefined,
    expiresAt: a.expiresAt,
    schema: a.schema,
  };
}

async function importFolders(
  raw: unknown,
  vault: {
    folders: { id: string; data: { name: string } }[];
    save(kind: 'folder', data: { name: string }): Promise<string>;
  },
) {
  const map = new Map<string, string>();
  const byName = new Map(vault.folders.map((f) => [f.data.name, f.id]));
  if (!Array.isArray(raw)) return map;
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const name = (item as { name?: unknown }).name;
    const id = (item as { id?: unknown }).id;
    if (typeof name !== 'string' || !name) continue;
    let next = byName.get(name);
    if (!next) {
      next = await vault.save('folder', { name });
      byName.set(name, next);
    }
    if (typeof id === 'string') map.set(id, next);
  }
  return map;
}

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
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    session.isOffline().then(setOffline);
  }, []);

  /** "Export JSON": write the JSON to a temp file and open the share sheet. */
  const exportData = async () => {
    try {
      let data: unknown;
      if (await session.isOffline()) {
        const lp = await session.getLocalProfile();
        data = {
          exportedAt: new Date().toISOString(),
          user: { displayName: lp?.displayName || 'Anonymous Vault' },
          accounts: vault.accounts.map((a) => a.data),
          folders: vault.folders.map((f) => ({ id: f.id, name: f.data.name })),
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

  const importJson = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', '*/*'],
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    let raw: unknown;
    try {
      raw = JSON.parse(await new File(res.assets[0]!.uri).text());
    } catch {
      setNotice({ tone: 'error', text: 'This file isn’t a Bloom JSON export.' });
      return;
    }
    const body = raw as { accounts?: unknown; folders?: unknown };
    if (!body || !Array.isArray(body.accounts)) {
      setNotice({ tone: 'error', text: 'This file isn’t a Bloom JSON export.' });
      return;
    }
    const accounts = body.accounts.flatMap((item) => {
      const a = asAccount(item);
      return a ? [a] : [];
    });
    const fresh = dedupe(
      vault.accounts.map((a) => toImported(a.data)),
      accounts.map((a) => toImported(a)),
    );
    const freshKeys = new Set(fresh.map(accountKey));
    const seen = new Set<string>();
    const toAdd = accounts.filter((a) => {
      const key = accountKey(a);
      if (!freshKeys.has(key) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const skipped = accounts.length - toAdd.length;
    if (toAdd.length === 0) {
      setNotice({
        tone: accounts.length === 0 ? 'error' : 'success',
        text:
          accounts.length === 0
            ? 'This file has no accounts.'
            : `Added 0. Skipped ${skipped} already in your vault.`,
      });
      return;
    }
    const go = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Import JSON',
        `Add ${toAdd.length} accounts? ${skipped} already in your vault will be skipped.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Add', onPress: () => resolve(true) },
        ],
      );
    });
    if (!go) return;
    const folderId = await importFolders(body.folders, vault);
    let added = 0;
    for (const a of toAdd) {
      const mapped = a.folderId ? folderId.get(a.folderId) : undefined;
      await vault.save('account', { ...a, folderId: mapped });
      added++;
    }
    setNotice({
      tone: 'success',
      text: `Added ${added}. Skipped ${skipped} already in your vault.`,
    });
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
        <Row icon="key-outline" label="Password" onPress={() => setChanging(!changing)} last />
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
          label="Clipboard"
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
          label="Next code"
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
        <Row icon="swap-horizontal-outline" label="Import" onPress={() => router.push('/import')} />
        <Row icon="qr-code-outline" label="Transfer" onPress={() => router.push('/transfer')} />
        <Row
          icon="sync-outline"
          label={vault.syncing ? 'Syncing…' : 'Sync now'}
          onPress={vault.sync}
        />
        <Row
          icon="download-outline"
          label="Export JSON"
          hint={
            offline
              ? 'A JSON file of your accounts. Keep it private.'
              : 'A JSON copy; your codes stay encrypted.'
          }
          onPress={exportData}
        />
        <Row
          icon="document-outline"
          label="Import JSON"
          hint="Add accounts from a Bloom JSON file. Accounts you already have stay."
          onPress={importJson}
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
