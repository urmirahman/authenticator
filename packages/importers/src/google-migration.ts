import { base32Decode, base32Encode } from '@repo/crypto';
import { readFields, Writer } from './protobuf';
import { ImportError, type Algorithm, type ImportedAccount } from './types';

/**
 * Google Authenticator "Transfer accounts" QR codes look like:
 *   otpauth-migration://offline?data=<base64 protobuf MigrationPayload>
 *
 * message MigrationPayload { repeated OtpParameters otp_parameters = 1; int32 version = 2;
 *                            int32 batch_size = 3; int32 batch_index = 4; int32 batch_id = 5; }
 * message OtpParameters { bytes secret = 1; string name = 2; string issuer = 3;
 *   Algorithm algorithm = 4;   // 1 SHA1, 2 SHA256, 3 SHA512, 4 MD5
 *   DigitCount digits = 5;     // 1 SIX, 2 EIGHT
 *   OtpType type = 6;          // 1 HOTP, 2 TOTP
 *   int64 counter = 7; }
 */

const ALGS: Record<number, Algorithm> = { 0: 'SHA1', 1: 'SHA1', 2: 'SHA256', 3: 'SHA512' };
const ALG_IDS: Record<Algorithm, number> = { SHA1: 1, SHA256: 2, SHA512: 3 };

export interface MigrationBatch {
  accounts: ImportedAccount[];
  batchIndex: number;
  batchSize: number;
  batchId: number;
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function bytesToBase64(b: Uint8Array): string {
  return btoa(String.fromCharCode(...b));
}

export function parseGoogleMigration(uri: string): MigrationBatch {
  let url: URL;
  try {
    url = new URL(uri.trim());
  } catch {
    throw new ImportError('Not a valid URI');
  }
  if (url.protocol !== 'otpauth-migration:')
    throw new ImportError('Not an otpauth-migration:// URI');
  const data = url.searchParams.get('data');
  if (!data) throw new ImportError('Missing data parameter');

  const batch: MigrationBatch = { accounts: [], batchIndex: 0, batchSize: 1, batchId: 0 };
  for (const f of readFields(base64ToBytes(data))) {
    if (f.num === 1 && f.bytes) batch.accounts.push(parseOtp(f.bytes));
    if (f.num === 3 && f.int !== undefined) batch.batchSize = Number(f.int);
    if (f.num === 4 && f.int !== undefined) batch.batchIndex = Number(f.int);
    if (f.num === 5 && f.int !== undefined) batch.batchId = Number(f.int);
  }
  return batch;
}

function parseOtp(buf: Uint8Array): ImportedAccount {
  const dec = new TextDecoder();
  let secret: Uint8Array | undefined;
  let name = '';
  let issuer = '';
  let alg = 1;
  let digits = 1;
  let type = 2;
  let counter = 0;
  for (const f of readFields(buf)) {
    if (f.num === 1) secret = f.bytes;
    else if (f.num === 2 && f.bytes) name = dec.decode(f.bytes);
    else if (f.num === 3 && f.bytes) issuer = dec.decode(f.bytes);
    else if (f.num === 4) alg = Number(f.int);
    else if (f.num === 5) digits = Number(f.int);
    else if (f.num === 6) type = Number(f.int);
    else if (f.num === 7) counter = Number(f.int);
  }
  if (!secret?.length) throw new ImportError('Account without a secret');
  const algorithm = ALGS[alg];
  if (!algorithm) throw new ImportError('MD5 accounts are not supported');
  // Google puts "Issuer:label" in name sometimes; strip the duplicate issuer.
  const label = issuer && name.startsWith(`${issuer}:`) ? name.slice(issuer.length + 1) : name;
  const account: ImportedAccount = {
    type: type === 1 ? 'hotp' : 'totp',
    issuer,
    label: label.trim(),
    secret: base32Encode(secret),
    algorithm,
    digits: digits === 2 ? 8 : 6,
    period: 30,
  };
  if (account.type === 'hotp') account.counter = counter;
  return account;
}

/**
 * Build Google-compatible migration URIs ("export QR batch" for moving to a new phone).
 * Google Authenticator only understands 6/8 digits and 30 s periods; other accounts are skipped.
 */
export function toGoogleMigration(accounts: ImportedAccount[], perQr = 10, batchId = 1): string[] {
  const ok = accounts.filter((a) => (a.digits === 6 || a.digits === 8) && a.period === 30);
  const chunks: ImportedAccount[][] = [];
  for (let i = 0; i < ok.length; i += perQr) chunks.push(ok.slice(i, i + perQr));
  return chunks.map((chunk, idx) => {
    const w = new Writer();
    for (const a of chunk) {
      const p = new Writer()
        .bytes(1, base32Decode(a.secret))
        .string(2, a.label)
        .string(3, a.issuer)
        .int(4, ALG_IDS[a.algorithm])
        .int(5, a.digits === 8 ? 2 : 1)
        .int(6, a.type === 'hotp' ? 1 : 2);
      if (a.type === 'hotp') p.int(7, a.counter ?? 0);
      w.bytes(1, p.finish());
    }
    w.int(2, 1).int(3, chunks.length).int(4, idx).int(5, batchId);
    return `otpauth-migration://offline?data=${encodeURIComponent(bytesToBase64(w.finish()))}`;
  });
}
