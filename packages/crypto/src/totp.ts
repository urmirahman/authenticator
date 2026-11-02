import { hmac } from '@noble/hashes/hmac.js';
import { sha1 } from '@noble/hashes/legacy.js';
import { sha256, sha512 } from '@noble/hashes/sha2.js';
import { base32Decode } from './base32';

export type TotpAlgorithm = 'SHA1' | 'SHA256' | 'SHA512';

export interface TotpOptions {
  algorithm?: TotpAlgorithm;
  digits?: number;
  period?: number;
  /** Unix time in milliseconds. Defaults to Date.now(). */
  timestamp?: number;
}

const HASHES = { SHA1: sha1, SHA256: sha256, SHA512: sha512 } as const;

/** RFC 4226 HOTP: HMAC the 8-byte counter, then "dynamic truncation" to N digits. */
export function hotp(
  key: Uint8Array,
  counter: number,
  digits = 6,
  algorithm: TotpAlgorithm = 'SHA1',
) {
  const msg = new Uint8Array(8);
  // counter can exceed 32 bits, so write high and low halves separately
  const view = new DataView(msg.buffer);
  view.setUint32(0, Math.floor(counter / 2 ** 32));
  view.setUint32(4, counter >>> 0);
  const mac = hmac(HASHES[algorithm], key, msg);
  const offset = mac[mac.length - 1]! & 0x0f;
  const bin =
    ((mac[offset]! & 0x7f) << 24) |
    (mac[offset + 1]! << 16) |
    (mac[offset + 2]! << 8) |
    mac[offset + 3]!;
  return (bin % 10 ** digits).toString().padStart(digits, '0');
}

/** RFC 6238 TOTP with a raw key. Computed on device only; the secret never leaves it in plaintext. */
export function totpFromKey(key: Uint8Array, opts: TotpOptions = {}) {
  const { algorithm = 'SHA1', digits = 6, period = 30, timestamp = Date.now() } = opts;
  const counter = Math.floor(timestamp / 1000 / period);
  return hotp(key, counter, digits, algorithm);
}

/** TOTP with a base32 secret, as found in otpauth:// URIs. */
export function totp(secretBase32: string, opts: TotpOptions = {}) {
  return totpFromKey(base32Decode(secretBase32), opts);
}

/** Seconds until the current code expires (drives the countdown ring). */
export function secondsRemaining(period = 30, timestamp = Date.now()) {
  return period - (Math.floor(timestamp / 1000) % period);
}

export interface OtpAuthUri {
  issuer: string;
  label: string;
  secret: string;
  algorithm: TotpAlgorithm;
  digits: number;
  period: number;
}

/** Parse an otpauth://totp/Issuer:label?secret=...&issuer=... URI (from a QR code). */
export function parseOtpAuthUri(uri: string): OtpAuthUri {
  const url = new URL(uri);
  if (url.protocol !== 'otpauth:' || url.host !== 'totp') throw new Error('Not a TOTP otpauth URI');
  const path = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const [maybeIssuer, maybeLabel] = path.includes(':') ? path.split(':', 2) : ['', path];
  const p = url.searchParams;
  const secret = p.get('secret');
  if (!secret) throw new Error('Missing secret');
  return {
    issuer: p.get('issuer') ?? maybeIssuer ?? '',
    label: (maybeLabel ?? '').trim(),
    secret,
    algorithm: (p.get('algorithm')?.toUpperCase() as TotpAlgorithm) ?? 'SHA1',
    digits: Number(p.get('digits') ?? 6),
    period: Number(p.get('period') ?? 30),
  };
}
