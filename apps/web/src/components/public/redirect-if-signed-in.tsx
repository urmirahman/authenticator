'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { session } from '@/features/session/session';

/** The landing page is static; signed-in visitors are sent straight to their vault. */
export function RedirectIfSignedIn() {
  const router = useRouter();
  useEffect(() => {
    if (session.isSignedIn()) router.replace('/vault');
  }, [router]);
  return null;
}
