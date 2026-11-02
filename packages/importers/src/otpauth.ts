import { ImportError, normalizeAlgorithm, type ImportedAccount, type OtpType } from './types';

/**
 * otpauth://totp/Issuer:label?secret=BASE32&issuer=Issuer&algorithm=SHA1&digits=6&period=30
 * otpauth://hotp/...&counter=0
 * Spec: https://github.com/google/google-authenticator/wiki/Key-Uri-Format
 */
export function parseOtpAuth(uri: string): ImportedAccount {
  let url: URL;
  try {
    url = new URL(uri.trim());
  } catch {
    throw new ImportError('Not a valid URI');
  }
  if (url.protocol !== 'otpauth:') throw new ImportError('Not an otpauth:// URI');
  const type = url.host.toLowerCase() as OtpType;
  if (type !== 'totp' && type !== 'hotp') throw new ImportError(`Unknown OTP type: ${url.host}`);

  const p = url.searchParams;
  const secret = p.get('secret')?.replace(/\s|=/g, '').toUpperCase();
  if (!secret || !/^[A-Z2-7]+$/.test(secret)) throw new ImportError('Missing or invalid secret');

  const path = decodeURIComponent(url.pathname.replace(/^\//, ''));
  const colon = path.indexOf(':');
  const pathIssuer = colon >= 0 ? path.slice(0, colon) : '';
  const label = (colon >= 0 ? path.slice(colon + 1) : path).trim();

  const digits = Number(p.get('digits') ?? 6);
  const period = Number(p.get('period') ?? 30);
  if (![6, 7, 8].includes(digits)) throw new ImportError('digits must be 6, 7 or 8');
  if (!Number.isInteger(period) || period <= 0)
    throw new ImportError('period must be a positive integer');

  const account: ImportedAccount = {
    type,
    issuer: (p.get('issuer') ?? pathIssuer).trim(),
    label,
    secret,
    algorithm: normalizeAlgorithm(p.get('algorithm') ?? undefined),
    digits,
    period,
  };
  if (type === 'hotp') account.counter = Number(p.get('counter') ?? 0);
  return account;
}

/** Inverse of parseOtpAuth: used for "show QR" / export to another app. */
export function toOtpAuth(a: ImportedAccount): string {
  const name = a.issuer ? `${a.issuer}:${a.label}` : a.label;
  const p = new URLSearchParams({
    secret: a.secret,
    issuer: a.issuer,
    algorithm: a.algorithm,
    digits: String(a.digits),
  });
  if (a.type === 'totp') p.set('period', String(a.period));
  else p.set('counter', String(a.counter ?? 0));
  return `otpauth://${a.type}/${encodeURIComponent(name)}?${p.toString()}`;
}
