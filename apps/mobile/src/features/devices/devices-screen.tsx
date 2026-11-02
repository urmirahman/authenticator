import type { Device } from '@repo/types';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';
import { Button, Muted, Screen, Section, styles as ui } from '@/components/ui';
import { session } from '@/features/session/session';
import { api } from '@/lib/api';

/** Every browser/phone you're signed in on. "Sign out" revokes that device's session remotely. */
export function DevicesScreen() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [current, setCurrent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    () => api.devices.list().then(setDevices, (e: Error) => setError(e.message)),
    [],
  );
  useEffect(() => {
    load();
    session.deviceId().then(setCurrent);
  }, [load]);

  const revoke = (d: Device) =>
    Alert.alert(`Sign out "${d.name}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => api.devices.revoke(d.id).then(load),
      },
    ]);

  return (
    <Screen>
      {error && <Text style={ui.error}>{error}</Text>}
      {!devices && <Muted>Loading…</Muted>}
      {devices?.map((d) => (
        <Section key={d.id} title={`${d.name}${d.id === current ? ' (this phone)' : ''}`}>
          <Muted>
            {d.platform} · last seen {new Date(d.lastSeenAt).toLocaleString()}
          </Muted>
          {d.id !== current && (
            <Button variant="danger" title="Sign out" onPress={() => revoke(d)} />
          )}
        </Section>
      ))}
    </Screen>
  );
}
