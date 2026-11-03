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
    a: 'No. Your accounts are encrypted on your device with a key only your master password can unlock. We store ciphertext we cannot decrypt.',
    featured: true,
  },
  {
    q: 'What if I forget my master password?',
    a: 'We cannot reset it or recover your vault. Keep your recovery kit somewhere safe, make encrypted backups, and keep the backup codes each website gives you when you turn on 2FA.',
    featured: true,
  },
  {
    q: 'Do codes work offline?',
    a: 'Yes. Codes are generated on your device from the current time. Once your vault is unlocked, no connection is needed. Sync needs a connection.',
    featured: true,
  },
  {
    q: 'How do I move from Google Authenticator?',
    a: 'In Google Authenticator choose "Transfer accounts → Export", then scan that QR code with Bloom (Add → QR image on web, or Scan QR on mobile). 2FAS and Aegis exports (unencrypted JSON) can be pasted too.',
    featured: true,
  },
  {
    q: 'How do I move to another app later?',
    a: 'Use Transfer to show Google-compatible QR codes, or create an encrypted backup. You are never locked in.',
  },
  {
    q: 'Why do I need both a sign-in and a master password?',
    a: 'Signing in (Google, Apple, Facebook or a passkey) proves who you are so we can sync your vault. The master password is what decrypts it, and it never leaves your device.',
  },
  {
    q: 'Is biometric unlock safe?',
    a: "It's optional. When on, a copy of your vault key is kept in your phone's secure hardware and released only after Face ID or fingerprint. Anyone who can pass your phone's biometrics could open the vault, so only enable it on a phone only you use.",
  },
  {
    q: 'A code is rejected. What now?',
    a: "Check your device's clock is set automatically; TOTP codes depend on the exact time. Wait for the next code and try again.",
  },
  {
    q: 'How do I delete my account?',
    a: 'Settings → Delete account. Turn off 2FA on websites first (or move those accounts elsewhere), because deleting removes your encrypted vault permanently.',
  },
  {
    q: 'Does Bloom use cookies or trackers?',
    a: 'No trackers, no ads, no analytics. The web app only stores what it needs to keep you signed in and your preferences. See the Cookie notice.',
  },
];
