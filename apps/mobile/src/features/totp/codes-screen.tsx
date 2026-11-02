import { base32Decode, hotp, secondsRemaining, totp } from '@repo/crypto';
import type { AccountData, Decrypted } from '@repo/vault';
import * as Clipboard from 'expo-clipboard';
import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/ui';
import { useVault } from '@/features/vault/vault-store';
import { CountdownRing } from './countdown-ring';

/** One clock for the whole list. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function codeFor(a: AccountData, now: number) {
  try {
    if (a.type === 'hotp')
      return hotp(base32Decode(a.secret), a.counter ?? 0, a.digits, a.algorithm);
    return totp(a.secret, {
      algorithm: a.algorithm,
      digits: a.digits as 6 | 7 | 8,
      period: a.period,
      timestamp: now,
    });
  } catch {
    return '-'.repeat(a.digits);
  }
}

function CodeRow({ item, now }: { item: Decrypted<AccountData>; now: number }) {
  const vault = useVault();
  const a = item.data;
  const code = codeFor(a, now);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    // Clear after 30s if it still holds our code.
    setTimeout(async () => {
      if ((await Clipboard.getStringAsync()) === code) await Clipboard.setStringAsync('');
    }, 30_000);
  };

  return (
    <Pressable style={s.row} onPress={copy}>
      <View style={s.flex}>
        <Text style={s.issuer} numberOfLines={1}>
          {a.issuer} <Text style={s.label}>{a.label}</Text>
        </Text>
        <Text style={s.code}>{code.replace(/(\d{3})(?=\d)/g, '$1 ')}</Text>
        {copied && <Text style={s.copied}>Copied</Text>}
      </View>
      {a.type === 'hotp' ? (
        <Pressable
          style={s.next}
          onPress={() => vault.save('account', { ...a, counter: (a.counter ?? 0) + 1 }, item.id)}
        >
          <Text style={s.nextText}>Next</Text>
        </Pressable>
      ) : (
        <CountdownRing remaining={secondsRemaining(a.period, now)} period={a.period} />
      )}
    </Pressable>
  );
}

export function CodesScreen() {
  const vault = useVault();
  const now = useNow();
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vault.accounts.filter(
      (a) => !q || `${a.data.issuer} ${a.data.label}`.toLowerCase().includes(q),
    );
  }, [vault.accounts, query]);

  return (
    <View style={s.container}>
      <Input placeholder="Search" value={query} onChangeText={setQuery} style={s.search} />
      <FlatList
        data={visible}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <CodeRow item={item} now={now} />}
        refreshControl={<RefreshControl refreshing={vault.syncing} onRefresh={vault.sync} />}
        ListEmptyComponent={<Text style={s.empty}>No accounts yet. Tap “Add account”.</Text>}
      />
      {vault.error && <Text style={s.error}>{vault.error}</Text>}
      <View style={s.links}>
        <Link href="/add-account">Add account</Link>
        <Link href="/settings">Settings</Link>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  search: { marginBottom: 12 },
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
    marginBottom: 12,
  },
  issuer: { color: '#334155' },
  label: { color: '#94a3b8' },
  code: { fontSize: 28, fontVariant: ['tabular-nums'], letterSpacing: 2 },
  copied: { color: '#059669', fontSize: 12 },
  next: {
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  nextText: { color: '#4f46e5' },
  empty: { textAlign: 'center', color: '#64748b', marginTop: 40 },
  error: { color: '#dc2626', textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
});
