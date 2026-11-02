'use client';

import { AppShell } from '@/components/app-shell';
import { DevicesScreen } from '@/features/devices/devices-screen';

export default function DevicesPage() {
  return (
    <AppShell>
      <DevicesScreen />
    </AppShell>
  );
}
