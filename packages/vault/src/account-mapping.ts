import type { ImportedAccount } from '@repo/importers';
import { ACCOUNT_SCHEMA_VERSION } from './expiry';
import type { AccountData } from './vault-codec';

/** Importers produce ImportedAccount; the vault stores AccountData. Same info, tiny mapping. */
export function toAccountData(a: ImportedAccount, folderId?: string): AccountData {
  return {
    issuer: a.issuer,
    label: a.label,
    secret: a.secret,
    algorithm: a.algorithm,
    digits: a.digits,
    period: a.period,
    type: a.type,
    counter: a.counter,
    folderId,
    schema: ACCOUNT_SCHEMA_VERSION,
  };
}

/** The reverse, for backups and transfer QR codes. */
export function toImported(a: AccountData): ImportedAccount {
  return {
    type: a.type ?? 'totp',
    issuer: a.issuer,
    label: a.label,
    secret: a.secret,
    algorithm: a.algorithm,
    digits: a.digits,
    period: a.period,
    counter: a.counter,
  };
}
