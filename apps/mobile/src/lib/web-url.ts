import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

/** Public web app (legal, help, security pages). Set EXPO_PUBLIC_WEB_URL per environment. */
export const webUrl = String(
  (Constants.expoConfig?.extra as { webUrl?: string } | undefined)?.webUrl ??
    process.env.EXPO_PUBLIC_WEB_URL ??
    'http://localhost:3001',
).replace(/\/$/, '');

/** Open a web page (e.g. "/privacy") in the in-app browser, so the text matches the website. */
export function openWebPage(path: string) {
  return WebBrowser.openBrowserAsync(`${webUrl}${path}`);
}
