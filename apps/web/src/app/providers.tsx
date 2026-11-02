'use client';

import type { ReactNode } from 'react';
import { useApplyTheme } from '@/features/settings/settings';
import { useBackgroundSync } from '@/features/vault/use-background-sync';
import { VaultProvider } from '@/features/vault/vault-context';

function Effects() {
  useApplyTheme();
  useBackgroundSync();
  return null;
}

/** Client-side providers for the whole app (the layout itself stays a server component). */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <VaultProvider>
      <Effects />
      {children}
    </VaultProvider>
  );
}
