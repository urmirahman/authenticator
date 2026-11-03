import type { ActivityEvent } from '@repo/types';
import { activityLabel } from '@repo/vault';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/components/theme';
import { Button, EmptyState, IconBubble, SkeletonList, type IconName } from '@/components/ui';
import { api } from '@/lib/api';
import { timeAgo } from '@/lib/time';

const iconFor = (action: string): IconName =>
  action.startsWith('auth') || action.startsWith('session')
    ? 'log-in-outline'
    : action.startsWith('backup')
      ? 'cloud-upload-outline'
      : action.startsWith('passkey')
        ? 'finger-print'
        : action.startsWith('device')
          ? 'phone-portrait-outline'
          : 'sparkles-outline';

/** Security log as a soft timeline, with "load more" (cursor = id of the last event). */
export function ActivityScreen() {
  const c = useColors();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [next, setNext] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (before?: string) => {
    setLoading(true);
    try {
      const page = await api.activity.list(before);
      setEvents((prev) => (before ? [...prev, ...page.events] : page.events));
      setNext(page.next);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={s.list}
      data={events}
      keyExtractor={(e) => String(e.id)}
      onRefresh={() => load()}
      refreshing={false}
      renderItem={({ item: e }) => (
        <View
          style={[s.row, { backgroundColor: c.surface, borderColor: c.border }]}
          accessible
          accessibilityLabel={`${activityLabel(e.action)}, ${timeAgo(e.createdAt)}`}
        >
          <IconBubble name={iconFor(e.action)} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>
              {activityLabel(e.action)}
            </Text>
            <Text style={{ color: c.muted, fontSize: 13 }}>
              {timeAgo(e.createdAt)}
              {e.ip ? ` · ${e.ip}` : ''}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        loading ? (
          <SkeletonList count={5} height={60} />
        ) : (
          <EmptyState
            title="All quiet"
            body="Sign-ins, backups and other security events show up here."
          />
        )
      }
      ListFooterComponent={
        next ? (
          <Button
            variant="secondary"
            title={loading ? 'Loading…' : 'Load more'}
            disabled={loading}
            onPress={() => load(next)}
          />
        ) : undefined
      }
    />
  );
}

const s = StyleSheet.create({
  list: { padding: 20, gap: 10, width: '100%', maxWidth: 640, alignSelf: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
