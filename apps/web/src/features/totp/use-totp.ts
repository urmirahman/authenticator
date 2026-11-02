'use client';

import { secondsRemaining, totp } from '@repo/crypto';
import type { TotpAccount } from '@repo/types';
import { useEffect, useState } from 'react';

/** Recomputes the code every second, on device. */
export function useTotp(account: TotpAccount) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return {
    code: totp(account.secret, {
      algorithm: account.algorithm,
      digits: account.digits,
      period: account.period,
      timestamp: now,
    }),
    remaining: secondsRemaining(account.period, now),
  };
}
