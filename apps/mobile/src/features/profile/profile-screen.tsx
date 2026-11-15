import type { Device, SignInMethods, User } from '@repo/types';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Prompt } from '@/components/prompt';
import { useColors } from '@/components/theme';
import {
  Avatar,
  Button,
  Card,
  FadeIn,
  Group,
  Notice,
  Row,
  Screen,
  Skeleton,
  type IconName,
} from '@/components/ui';
import { leaveApp } from '@/features/session/leave-app';
import { session } from '@/features/session/session';
import { useVault } from '@/features/vault/vault-store';
import { api } from '@/lib/api';
import { useHaptics } from '@/lib/motion';
import { monthYear, timeAgo } from '@/lib/time';

/** Google is the only sign-in method for launch (ADR 39). */
const PROVIDERS: Array<{ id: 'google'; label: string; icon: IconName }> = [
  { id: 'google', label: 'Google', icon: 'logo-google' },
];

/** Profile: who you are, how you sign in, what's in your vault, and quick links. */
export function ProfileScreen() {
  const c = useColors();
  const vault = useVault();
  const haptic = useHaptics();
  const [user, setUser] = useState<User | null>(null);
  const [methods, setMethods] = useState<SignInMethods | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const load = useCallback(async () => {
    try {
      const offline = await session.isOffline();
      setIsOffline(offline);
      if (offline) {
        const lp = await session.getLocalProfile();
        setUser({
          id: lp?.id || 'local-user',
          email: 'Stored locally on this device',
          displayName: lp?.displayName || 'Anonymous Vault',
          createdAt: new Date(lp?.createdAt || Date.now()).toISOString(),
        });
        setDevices([
          {
            id: 'local',
            name: 'This device',
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
            publicKey: '',
            lastSeenAt: new Date().toISOString(),
          },
        ]);
        setMethods({ providers: [], passkeys: 0 });
        setError(null);
        return;
      }
      const [u, m, d] = await Promise.all([
        api.users.me(),
        api.users.signInMethods(),
        api.devices.list(),
      ]);
      setUser(u);
      setMethods(m);
      setDevices(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your profile');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([load(), vault.sync()]);
    setRefreshing(false);
  };

  const confirmSignOut = () => setSignOutOpen(true);
  const doSignOut = async () => {
    setSignOutOpen(false);
    await leaveApp(vault);
  };

  const name = user?.displayName || user?.email.split('@')[0] || '';
  const linked = (id: string) => methods?.providers.find((p) => p.provider === id);

  return (
    <>
      <Screen
        title="Profile"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} />
        }
      >
        {!user ? (
          <View style={s.hero}>
            <Skeleton height={88} style={{ width: 88, borderRadius: 44 }} />
            <Skeleton height={22} style={{ width: 160 }} />
            <Skeleton height={16} style={{ width: 200 }} />
            {error && <Text style={{ color: c.danger, textAlign: 'center' }}>{error}</Text>}
          </View>
        ) : (
          <FadeIn>
            <View style={s.hero}>
              <Avatar name={name} uri={user.avatarUrl} size={88} />
              <Text style={[s.name, { color: c.text }]} accessibilityRole="header">
                {name}
              </Text>
              <Text style={{ color: c.muted }}>{user.email}</Text>
              <View style={[s.since, { backgroundColor: c.accentSoft }]}>
                <Text style={{ color: c.accent, fontSize: 13, fontWeight: '600' }}>
                  Blooming since {monthYear(user.createdAt)}
                </Text>
              </View>
            </View>
          </FadeIn>
        )}

        {user && error && (
          <Notice tone="error" onDismiss={() => setError(null)}>
            {error}
          </Notice>
        )}

        <View style={s.stats} accessibilityRole="summary">
          <Stat label="Accounts" value={String(vault.accounts.length)} />
          <Stat label="Folders" value={String(vault.folders.length)} />
          <Stat label="Devices" value={devices ? String(devices.length) : '–'} />
        </View>

        {isOffline ? (
          <Group title="Storage & Privacy">
            <Row
              icon="shield-checkmark-outline"
              label="Offline Vault"
              hint="Data stored on device only"
              value="Private"
            />
            <Row
              icon="log-in-outline"
              label="Switch to cloud sync"
              hint="Sign in to sync across devices"
              onPress={confirmSignOut}
              last
            />
          </Group>
        ) : (
          <Group title="Signing in" footer="Link more sign-in methods from the web app.">
            {PROVIDERS.map((p) => {
              const l = linked(p.id);
              return (
                <Row
                  key={p.id}
                  icon={p.icon}
                  label={p.label}
                  hint={l?.email}
                  value={methods ? (l ? 'Linked' : 'Not linked') : '…'}
                />
              );
            })}
            <Row
              icon="finger-print"
              label="Passkeys"
              value={
                methods ? (methods.passkeys === 0 ? 'None yet' : `${methods.passkeys} saved`) : '…'
              }
              last
            />
          </Group>
        )}

        <Group title="Your vault">
          {!isOffline && (
            <>
              <Row icon="sync" label="Last synced" value={timeAgo(vault.lastSyncedAt)} />
              <Row
                icon="phone-portrait-outline"
                label="Devices"
                hint="See where you're signed in"
                onPress={() => router.push('/devices')}
              />
              <Row
                icon="time-outline"
                label="Recent activity"
                onPress={() => router.push('/activity')}
              />
            </>
          )}
          <Row
            icon="cloud-upload-outline"
            label="Encrypted backups"
            onPress={() => router.push('/backups')}
            last
          />
        </Group>

        <Group>
          <Row icon="create-outline" label="Edit display name" onPress={() => setEditing(true)} />
          <Row
            icon="log-out-outline"
            label={isOffline ? 'Leave' : 'Sign out'}
            destructive
            onPress={confirmSignOut}
            last
          />
        </Group>

        <Prompt
          visible={editing}
          title="Your display name"
          initial={user?.displayName ?? ''}
          onCancel={() => setEditing(false)}
          onSubmit={async (displayName) => {
            if (!displayName.trim()) return;
            try {
              if (isOffline) {
                const lp = (await session.getLocalProfile()) || {
                  id: 'local-user',
                  displayName: '',
                  createdAt: Date.now(),
                };
                lp.displayName = displayName.trim();
                await session.setLocalProfile(lp);
                setUser((prev) => (prev ? { ...prev, displayName: lp.displayName } : null));
                haptic('success');
                setEditing(false);
                return;
              }
              setUser(await api.users.update(displayName.trim()));
              haptic('success');
            } catch (e) {
              setError(
                e instanceof Error ? 'We couldn’t save your name. Please try again.' : 'Try again',
              );
            }
            setEditing(false);
          }}
        />
      </Screen>
      <Modal
        transparent
        visible={signOutOpen}
        animationType="fade"
        onRequestClose={() => setSignOutOpen(false)}
      >
        <Pressable style={s.modalBackdrop} onPress={() => setSignOutOpen(false)}>
          <Pressable
            style={[s.modalCard, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={(event) => event.stopPropagation()}
          >
            <Text style={[s.modalTitle, { color: c.text }]}>Sign out of Bloom?</Text>
            <Text style={[s.modalMessage, { color: c.textMuted }]}>
              Your codes stay safe in your encrypted vault.
            </Text>
            <Button title="Sign out" variant="danger" onPress={doSignOut} />
            <Button title="Stay" variant="ghost" onPress={() => setSignOutOpen(false)} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useColors();
  return (
    <Card style={s.stat}>
      <View accessible accessibilityLabel={`${value} ${label}`} style={{ alignItems: 'center' }}>
        <Text style={[s.statValue, { color: c.text }]}>{value}</Text>
        <Text style={{ color: c.muted, fontSize: 13 }}>{label}</Text>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8 },
  name: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  since: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginTop: 4 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, paddingVertical: 16, paddingHorizontal: 8 },
  statValue: { fontSize: 24, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: { borderWidth: 1, borderRadius: 24, padding: 22, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalMessage: { fontSize: 15, lineHeight: 22, marginBottom: 4 },
});
