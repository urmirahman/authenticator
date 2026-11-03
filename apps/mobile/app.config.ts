import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Google Sign-In on iOS needs the "reversed client id" as a URL scheme, so Google can hand the
 * result back to the app: 123-abc.apps.googleusercontent.com -> com.googleusercontent.apps.123-abc
 */
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
export const reversedClientId = (id: string) => id.split('.').reverse().join('.');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Authenticator',
  slug: 'authenticator',
  scheme: 'authenticator',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'dev.urmirahman.authenticator',
    supportsTablet: false,
    usesAppleSignIn: true,
    // Passkeys need an associated domain that serves apple-app-site-association.
    associatedDomains: ['webcredentials:auth.example.com'],
  },
  android: { package: 'dev.urmirahman.authenticator' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    // Only added when an iOS client id exists; otherwise the plugin would fail the build.
    ...(googleIosClientId
      ? [
          [
            '@react-native-google-signin/google-signin',
            { iosUrlScheme: reversedClientId(googleIosClientId) },
          ] as [string, object],
        ]
      : []),
    ['expo-camera', { cameraPermission: 'Allow Authenticator to scan QR codes to add accounts.' }],
  ],
  experiments: { typedRoutes: true },
  extra: { apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787' },
});
