'use client';

import { AppShell } from '@/components/app-shell';
import { ActivityScreen } from '@/features/activity/activity-screen';

export default function ActivityPage() {
  return (
    <AppShell>
      <ActivityScreen />
    </AppShell>
  );
}
