import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Google Sign-In on iOS needs the "reversed client id" as a URL scheme, so Google can hand the
 * result back to the app: 123-abc.apps.googleusercontent.com -> com.googleusercontent.apps.123-abc
 */
const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
export const reversedClientId = (id: string) => id.split('.').reverse().join('.');

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  // User-facing brand name (docs/BRAND.md). slug/scheme/bundle id stay as-is: OAuth clients depend on them.
  name: 'Bloom',
  slug: 'authenticator',
  scheme: 'authenticator',
  version: '0.1.0',
  // Phones, tablets and landscape are all supported (layouts cap content width).
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'dev.urmirahman.authenticator',
    supportsTablet: true,
    infoPlist: { CFBundleDisplayName: 'Bloom' },
    usesAppleSignIn: true,
    // Passkeys need an associated domain that serves apple-app-site-association.
    associatedDomains: ['webcredentials:auth.example.com'],
  },
  android: {
    package: 'dev.urmirahman.authenticator',
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#ffffff' },
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 180,
        backgroundColor: '#faf8f7',
        dark: { image: './assets/splash-icon-dark.png', backgroundColor: '#1c1820' },
      },
    ],
    [
      'expo-local-authentication',
      { faceIDPermission: 'Allow Bloom to use Face ID to unlock your vault.' },
    ],
    // Only added when an iOS client id exists; otherwise the plugin would fail the build.
    ...(googleIosClientId
      ? [
          [
            '@react-native-google-signin/google-signin',
            { iosUrlScheme: reversedClientId(googleIosClientId) },
          ] as [string, object],
        ]
      : []),
    [
      'expo-camera',
      {
        cameraPermission:
          'Bloom uses the camera only to scan the QR code a website shows when you turn on 2FA.',
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Bloom reads a QR code from the screenshot you choose. Nothing is uploaded.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    '@react-native-community/datetimepicker',
  ],
  experiments: { typedRoutes: true },
  extra: {
    webUrl: process.env.EXPO_PUBLIC_WEB_URL ?? 'http://localhost:3001',
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787',
  },
});
