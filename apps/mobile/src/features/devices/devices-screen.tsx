import type { Device } from '@repo/types';
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, Text } from 'react-native';
import { useColors } from '@/components/theme';
import { EmptyState, Group, Muted, Row, Screen, SkeletonList, styles as ui } from '@/components/ui';
import { session } from '@/features/session/session';
import { api } from '@/lib/api';
import { useHaptics } from '@/lib/motion';
import { timeAgo } from '@/lib/time';

const ICON = {
  ios: 'phone-portrait-outline',
  android: 'phone-portrait-outline',
  web: 'laptop-outline',
} as const;

/** Every browser/phone you're signed in on. Tap one to sign it out remotely. */
export function DevicesScreen() {
  const c = useColors();
  const haptic = useHaptics();
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    () => api.devices.list().then(setDevices, (e: Error) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
    session.deviceId().then(setCurrent);
  }, [load]);

  const revoke = (d: Device) =>
    Alert.alert(`Sign out “${d.name}”?`, 'It will need to sign in again to see your codes.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () =>
          api.devices.revoke(d.id).then(() => {
            haptic('success');
            return load();
          }),
      },
    ]);

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={c.accent}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
    >
      <Muted>Everywhere you’re signed in to Bloom. Don’t recognise one? Sign it out.</Muted>
      {error && <Text style={ui.error}>{error}</Text>}
      {!devices && !error && <SkeletonList count={3} height={64} />}
      {devices?.length === 0 && <EmptyState title="No devices yet" />}
      {devices && devices.length > 0 && (
        <Group footer="Tap a device to sign it out.">
          {devices.map((d, i) => (
            <Row
              key={d.id}
              icon={ICON[d.platform]}
              label={d.id === current ? `${d.name} · this phone` : d.name}
              hint={`${d.platform} · active ${timeAgo(d.lastSeenAt).toLowerCase()}`}
              onPress={d.id === current ? undefined : () => revoke(d)}
              last={i === devices.length - 1}
            />
          ))}
        </Group>
      )}
    </Screen>
  );
}
