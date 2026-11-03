import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { api, completeSignIn } from '@/lib/api';

/**
 * Native Google Sign-In (ADR 34): the Google SDK shows the account picker and returns an id_token.
 * We send that id_token to POST /v1/auth/oauth/google/token; the server checks Google's signature
 * and that the token's audience is one of OUR client ids (GOOGLE_CLIENT_ID + GOOGLE_EXTRA_AUDIENCES),
 * then returns our own access/refresh tokens.
 *
 * Client ids are public (not secrets). The web client id is passed as webClientId so the id_token
 * audience is the web client id on both platforms.
 */
const IOS = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const WEB = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const ANDROID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

/** iOS needs its iOS client id; Android needs an Android client id registered (with SHA-1) in Google Cloud. */
export const googleSignInConfigured =
  Platform.OS === 'ios' ? !!IOS : Platform.OS === 'android' ? !!ANDROID && !!WEB : false;

let configured = false;
function configure() {
  if (configured) return;
  GoogleSignin.configure({
    iosClientId: IOS || undefined,
    webClientId: WEB || undefined,
    scopes: ['email', 'profile'],
  });
  configured = true;
}

/** Returns true when signed in, false when the user cancelled. Throws on real errors. */
export async function signInWithGoogle(): Promise<boolean> {
  if (!googleSignInConfigured)
    throw new Error('Google sign-in is not configured for this platform yet.');
  configure();
  try {
    if (Platform.OS === 'android')
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success') return false; // cancelled
    const idToken = res.data.idToken;
    if (!idToken) throw new Error('Google did not return an id_token (check webClientId).');
    await completeSignIn(
      await api.auth.nativeSignIn('google', { idToken, name: res.data.user.name ?? undefined }),
    );
    return true;
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === statusCodes.SIGN_IN_CANCELLED || code === statusCodes.IN_PROGRESS) return false;
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE)
      throw new Error('Google Play Services is not available.');
    throw e;
  }
}

/** Also sign out of the Google SDK so the account picker shows next time. */
export async function signOutGoogle() {
  if (configured) await GoogleSignin.signOut().catch(() => undefined);
}
