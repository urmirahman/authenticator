import { Ionicons } from '@expo/vector-icons';
import { base32Decode, hotp, secondsRemaining, totp } from '@repo/crypto';
import { issuerIcon, issuerInitials } from '@repo/importers';
import {
  accountsInFolder,
  ALL_FOLDERS,
  filterAccounts,
  formatCode,
  type AccountData,
  type Decrypted,
  expiryStatus,
  formatExpiry,
} from '@repo/vault';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Prompt } from '@/components/prompt';
import { useColors } from '@/components/theme';
import { Button, EmptyState, FadeIn, Input, monoFont, Title } from '@/components/ui';
import { useHaptics } from '@/lib/motion';
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
  const c = useColors();
  const icon = issuerIcon(issuer);
  const color = icon ? `#${icon.color.replace('#', '')}` : c.accent;
  return (
    <View style={[s.badge, { backgroundColor: icon ? color : c.accentSoft }]}>
      <Text style={[s.badgeText, { color: icon ? 'white' : c.accent }]}>
        {issuerInitials(issuer || '?')}
      </Text>
    </View>
  );
}

function CodeRow({ item, now }: { item: Decrypted<AccountData>; now: number }) {
  const vault = useVault();
  const c = useColors();
  const haptic = useHaptics();
  const { clipboardClearSeconds, groupDigits, codeSize, showNextCode } = usePreferences();
  const a = item.data;
  const code = codeFor(a, now);
  const remaining = a.type === 'hotp' ? 0 : secondsRemaining(a.period, now);
  const next =
    showNextCode && a.type !== 'hotp' && remaining <= 10 ? codeFor(a, now + a.period * 1000) : null;
  const [copied, setCopied] = useState(false);
  const expiry = expiryStatus(a.expiresAt, new Date(now));
  const [revealed, setRevealed] = useState(false);
  const hidden = expiry === 'expired' && !revealed;
  const edit = () => router.push({ pathname: '/edit-account', params: { id: item.id } });

  const copy = async () => {
    await Clipboard.setStringAsync(code);
    haptic('success');
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
      style={({ pressed }) => [
        s.row,
        { backgroundColor: c.surface, borderColor: copied ? c.accent : c.border },
        expiry === 'expired' && { opacity: 0.6 },
        pressed && { transform: [{ scale: 0.985 }] },
      ]}
      onPress={hidden ? () => setRevealed(true) : copy}
      onLongPress={() => {
        haptic('tap');
        edit();
      }}
      accessibilityRole="button"
      accessibilityLabel={
        hidden
          ? `${a.issuer || a.label}, ${a.label}, expired`
          : `${a.issuer || a.label}, ${a.label}, code ${code.split('').join(' ')}${
              remaining ? `, ${remaining} seconds left` : ''
            }`
      }
      accessibilityHint={
        hidden ? 'Tap to show the code anyway.' : 'Tap to copy. Long press to edit.'
      }
      accessibilityActions={[{ name: 'longpress', label: 'Edit account' }]}
      onAccessibilityAction={edit}
    >
      <Badge issuer={a.issuer || a.label} />
      <View style={s.flex}>
        <Text style={[s.issuer, { color: c.text }]} numberOfLines={1}>
          {a.issuer || a.label}
        </Text>
        {!!a.issuer && (
          <Text style={{ color: c.muted, fontSize: 13 }} numberOfLines={1}>
            {a.label}
          </Text>
        )}
        {expiry === 'expired' && (
          <Text style={[s.expChip, { backgroundColor: c.border, color: c.text }]}>Expired</Text>
        )}
        {expiry === 'soon' && a.expiresAt && (
          <Text style={[s.expChip, { backgroundColor: c.accentSoft, color: c.text }]}>
            Expires soon · {formatExpiry(a.expiresAt)}
          </Text>
        )}
        {hidden ? (
          <Text style={{ color: c.accent, fontWeight: '600', paddingVertical: 6 }}>
            Show anyway
          </Text>
        ) : (
          <Text
            style={[
              s.code,
              codeSize === 'compact' && s.codeCompact,
              { color: remaining > 0 && remaining <= 5 ? c.danger : c.accent },
            ]}
            maxFontSizeMultiplier={1.6}
          >
            {formatCode(code, groupDigits)}
          </Text>
        )}
        {copied ? (
          <Text style={{ color: c.success, fontSize: 13, fontWeight: '600' }}>
            Copied — paste it in ✿
          </Text>
        ) : next ? (
          <Text style={{ color: c.muted, fontSize: 13 }}>Next {formatCode(next, groupDigits)}</Text>
        ) : null}
      </View>
      {a.type === 'hotp' ? (
        <Pressable
          style={[s.next, { backgroundColor: c.accentSoft }]}
          onPress={() => {
            haptic('tap');
            vault.save('account', { ...a, counter: (a.counter ?? 0) + 1 }, item.id);
          }}
          accessibilityRole="button"
          accessibilityLabel="Generate next code"
        >
          <Ionicons name="refresh" size={18} color={c.accent} />
        </Pressable>
      ) : (
        <View style={s.ringWrap}>
          <CountdownRing remaining={remaining} period={a.period} size={36} />
          <Text style={[s.ringText, { color: c.muted }]}>{remaining}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function CodesScreen() {
  const vault = useVault();
  const c = useColors();
  const haptic = useHaptics();
  const insets = useSafeAreaInsets();
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
      onPress={() => {
        haptic('tap');
        setFolder(id);
      }}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: folder === id }}
      accessibilityLabel={`Folder ${label}`}
      accessibilityHint={onLongPress ? 'Long press to rename or delete' : undefined}
      style={[s.chip, { backgroundColor: folder === id ? c.accent : c.surfaceMuted }]}
    >
      <Text style={{ color: folder === id ? c.accentText : c.text, fontWeight: '500' }}>
        {label}
      </Text>
    </Pressable>
  );

  const header = (
    <View style={{ gap: 12, marginBottom: 8 }}>
      <Title
        title="Codes"
        subtitle={
          vault.accounts.length
            ? `${vault.accounts.length} account${vault.accounts.length === 1 ? '' : 's'}, safely tucked in`
            : 'Your 2FA codes live here'
        }
      />
      {vault.accounts.length > 0 && (
        <>
          <View style={[s.search, { backgroundColor: c.surfaceMuted }]}>
            <Ionicons name="search" size={18} color={c.muted} />
            <Input
              placeholder="Search accounts"
              value={query}
              onChangeText={setQuery}
              style={s.searchInput}
              accessibilityLabel="Search accounts"
              clearButtonMode="while-editing"
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.chips}
          >
            {chip(ALL_FOLDERS, 'All')}
            {vault.folders.map((f) =>
              chip(f.id, f.data.name, () => {
                setFolder(f.id);
                setPrompt('rename');
              }),
            )}
            <Pressable
              style={[s.chip, { borderWidth: 1, borderColor: c.border, borderStyle: 'dashed' }]}
              onPress={() => setPrompt('new')}
              accessibilityRole="button"
              accessibilityLabel="New folder"
            >
              <Text style={{ color: c.accent, fontWeight: '500' }}>+ Folder</Text>
            </Pressable>
          </ScrollView>
        </>
      )}
      {vault.error && <Text style={{ color: c.danger }}>{vault.error}</Text>}
    </View>
  );

  return (
    <View style={[s.screen, { backgroundColor: c.bg }]}>
      <FlatList
        data={visible}
        keyExtractor={(a) => a.id}
        contentContainerStyle={[s.list, { paddingTop: insets.top + 12 }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        renderItem={({ item, index }) => (
          <FadeIn delay={Math.min(index, 8) * 40}>
            <CodeRow item={item} now={now} />
          </FadeIn>
        )}
        refreshControl={
          <RefreshControl refreshing={vault.syncing} onRefresh={vault.sync} tintColor={c.accent} />
        }
        ListEmptyComponent={
          vault.accounts.length === 0 ? (
            <EmptyState
              title="Nothing blooming yet"
              body="Add your first account by scanning the QR code a site shows when you turn on two-factor sign-in."
              action={{
                title: 'Add your first account',
                onPress: () => router.push('/add-account'),
              }}
            />
          ) : (
            <EmptyState
              title={query ? 'No matches' : 'This folder is empty'}
              body={
                query ? `Nothing matches “${query}”.` : 'Long-press an account to move it here.'
              }
            />
          )
        }
        ListFooterComponent={
          visible.length > 0 ? (
            <Text style={[s.hint, { color: c.muted }]}>
              Tap to copy · long-press to edit · long-press a folder to rename
            </Text>
          ) : undefined
        }
      />
      <Pressable
        style={({ pressed }) => [
          s.fab,
          { backgroundColor: c.accent, shadowColor: c.accent },
          pressed && { transform: [{ scale: 0.94 }] },
        ]}
        onPress={() => {
          haptic('tap');
          router.push('/add-account');
        }}
        accessibilityRole="button"
        accessibilityLabel="Add account"
      >
        <Ionicons name="add" size={30} color={c.accentText} />
      </Pressable>

      <Prompt
        visible={prompt !== null}
        title={prompt === 'new' ? 'New folder' : 'Rename folder'}
        initial={prompt === 'rename' ? (current?.data.name ?? '') : ''}
        onCancel={() => setPrompt(null)}
        placeholder="e.g. Work"
        confirmLabel={prompt === 'new' ? 'Create' : 'Save'}
        validate={(name) =>
          vault.folders.some(
            (f) =>
              f.id !== (prompt === 'rename' ? current?.id : undefined) &&
              f.data.name.toLowerCase() === name.toLowerCase(),
          )
            ? 'You already have a folder with that name.'
            : null
        }
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
  expChip: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 4,
  },
  screen: { flex: 1 },
  list: {
    padding: 20,
    paddingBottom: 120,
    gap: 12,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  search: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingLeft: 14 },
  searchInput: { flex: 1, borderWidth: 0, backgroundColor: 'transparent' },
  chips: { gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, minHeight: 36 },
  flex: { flex: 1, gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontWeight: '700', fontSize: 15 },
  issuer: { fontSize: 16, fontWeight: '600' },
  code: {
    fontFamily: monoFont,
    fontSize: 32,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
    marginTop: 4,
  },
  codeCompact: { fontSize: 22, marginTop: 2 },
  next: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  ringWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  ringText: {
    position: 'absolute',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  hint: { textAlign: 'center', fontSize: 12, marginTop: 8 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
});
