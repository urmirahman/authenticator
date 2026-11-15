/** FAQ entries shown on the landing page, Help page and mobile Help screen. Plain text answers. */
export interface Faq {
  q: string;
  a: string;
  /** Show on the landing page too. */
  featured?: boolean;
}

export const faqs: Faq[] = [
  {
    q: 'Can you see my 2FA codes?',
    a: 'No. Codes are encrypted on your device. We only store data we cannot read.',
    featured: true,
  },
  {
    q: 'What if I forget my master password?',
    a: 'We cannot reset it. Write it down and keep a backup.',
    featured: true,
  },
  {
    q: 'Do codes work offline?',
    a: 'Yes. Codes need no connection. Sync does.',
    featured: true,
  },
  {
    q: 'How do I move from Google Authenticator?',
    a: 'Google Authenticator, then Transfer accounts, then Export. In Bloom, open Settings, then Import, and scan or upload the QR.',
    featured: true,
  },
  {
    q: 'How do I move to another app later?',
    a: 'Show a transfer QR, or make an encrypted backup.',
  },
  {
    q: 'Why do I need both a sign-in and a master password?',
    a: 'Sign-in syncs the vault. The master password decrypts it and stays on your device.',
  },
  {
    q: 'Is biometric unlock safe?',
    a: 'Optional. The key stays in the phone’s secure hardware and opens with Face ID or fingerprint. Use it only on your own phone.',
  },
  {
    q: 'A code is rejected. What now?',
    a: 'Set the clock to automatic, then try the next code.',
  },
  {
    q: 'How do I delete my account?',
    a: 'Settings, then Delete account. Turn off 2FA on those sites first. This deletes the vault.',
  },
  {
    q: 'Does Bloom use cookies or trackers?',
    a: 'No trackers or ads. The web app only stores sign-in and preferences. See the Cookie notice.',
  },
  {
    q: 'How do I import a Bloom JSON file?',
    a: 'Settings, then Import JSON. Pick the Export JSON file. Accounts you already have are skipped.',
  },
  {
    q: 'Why is Backup off?',
    a: 'It needs a signed-in vault with at least one code. Offline mode uses Export JSON instead. The backup password must be at least 10 characters and match the confirm field.',
  },
];
