import { md, site } from '../site';

export const privacyPolicy = () => `# Privacy Policy

_Effective: ${md(site.effectiveDate)}. Draft — not yet reviewed by a lawyer._

Bloom Authenticator ("Bloom", "we") is operated by ${md(site.operator)}, ${md(site.address)}.
This policy explains what we collect, why, and the choices you have. In short: **we cannot read your
two-factor codes or secrets**. They are encrypted on your device before they reach us.

## What we can't see
- Your **master password** never leaves your device. We store only a key "envelope" (an encrypted copy of
  your vault key plus the public settings needed to unlock it with your password).
- Your **accounts, secret keys, issuers, labels, folders and backups** are encrypted on your device
  (XChaCha20-Poly1305). We store ciphertext we can't decrypt.

## What we collect
| Data | Why | Kept |
| --- | --- | --- |
| Email address, display name, avatar URL from Google / Apple / Facebook | Create and identify your account | Until you delete your account |
| Sign-in provider id (e.g. Google user id) | Link your sign-in method to your account | Until you delete your account |
| Devices (name like "Chrome (web)", platform, last seen) | Show your devices and let you sign them out | Until removed or account deleted |
| Sessions (hashed refresh token, IP address, browser/app user agent) | Keep you signed in securely, detect misuse | Until expiry or sign-out |
| Activity log (security events with IP and user agent) | Let you review sign-ins and changes | Until you delete your account (a shorter retention period is planned) |
| Passkey public keys | Passkey sign-in | Until removed |
| Encrypted vault items and encrypted backups | Sync between your devices | Until you delete them or your account |
| Server logs (IP, request path, status, time) | Operate and secure the service | ${md('TODO: log retention period, e.g. 30 days')} |

We do **not** use advertising, analytics or tracking tools, and we do not sell or share personal data for marketing.

## Legal bases (EU/UK users)
Contract (to provide the service you signed up for) and legitimate interests (security, abuse prevention).

## Who processes data for us
${md('TODO: list hosting provider, database provider, email provider and their locations once chosen')}.
Sign-in providers (Google, Apple, Meta) process data under their own policies when you use them.

## Your choices and rights
- **Download your data:** Settings → "Download my data" (JSON; vault items stay encrypted).
- **Delete your account:** Settings → "Delete account". This permanently deletes your account, devices,
  sessions, vault, backups and activity log from our database. Copies in backups of our database expire
  within ${md('TODO: database backup retention, e.g. 30 days')}.
- You may also have rights to access, correct, restrict or object, and to complain to your data-protection
  authority. Contact ${md(site.privacyEmail)}.

## Security
See our [Security page](/security). No system is perfectly secure; end-to-end encryption limits what an
attacker who breaches our servers could read.

## Children
Bloom is not intended for children under ${site.minimumAge}.

## Changes
We will post updates here and, for significant changes, notify you in the app.

## Contact
${md(site.privacyEmail)} · ${md(site.address)}
`;
