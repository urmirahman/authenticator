import type { TotpAccount } from '@repo/types';

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
