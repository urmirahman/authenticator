import { md, site } from '../site';

export const securityPage = () => `# Security

Bloom is built so that **a breach of our servers would not reveal your codes**. Here is how, and where the limits are.

## How your vault is protected
1. You choose a **master password**. On your device, **Argon2id** (64 MiB memory on web, 19 MiB on phones)
   turns it into a key-encryption key.
2. A random 256-bit **vault key** encrypts every item with **XChaCha20-Poly1305**. Each item is bound to its
   id, so items can't be swapped around.
3. Only the vault key **wrapped** by your password key is sent to us. Unlocking happens on your device.
4. Encrypted backups use a separate backup password the same way.

Sign-in (Google / Apple / Facebook / passkeys) proves who you are; the master password is what decrypts.

## What we protect against
- A copy of our database leaking: attackers get ciphertext and must brute-force your master password,
  which Argon2id makes slow. **A long, unique master password matters.**
- Stolen sign-in tokens: short-lived access tokens, rotating refresh tokens with reuse detection,
  remote device sign-out, activity log.
- Network attackers: HTTPS only in production, strict security headers, rate-limited sign-in.

## What we can't fully protect against
- Malware or someone with control of your unlocked device.
- A weak or reused master password.
- A malicious update to the web app served by us (true for every web app). The mobile apps and the open
  source code help you verify.
- Phishing of the 2FA codes themselves after you copy them.

## Your part
Use a long passphrase, enable auto-lock, keep the recovery kit offline, and review Devices and Activity occasionally.

## Certifications
We hold **no** security certifications (e.g. SOC 2, ISO 27001) and have **not yet** had an independent audit.
When an independent review is completed, we will summarise the findings and fixes on this page.

## Reporting a vulnerability
Please email ${md(site.securityEmail)} with steps to reproduce. We will acknowledge within 5 business days,
keep you updated, and credit you (if you want) once fixed. Please don't access other people's data, degrade the
service, or disclose publicly before a fix. We won't pursue legal action for good-faith research that follows
these rules. Our machine-readable contact is at [/.well-known/security.txt](/.well-known/security.txt).
`;

/** RFC 9116 security.txt. Expires must be < 1 year ahead; regenerate yearly. */
export const securityTxt = (expires: Date) => `Contact: mailto:${site.securityEmail}
Expires: ${expires.toISOString()}
Preferred-Languages: en
Canonical: ${site.domain}/.well-known/security.txt
Policy: ${site.domain}/security
`;
