/**
 * The TOTP "secret key" a website shows under "can't scan the QR code?". People paste it with
 * spaces, dashes, lowercase letters or '=' padding; we normalise it and explain problems kindly
 * instead of surfacing raw base32 decoder errors.
 */

export const INVALID_KEY_MESSAGE =
  'That doesn’t look like a valid key. Keys only use letters A–Z and numbers 2–7, so check it was copied fully.';
export const EMPTY_KEY_MESSAGE = 'Paste or type the key the website shows.';
export const SHORT_KEY_MESSAGE =
  'That key looks too short. Check it was copied fully — most are 16 to 32 characters.';

/** Strip spaces, dashes and '=' padding; uppercase. */
export function normalizeSecret(raw: string): string {
  return raw
    .replace(/[\s-]+/g, '')
    .replace(/=+$/g, '')
    .toUpperCase();
}

/** null when the (already normalised) key is usable, else a friendly message. */
export function secretKeyError(secret: string): string | null {
  if (!secret) return EMPTY_KEY_MESSAGE;
  if (!/^[A-Z2-7]+$/.test(secret)) return INVALID_KEY_MESSAGE;
  if (secret.length < 8) return SHORT_KEY_MESSAGE;
  return null;
}

/** Turn any base32 / decoder error into friendly copy (never the raw "Invalid base32 character: 1"). */
export function friendlyKeyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e ?? '');
  return /base32|character|padding|length/i.test(msg) || !msg ? INVALID_KEY_MESSAGE : msg;
}
