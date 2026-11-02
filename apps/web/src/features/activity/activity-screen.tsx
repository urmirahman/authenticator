'use client';

import type { ActivityEvent } from '@repo/types';
import { Button } from '@repo/ui/button';
import { activityLabel } from '@repo/vault';
import { useCallback, useEffect, useState } from 'react';
import { PageTitle } from '@/components/ui';
import { api } from '@/lib/api';

/** Security log with "load more" paging (cursor = id of the last event). */
export function ActivityScreen() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [next, setNext] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  const loadMore = useCallback(async (before?: string) => {
    setLoading(true);
    const page = await api.activity.list(before);
    setEvents((prev) => (before ? [...prev, ...page.events] : page.events));
    setNext(page.next);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  return (
    <>
      <PageTitle>Activity</PageTitle>
      <ul className="divide-y divide-slate-200 rounded-xl bg-white ring-1 ring-slate-200 dark:divide-slate-800 dark:bg-slate-900 dark:ring-slate-800">
        {events.map((e) => (
          <li key={e.id} className="p-3 text-sm">
            <p className="font-medium">{activityLabel(e.action)}</p>
            <p className="text-xs text-slate-500">
              {new Date(e.createdAt).toLocaleString()} {e.ip && `· ${e.ip}`}{' '}
              {e.userAgent && `· ${e.userAgent.slice(0, 60)}`}
            </p>
          </li>
        ))}
        {!loading && events.length === 0 && (
          <li className="p-3 text-sm text-slate-500">No activity yet.</li>
        )}
      </ul>
      {next && (
        <div className="mt-3">
          <Button variant="secondary" disabled={loading} onClick={() => loadMore(next)}>
            Load more
          </Button>
        </div>
      )}
    </>
  );
}
