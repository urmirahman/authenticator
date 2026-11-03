import { ink, rose } from '@repo/brand';
import { toGoogleMigration } from '@repo/importers';
import { qrCountFor, toImported } from '@repo/vault';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useColors } from '@/components/theme';
import { Button, Muted, Screen } from '@/components/ui';
import { useVault } from '@/features/vault/vault-store';

/**
 * Move accounts to another phone with Google Authenticator-style QR codes (10 accounts each).
 * The QR codes contain secrets in plain form: hidden until you confirm, and hidden again as soon
 * as the app goes to the background. Screenshots are already blocked app-wide (AppLock).
 */
export function TransferScreen() {
  const vault = useVault();
  const c = useColors();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => st !== 'active' && setRevealed(false));
    return () => sub.remove();
  }, []);

  const uris = useMemo(
    () =>
      revealed
        ? toGoogleMigration(
            vault.accounts.filter((a) => selected.has(a.id)).map((a) => toImported(a.data)),
          )
        : [],
    [revealed, selected, vault.accounts],
  );

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (revealed && uris.length > 0) {
    return (
      <Screen>
        <Text style={[s.title, { color: c.text }]}>
          Scan code {page + 1} of {uris.length}
        </Text>
        <View style={s.qr}>
          <QRCode value={uris[page]!} size={280} />
        </View>
        <View style={s.row}>
          <View style={s.flex}>
            <Button
              variant="secondary"
              title="Previous"
              disabled={page === 0}
              onPress={() => setPage(page - 1)}
            />
          </View>
          <View style={s.flex}>
            <Button
              variant="secondary"
              title="Next"
              disabled={page === uris.length - 1}
              onPress={() => setPage(page + 1)}
            />
          </View>
        </View>
        <Button title="Done, hide codes" onPress={() => (setRevealed(false), setPage(0))} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={s.warning}>
        <Text style={s.warningText}>
          ⚠️ These QR codes contain your secret keys unencrypted. Anyone who sees or photographs
          them can generate your codes. Make sure nobody is watching.
        </Text>
      </View>
      <View style={s.row}>
        <Pressable onPress={() => setSelected(new Set(vault.accounts.map((a) => a.id)))}>
          <Text style={{ color: c.accent }}>Select all</Text>
        </Pressable>
        <Pressable onPress={() => setSelected(new Set())}>
          <Text style={{ color: c.muted }}>Clear</Text>
        </Pressable>
      </View>
      {vault.accounts.map((a) => (
        <Pressable
          key={a.id}
          onPress={() => toggle(a.id)}
          style={[s.item, { backgroundColor: c.card }]}
        >
          <Text style={{ color: c.text }}>
            {selected.has(a.id) ? '☑' : '☐'} {a.data.issuer}{' '}
            <Text style={{ color: c.muted }}>{a.data.label}</Text>
          </Text>
        </Pressable>
      ))}
      {vault.accounts.length === 0 && <Muted>No accounts to transfer.</Muted>}
      <Button
        title={`Show ${qrCountFor(selected.size)} QR code(s) for ${selected.size} account(s)`}
        disabled={selected.size === 0}
        onPress={() => setRevealed(true)}
      />
    </Screen>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '600', textAlign: 'center' },
  qr: { alignSelf: 'center', padding: 16, backgroundColor: 'white', borderRadius: 16 },
  row: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  flex: { flex: 1 },
  warning: {
    backgroundColor: rose[50],
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: rose[200],
  },
  warningText: { color: ink[900] },
  item: { padding: 12, borderRadius: 10 },
});
