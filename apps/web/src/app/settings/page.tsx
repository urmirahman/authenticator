'use client';

import { AppShell } from '@/components/app-shell';
import { SettingsScreen } from '@/features/settings/settings-screen';

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsScreen />
    </AppShell>
  );
}
