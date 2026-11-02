import type { ConfigContext, ExpoConfig } from 'expo/config';

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
    ['expo-camera', { cameraPermission: 'Allow Authenticator to scan QR codes to add accounts.' }],
  ],
  experiments: { typedRoutes: true },
  extra: { apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787' },
});
