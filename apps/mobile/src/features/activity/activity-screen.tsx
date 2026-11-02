import type { ActivityEvent } from '@repo/types';
import { activityLabel } from '@repo/vault';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/components/theme';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';

/** Security log with "load more" (cursor = id of the last event). */
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
      refreshing={loading && events.length === 0}
      renderItem={({ item: e }) => (
        <View style={[s.row, { backgroundColor: c.card }]}>
          <Text style={{ color: c.text, fontWeight: '600' }}>{activityLabel(e.action)}</Text>
          <Text style={{ color: c.muted, fontSize: 12 }}>
            {new Date(e.createdAt).toLocaleString()} {e.ip ? `· ${e.ip}` : ''}
          </Text>
        </View>
      )}
      ListEmptyComponent={
        loading ? undefined : <Text style={{ color: c.muted }}>No activity yet.</Text>
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
  list: { padding: 16, gap: 8 },
  row: { padding: 12, borderRadius: 12, gap: 2 },
});
