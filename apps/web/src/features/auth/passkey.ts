import { api } from '@/lib/api';

/**
 * Passkey (WebAuthn) sign-in, stubbed:
 * 1. ask the server for a challenge, 2. navigator.credentials.get(options), 3. send the assertion back.
 * The server currently answers 501 until the passkeys module is implemented.
 */
export async function signInWithPasskey() {
  const { challengeId, options } = await api.passkeys.beginLogin();
  const credential = await navigator.credentials.get({
    publicKey: options as PublicKeyCredentialRequestOptions,
  });
  return api.passkeys.finishLogin(challengeId, credential);
}
