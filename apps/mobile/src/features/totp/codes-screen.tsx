import { ink, rose, semantic } from '@repo/brand';
import { base32Decode, hotp, secondsRemaining, totp } from '@repo/crypto';
import { issuerIcon, issuerInitials } from '@repo/importers';
import {
  accountsInFolder,
  ALL_FOLDERS,
  filterAccounts,
  type AccountData,
  type Decrypted,
} from '@repo/vault';
import * as Clipboard from 'expo-clipboard';
import { Link, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Prompt } from '@/components/prompt';
import { useColors } from '@/components/theme';
import { Button, Input } from '@/components/ui';
import { usePreferences } from '@/features/settings/preferences';
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

function Badge({ issuer }: { issuer: string }) {
  const icon = issuerIcon(issuer);
  return (
    <View
      style={[s.badge, { backgroundColor: icon ? `#${icon.color.replace('#', '')}` : ink[500] }]}
    >
      <Text style={s.badgeText}>{issuerInitials(issuer || '?')}</Text>
    </View>
  );
}

function CodeRow({ item, now }: { item: Decrypted<AccountData>; now: number }) {
  const vault = useVault();
  const c = useColors();
  const { clipboardClearSeconds } = usePreferences();
  const a = item.data;
  const code = codeFor(a, now);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    if (clipboardClearSeconds > 0) {
      setTimeout(async () => {
        if ((await Clipboard.getStringAsync()) === code) await Clipboard.setStringAsync('');
      }, clipboardClearSeconds * 1000);
    }
  };

  return (
    <Pressable
      style={[s.row, { backgroundColor: c.card }]}
      onPress={copy}
      onLongPress={() => router.push({ pathname: '/edit-account', params: { id: item.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${a.issuer || a.label}, code ${code.split('').join(' ')}`}
      accessibilityHint="Tap to copy. Long press to edit."
      accessibilityActions={[{ name: 'longpress', label: 'Edit account' }]}
      onAccessibilityAction={() =>
        router.push({ pathname: '/edit-account', params: { id: item.id } })
      }
    >
      <Badge issuer={a.issuer || a.label} />
      <View style={s.flex}>
        <Text style={{ color: c.muted }} numberOfLines={1}>
          {a.issuer} · {a.label}
        </Text>
        <Text style={[s.code, { color: c.text }]}>{code.replace(/(\d{3})(?=\d)/g, '$1 ')}</Text>
        {copied && <Text style={s.copied}>Copied</Text>}
      </View>
      {a.type === 'hotp' ? (
        <Pressable
          style={s.next}
          onPress={() => vault.save('account', { ...a, counter: (a.counter ?? 0) + 1 }, item.id)}
        >
          <Text style={{ color: c.accent }}>Next</Text>
        </Pressable>
      ) : (
        <CountdownRing remaining={secondsRemaining(a.period, now)} period={a.period} />
      )}
    </Pressable>
  );
}

export function CodesScreen() {
  const vault = useVault();
  const c = useColors();
  const now = useNow();
  const [query, setQuery] = useState('');
  const [folder, setFolder] = useState(ALL_FOLDERS);
  const [prompt, setPrompt] = useState<null | 'new' | 'rename'>(null);
  const visible = useMemo(
    () => filterAccounts(vault.accounts, folder, query),
    [vault.accounts, folder, query],
  );
  const current = vault.folders.find((f) => f.id === folder);

  const deleteFolder = async () => {
    if (!current) return;
    // Accounts are kept: move them out of the folder first.
    for (const a of accountsInFolder(vault.accounts, current.id)) {
      await vault.save('account', { ...a.data, folderId: undefined }, a.id);
    }
    await vault.remove(current.id);
    setFolder(ALL_FOLDERS);
    setPrompt(null);
  };

  const chip = (id: string, label: string, onLongPress?: () => void) => (
    <Pressable
      key={id}
      onPress={() => setFolder(id)}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: folder === id }}
      accessibilityLabel={`Folder ${label}`}
      accessibilityHint={onLongPress ? 'Long press to rename or delete' : undefined}
      style={[
        s.chip,
        { borderColor: c.border },
        folder === id && { backgroundColor: c.accent, borderColor: c.accent },
      ]}
    >
      <Text style={{ color: folder === id ? 'white' : c.text }}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[s.container, { backgroundColor: c.bg }]}>
      <Input placeholder="Search" value={query} onChangeText={setQuery} style={s.search} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
        {chip(ALL_FOLDERS, 'All')}
        {vault.folders.map((f) =>
          chip(f.id, f.data.name, () => {
            setFolder(f.id);
            setPrompt('rename');
          }),
        )}
        <Pressable style={s.chip} onPress={() => setPrompt('new')}>
          <Text style={{ color: c.accent }}>+ Folder</Text>
        </Pressable>
      </ScrollView>
      <FlatList
        data={visible}
        keyExtractor={(a) => a.id}
        renderItem={({ item }) => <CodeRow item={item} now={now} />}
        refreshControl={<RefreshControl refreshing={vault.syncing} onRefresh={vault.sync} />}
        ListEmptyComponent={
          <Text style={[s.empty, { color: c.muted }]}>No accounts here. Tap “Add account”.</Text>
        }
        ListFooterComponent={
          <Text style={[s.hint, { color: c.muted }]}>
            Tap to copy · long-press to edit · long-press a folder to rename
          </Text>
        }
      />
      {vault.error && <Text style={s.error}>{vault.error}</Text>}
      <View style={s.links}>
        <Link href="/add-account" style={{ color: c.accent }}>
          Add account
        </Link>
        <Link href="/settings" style={{ color: c.accent }}>
          Settings
        </Link>
      </View>

      <Prompt
        visible={prompt !== null}
        title={prompt === 'new' ? 'New folder' : 'Rename folder'}
        initial={prompt === 'rename' ? (current?.data.name ?? '') : ''}
        onCancel={() => setPrompt(null)}
        onSubmit={async (name) => {
          if (!name) return;
          if (prompt === 'new') setFolder(await vault.save('folder', { name }));
          else if (current) await vault.save('folder', { name }, current.id);
          setPrompt(null);
        }}
        extra={
          prompt === 'rename' ? (
            <Button
              variant="danger"
              title="Delete folder (keeps accounts)"
              onPress={() =>
                Alert.alert('Delete folder?', 'Accounts inside move to "All".', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: deleteFolder },
                ])
              }
            />
          ) : undefined
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
  search: { marginBottom: 10 },
  chips: { gap: 8, paddingBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: 'white', fontWeight: '600' },
  code: { fontSize: 28, fontVariant: ['tabular-nums'], letterSpacing: 2 },
  copied: { color: semantic.success, fontSize: 12 },
  next: {
    borderWidth: 1,
    borderColor: rose[200],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  empty: { textAlign: 'center', marginTop: 40 },
  hint: { textAlign: 'center', fontSize: 12, marginTop: 8 },
  error: { color: semantic.danger, textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'space-around', padding: 16 },
});
