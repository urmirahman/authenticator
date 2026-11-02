import type { AuthTokens } from '@repo/types';

/**
 * Where the sign-in tokens live in the browser.
 *
 * - access token: short-lived (15 min), kept in memory + sessionStorage.
 * - refresh token: long-lived, kept in localStorage so you stay signed in after closing the tab.
 *
 * Trade-off for learners: localStorage is readable by any script on the page (XSS risk). A production
 * setup would move the refresh token into an httpOnly cookie set by the API. The vault key is NEVER
 * stored anywhere; it only lives in memory while the vault is unlocked.
 */

const ACCESS = 'auth.access';
const REFRESH = 'auth.refresh';
const DEVICE = 'auth.deviceId';

const hasWindow = () => typeof window !== 'undefined';

export const session = {
  accessToken: () => (hasWindow() ? sessionStorage.getItem(ACCESS) : null),
  refreshToken: () => (hasWindow() ? localStorage.getItem(REFRESH) : null),
  deviceId: () => (hasWindow() ? localStorage.getItem(DEVICE) : null),
  isSignedIn: () => !!session.refreshToken(),

  save(tokens: AuthTokens) {
    sessionStorage.setItem(ACCESS, tokens.accessToken);
    localStorage.setItem(REFRESH, tokens.refreshToken);
  },
  setDeviceId(id: string) {
    localStorage.setItem(DEVICE, id);
  },
  clear() {
    sessionStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
    localStorage.removeItem(DEVICE);
  },
};
