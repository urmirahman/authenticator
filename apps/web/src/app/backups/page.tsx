'use client';

import { AppShell } from '@/components/app-shell';
import { BackupScreen } from '@/features/backup/backup-screen';

export default function BackupsPage() {
  return (
    <AppShell needsUnlock>
      <BackupScreen />
    </AppShell>
  );
}
