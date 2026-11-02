export type OtpType = 'totp' | 'hotp';
export type Algorithm = 'SHA1' | 'SHA256' | 'SHA512';

/** The one shape every importer produces. Secrets are base32 (like in otpauth:// URIs). */
export interface ImportedAccount {
  type: OtpType;
  issuer: string;
  label: string;
  secret: string;
  algorithm: Algorithm;
  digits: number;
  period: number; // TOTP only, but always filled (default 30)
  counter?: number; // HOTP only
}

export class ImportError extends Error {}

export function normalizeAlgorithm(a: string | undefined): Algorithm {
  const v = (a ?? 'SHA1').toUpperCase().replace('-', '');
  if (v === 'SHA1' || v === 'SHA256' || v === 'SHA512') return v;
  throw new ImportError(`Unsupported algorithm: ${a}`);
}
