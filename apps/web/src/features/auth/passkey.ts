import { api } from '@/lib/api';

/**
 * Passkey (WebAuthn) sign-in:
 * 1. ask the server for a challenge, 2. navigator.credentials.get(options.publicKey), 3. send the assertion back.
 * TODO: the server sends base64url JSON; convert with PublicKeyCredential.parseRequestOptionsFromJSON
 * (or @simplewebauthn/browser) and serialize the result with credential.toJSON() before sending.
 */
export async function signInWithPasskey() {
  const { challengeId, options } = await api.passkeys.beginLogin();
  const credential = await navigator.credentials.get({
    publicKey: options.publicKey as unknown as PublicKeyCredentialRequestOptions,
  });
  return api.passkeys.finishLogin(challengeId, credential);
}
