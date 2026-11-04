import { md, site } from '../site';

export const termsOfService = () => `# Terms of Service

_Effective: ${md(site.effectiveDate)}. Draft — not yet reviewed by a lawyer._

These terms are an agreement between you and ${md(site.operator)} ("we") for using Bloom Authenticator.

## 1. The service
Bloom stores your two-factor authentication (2FA) accounts in an end-to-end encrypted vault and syncs it
between your devices. You must be at least ${site.minimumAge} years old.

## 2. Your master password
Your master password encrypts your vault on your device. **We never receive it and cannot reset it or
recover your vault without it.** If you lose it, your synced codes are unrecoverable. Keep your recovery kit
and encrypted backups safe, and keep the backup codes websites give you.

## 3. Your responsibilities
- Keep your devices, sign-in account and passwords secure.
- Don't misuse the service: no attacks, scraping, reverse engineering of the servers, or illegal content.
- Before deleting an account from Bloom, turn off 2FA on that website or move it elsewhere.

## 4. Availability
We aim for high availability but the service is provided **"as is"** without warranties. Codes are generated
on your device and keep working offline once unlocked; sync needs our servers.

## 5. Liability
To the extent permitted by law, we are not liable for indirect or consequential losses, including lockouts
caused by a lost master password or deleted accounts. Bloom is free, so our total liability for any claim is limited to the amount you paid us in the 12 months
before it (which is zero for free accounts), except where the law does not allow such limits. Nothing in these
terms removes rights you have as a consumer under the law that applies to you.

## 6. Ending
You can delete your account at any time in Settings. We may suspend accounts that abuse the service.

## 7. Free to use
Bloom Authenticator is free to use. There are no paid plans or in-app purchases.

## 8. Changes and law
We may update these terms with notice in the app. These terms are governed by the laws of ${md(site.jurisdiction)}.

## Contact
${md(site.contactEmail)}
`;
