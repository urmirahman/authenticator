import { api, completeSignIn } from '@/lib/api';
import {
  credentialToJSON,
  parseCreationOptions,
  parseRequestOptions,
  type CredentialLike,
} from '@/lib/webauthn-json';

/**
 * Passkeys (WebAuthn), step by step:
 * 1. the server creates a random challenge and sends options (base64url JSON),
 * 2. we convert them to ArrayBuffers and ask the browser / phone / security key to sign,
 * 3. we convert the answer back to JSON and the server verifies the signature.
 */

type Json = Record<string, unknown>;

export const passkeysSupported = () =>
  typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';

export async function signInWithPasskey() {
  const { challengeId, options } = await api.passkeys.beginLogin();
  const credential = await navigator.credentials.get({
    publicKey: parseRequestOptions(options.publicKey as Json),
  });
  if (!credential) throw new Error('No passkey was selected');
  const tokens = await api.passkeys.finishLogin(
    challengeId,
    credentialToJSON(credential as unknown as CredentialLike),
  );
  await completeSignIn(tokens);
}

/** Add a passkey to the signed-in account (Settings page). */
export async function registerPasskey(name: string) {
  const { challengeId, options } = await api.passkeys.beginRegister();
  const credential = await navigator.credentials.create({
    publicKey: parseCreationOptions(options.publicKey as Json),
  });
  if (!credential) throw new Error('Passkey creation was cancelled');
  return api.passkeys.finishRegister(
    challengeId,
    credentialToJSON(credential as unknown as CredentialLike),
    name,
  );
}
