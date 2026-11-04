import { md, site } from '../site';

export const securityPage = () => `# Security

Bloom is built so that **even if our servers were breached, your codes would stay private.**

## How your codes are protected
- Your codes are **encrypted on your device** before they're synced. We only ever store scrambled data.
- Only your **master password** can unlock them, and it never leaves your device.
- Signing in with Google or a passkey proves who you are. Your master password is what unlocks your codes.
- Encrypted backups are locked with their own backup password.

We use modern, well-reviewed encryption (Argon2id and XChaCha20-Poly1305).

## What we do to keep your account safe
- Short-lived sign-in sessions you can sign out remotely from **Devices**.
- An **Activity** log of sign-ins and changes.
- HTTPS everywhere and rate-limited sign-in.

## What no app can fully protect against
- Malware on, or someone in control of, your unlocked device.
- A weak or reused master password.
- Phishing sites that trick you into typing a code.

## Your part
Use a long, unique master password, turn on auto-lock, and keep your recovery kit somewhere safe and offline.

## Audits
Bloom hasn't had an independent security audit yet and holds no certifications such as SOC 2 or ISO 27001.

## Reporting a vulnerability
Email ${md(site.securityEmail)} with steps to reproduce. We'll reply within 5 business days and credit you if
you'd like. Please don't access other people's data or share the issue publicly before it's fixed. We won't take
legal action over good-faith research that follows these rules. See also
[/.well-known/security.txt](/.well-known/security.txt).
`;

/** RFC 9116 security.txt. Expires must be < 1 year ahead; regenerate yearly. */
export const securityTxt = (expires: Date) => `Contact: mailto:${site.securityEmail}
Expires: ${expires.toISOString()}
Preferred-Languages: en
Canonical: ${site.domain}/.well-known/security.txt
Policy: ${site.domain}/security
`;
