'use client';

import { AppShell } from '@/components/app-shell';
import { VaultScreen } from '@/features/vault/vault-screen';

export default function VaultPage() {
  return (
    <AppShell needsUnlock>
      <VaultScreen />
    </AppShell>
  );
}
