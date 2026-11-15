import { ApiError } from '@repo/api-client';
import { dedupe } from '@repo/importers';
import type { BackupMeta } from '@repo/types';
import {
  decryptBackup,
  encryptBackup,
  toAccountData,
  toImported,
  type BackupKdf,
} from '@repo/vault';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { Prompt } from '@/components/prompt';
import { useColors } from '@/components/theme';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Muted,
  Notice,
  Screen,
  Section,
  styles as ui,
} from '@/components/ui';
import { leaveApp } from '@/features/session/leave-app';
import { session } from '@/features/session/session';
import { useVault } from '@/features/vault/vault-store';
import { api } from '@/lib/api';

/** Mobile-friendly Argon2id settings (the server accepts >= 19 MiB, 2 passes). */
const BACKUP_KDF = {
  algorithm: 'argon2id' as const,
  memoryKiB: 19 * 1024,
  iterations: 2,
  parallelism: 1,
};

/** Same format as the web app (@repo/vault backup-codec), so backups restore on either. */
export function BackupScreen() {
  const vault = useVault();
  const c = useColors();
  const [backups, setBackups] = useState<BackupMeta[]>([]);
  const [pw, setPw] = useState({ name: '', password: '', confirm: '' });
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [offline, setOffline] = useState<boolean | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);

  const noteAuthFailure = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      setNeedsReauth(true);
      setMsg('Session expired. Sign out and sign in again.');
      return true;
    }
    return false;
  }, []);

  const load = useCallback(
    () =>
      api.backups.list().then(setBackups, (e: unknown) => {
        noteAuthFailure(e);
      }),
    [noteAuthFailure],
  );
  useEffect(() => {
    session.isOffline().then(setOffline);
  }, []);
  useEffect(() => {
    if (offline === false) load();
  }, [offline, load]);

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setMsg(null);
    await new Promise((r) => setTimeout(r, 50));
    try {
      setMsg(await fn());
    } catch (e) {
      if (!noteAuthFailure(e)) setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const create = () => {
    if (pw.password.length < 10) return setMsg('Use a backup password of at least 10 characters.');
    if (pw.password !== pw.confirm) return setMsg('Passwords do not match.');
    run(async () => {
      const accounts = vault.accounts.map((a) => toImported(a.data));
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const enc = await encryptBackup(pw.password, accounts, { ...BACKUP_KDF, salt });
      await api.backups.create({
        name: pw.name || `Phone backup ${new Date().toLocaleString()}`,
        ...enc,
        kdf: { ...enc.kdf },
        itemCount: accounts.length,
      });
      setPw({ name: '', password: '', confirm: '' });
      await load();
      return `Backup saved (${accounts.length} accounts).`;
    });
  };

  const restore = (password: string) => {
    const id = restoreId!;
    setRestoreId(null);
    run(async () => {
      const b = await api.backups.get(id);
      const accounts = await decryptBackup(password, { ...b, kdf: b.kdf as unknown as BackupKdf });
      await vault.sync();
      const fresh = dedupe(
        vault.accounts.map((a) => toImported(a.data)),
        accounts,
      );
      for (const a of fresh) await vault.save('account', toAccountData(a));
      await vault.sync();
      const skipped = accounts.length - fresh.length;
      return `Existing accounts unchanged. Added ${fresh.length}. Skipped ${skipped} duplicate(s).`;
    });
  };

  const remove = (b: BackupMeta) =>
    Alert.alert(`Delete "${b.name}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => api.backups.remove(b.id).then(load, noteAuthFailure),
      },
    ]);

  if (offline === null) {
    return (
      <Screen>
        <ActivityIndicator color={c.accent} />
      </Screen>
    );
  }

  if (offline) {
    return (
      <Screen>
        <Notice>Offline mode doesn’t need a backup.</Notice>
      </Screen>
    );
  }

  return (
    <Screen>
      <Muted>
        Sealed on this phone with its own backup password. Even we can&apos;t open it, so keep that
        password somewhere safe. Restores add missing accounts; they don&apos;t replace what&apos;s
        already in your vault.
      </Muted>
      <Section title={`New backup · ${vault.accounts.length} accounts`}>
        <Label>Name (optional)</Label>
        <Input value={pw.name} onChangeText={(name) => setPw({ ...pw, name })} />
        <Label>Backup password</Label>
        <Input
          secureTextEntry
          value={pw.password}
          onChangeText={(password) => setPw({ ...pw, password })}
        />
        <Label>Confirm</Label>
        <Input
          secureTextEntry
          value={pw.confirm}
          onChangeText={(confirm) => setPw({ ...pw, confirm })}
        />
        <Button
          title="Create backup"
          onPress={create}
          disabled={busy || vault.accounts.length === 0}
        />
      </Section>
      {busy && <ActivityIndicator color={c.accent} />}
      {msg && <Text style={{ color: c.text }}>{msg}</Text>}
      {needsReauth && (
        <Button
          variant="ghost"
          title="Sign out"
          onPress={() => leaveApp(vault).catch(() => setMsg('Could not sign out. Try again.'))}
        />
      )}
      {backups.length > 0 && <Text style={[ui.groupTitle, { color: c.muted }]}>Your backups</Text>}
      {backups.map((b) => (
        <Card key={b.id} style={{ gap: 10 }}>
          <Text style={{ color: c.text, fontWeight: '600', fontSize: 16 }}>{b.name}</Text>
          <Muted>
            {new Date(b.createdAt).toLocaleString()} · {b.itemCount} accounts ·{' '}
            {(b.sizeBytes / 1024).toFixed(1)} KB
          </Muted>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button variant="secondary" title="Restore" onPress={() => setRestoreId(b.id)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button variant="danger" title="Delete" onPress={() => remove(b)} />
            </View>
          </View>
        </Card>
      ))}
      {backups.length === 0 && (
        <EmptyState
          title="No backups yet"
          body="A backup is a sealed copy of your vault. Make one before changing phones."
        />
      )}
      <Prompt
        visible={restoreId !== null}
        title="Backup password"
        confirmLabel="Restore"
        onCancel={() => setRestoreId(null)}
        onSubmit={restore}
      />
    </Screen>
  );
}
