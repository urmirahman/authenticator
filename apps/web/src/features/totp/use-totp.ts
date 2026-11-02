'use client';

import { secondsRemaining, totp } from '@repo/crypto';
import type { TotpAlgorithm } from '@repo/types';
import { useEffect, useState } from 'react';

/** One shared 1-second clock for every code on screen (instead of one timer per row). */
const subscribers = new Set<(now: number) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    subscribers.add(setNow);
    timer ??= setInterval(() => subscribers.forEach((s) => s(Date.now())), 1000);
    return () => {
      subscribers.delete(setNow);
      if (subscribers.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);
  return now;
}

interface TotpInput {
  secret: string;
  algorithm: TotpAlgorithm;
  digits: number;
  period: number;
}

/** Recomputes the code every second, on device. Returns "------" if the secret is broken. */
export function useTotp(account: TotpInput) {
  const now = useNow();
  let code = '-'.repeat(account.digits);
  try {
    code = totp(account.secret, {
      algorithm: account.algorithm,
      digits: account.digits as 6 | 7 | 8,
      period: account.period,
      timestamp: now,
    });
  } catch {
    /* invalid secret: keep dashes */
  }
  return { code, remaining: secondsRemaining(account.period, now) };
}
