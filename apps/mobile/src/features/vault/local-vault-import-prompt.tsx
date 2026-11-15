import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text } from 'react-native';
import { useColors } from '@/components/theme';
import { Button, Input } from '@/components/ui';
import { session } from '@/features/session/session';
import { hasLocalVaultData, importLocalAccounts } from './import-local-vault';
import { useVault } from './vault-store';

/** One-time-per-mount prompt after cloud unlock when offline vault files remain on disk. */
export function LocalVaultImportPrompt() {
  const c = useColors();
  const vault = useVault();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (vault.status !== 'unlocked' || done) return;
    let cancelled = false;
    (async () => {
      if (await session.isOffline()) return;
      if (!(await hasLocalVaultData())) return;
      if (!cancelled) setOpen(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [vault.status, done]);

  const dismiss = () => {
    setOpen(false);
    setDone(true);
    setPassword('');
    setError(null);
  };

  const importNow = async () => {
    setBusy(true);
    setError(null);
    try {
      const { added, skipped } = await importLocalAccounts(password, vault);
      setOpen(false);
      setDone(true);
      setPassword('');
      if (added === 0 && skipped === 0) return;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={dismiss}>
      <Pressable style={s.backdrop} onPress={dismiss}>
        <Pressable
          style={[s.card, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[s.title, { color: c.text }]}>Import offline accounts?</Text>
          <Text style={{ color: c.muted, lineHeight: 20 }}>
            You have accounts from offline mode. Import them to your Google vault? Your logins keep
            the same codes.
          </Text>
          <Input
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="Offline master password"
            accessibilityLabel="Offline master password"
          />
          {busy ? (
            <ActivityIndicator color={c.accent} />
          ) : (
            <Button title="Import" disabled={!password} onPress={importNow} />
          )}
          {error && (
            <Text style={{ color: c.danger, textAlign: 'center' }} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}
          <Button variant="ghost" title="Not now" onPress={dismiss} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: '600' },
});
