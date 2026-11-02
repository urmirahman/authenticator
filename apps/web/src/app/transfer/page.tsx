'use client';

import { AppShell } from '@/components/app-shell';
import { TransferScreen } from '@/features/transfer/transfer-screen';

export default function TransferPage() {
  return (
    <AppShell needsUnlock>
      <TransferScreen />
    </AppShell>
  );
}
