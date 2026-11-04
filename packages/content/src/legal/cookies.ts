import { md, site } from '../site';

export const cookiePolicy = () => `# Cookie & storage notice

_Effective: ${md(site.effectiveDate)}._

**Bloom does not use advertising, analytics or tracking cookies.** We only store what the app needs to work,
so we don't show a cookie consent banner.

## What the web app stores in your browser
| Name | Type | Purpose | Lasts |
| --- | --- | --- | --- |
| \`auth.access\` | sessionStorage | Short-lived sign-in token (15 minutes) | Until the tab closes |
| \`auth.refresh\` | localStorage | Keeps you signed in; rotated on every use | Until you sign out (expires after 30 days unused) |
| \`auth.deviceId\` | localStorage | Identifies this browser in "Devices" | Until you sign out |
| \`settings\` | localStorage | Your preferences: auto-lock, clipboard clear, theme | Until you clear it |

**Cookies:** Bloom itself sets no cookies. When you choose "Continue with Google", that
provider's sign-in page may set its own cookies under its policy.

**Never stored:** your master password and your unlocked vault key. The key is kept in memory only and is
forgotten when you lock, reload or close the page.

## Mobile apps
The apps store sign-in tokens and preferences in the iOS Keychain / Android Keystore. If you turn on
biometric unlock, a copy of your vault key is stored there too, protected by Face ID / fingerprint.

## Control
Sign out to remove sign-in data; clear site data in your browser to remove everything.
Questions: ${md(site.privacyEmail)}.
`;
