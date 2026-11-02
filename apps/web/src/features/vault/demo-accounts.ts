import type { TotpAccount } from '@repo/types';

/** Fake data until sync + decryption is wired up. The secret is the well-known RFC demo value. */
export const DEMO_ACCOUNTS: TotpAccount[] = [
  {
    id: '1',
    issuer: 'GitHub',
    label: 'urmi@example.com',
    secret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  },
];
