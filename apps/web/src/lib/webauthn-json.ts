import { fromBase64Url, toBase64Url } from './base64';

/**
 * WebAuthn speaks ArrayBuffers, but JSON can only carry strings. The server (go-webauthn) sends
 * options with base64url strings and expects the browser's answer as base64url JSON too.
 * Newer browsers have PublicKeyCredential.parseRequestOptionsFromJSON / credential.toJSON();
 * these helpers do the same conversion by hand so every browser works.
 */

type Json = Record<string, unknown>;

const buf = (s: unknown) => fromBase64Url(String(s)).buffer as ArrayBuffer;

function convertDescriptors(list: unknown) {
  if (!Array.isArray(list)) return undefined;
  return list.map((d: Json) => ({ ...d, id: buf(d.id) })) as PublicKeyCredentialDescriptor[];
}

/** Options for navigator.credentials.get() (sign in). */
export function parseRequestOptions(json: Json): PublicKeyCredentialRequestOptions {
  return {
    ...(json as object),
    challenge: buf(json.challenge),
    allowCredentials: convertDescriptors(json.allowCredentials),
  } as PublicKeyCredentialRequestOptions;
}

/** Options for navigator.credentials.create() (add a passkey). */
export function parseCreationOptions(json: Json): PublicKeyCredentialCreationOptions {
  const user = json.user as Json;
  return {
    ...(json as object),
    challenge: buf(json.challenge),
    user: { ...user, id: buf(user.id) },
    excludeCredentials: convertDescriptors(json.excludeCredentials),
  } as PublicKeyCredentialCreationOptions;
}

/** Minimal shape we read from a PublicKeyCredential (keeps this file testable without a browser). */
export interface CredentialLike {
  id: string;
  rawId: ArrayBuffer;
  type: string;
  authenticatorAttachment?: string | null;
  response: Record<string, unknown> & { clientDataJSON: ArrayBuffer };
  getClientExtensionResults?: () => unknown;
}

/** Turn the browser's credential into the JSON go-webauthn expects. */
export function credentialToJSON(cred: CredentialLike): Json {
  const r = cred.response;
  const response: Json = { clientDataJSON: toBase64Url(r.clientDataJSON) };
  for (const key of ['authenticatorData', 'signature', 'attestationObject'] as const) {
    if (r[key] instanceof ArrayBuffer) response[key] = toBase64Url(r[key]);
  }
  if (r.userHandle instanceof ArrayBuffer) response.userHandle = toBase64Url(r.userHandle);
  if (typeof r.getTransports === 'function')
    response.transports = (r.getTransports as () => string[]).call(r);
  return {
    id: cred.id,
    rawId: toBase64Url(cred.rawId),
    type: cred.type,
    authenticatorAttachment: cred.authenticatorAttachment ?? undefined,
    response,
    clientExtensionResults: cred.getClientExtensionResults?.() ?? {},
  };
}
