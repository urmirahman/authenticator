import { ImportError, normalizeAlgorithm, type ImportedAccount } from './types';

/** 2FAS backup (unencrypted) — https://2fas.com : { services: [{ name, secret, otp: {...} }] } */
export function parse2fas(json: string): ImportedAccount[] {
  const data = safeParse(json) as {
    services?: Array<{
      name?: string;
      secret?: string;
      otp?: {
        account?: string;
        issuer?: string;
        digits?: number;
        period?: number;
        algorithm?: string;
        tokenType?: string;
        counter?: number;
      };
    }>;
    servicesEncrypted?: string;
  };
  if (data.servicesEncrypted) {
    throw new ImportError(
      'This 2FAS backup is password-protected. Export it without a password first.',
    );
  }
  if (!Array.isArray(data.services)) throw new ImportError('Not a 2FAS backup');
  return data.services.map((s) => {
    const otp = s.otp ?? {};
    const type = (otp.tokenType ?? 'TOTP').toUpperCase() === 'HOTP' ? 'hotp' : 'totp';
    if (!s.secret) throw new ImportError(`"${s.name}" has no secret`);
    if ((otp.tokenType ?? 'TOTP').toUpperCase() === 'STEAM')
      throw new ImportError('Steam tokens are not supported');
    const a: ImportedAccount = {
      type,
      issuer: otp.issuer ?? s.name ?? '',
      label: otp.account ?? '',
      secret: s.secret.replace(/\s/g, '').toUpperCase(),
      algorithm: normalizeAlgorithm(otp.algorithm),
      digits: otp.digits ?? 6,
      period: otp.period ?? 30,
    };
    if (type === 'hotp') a.counter = otp.counter ?? 0;
    return a;
  });
}

/** Aegis export (plain JSON) — https://getaegis.app : { header, db: { entries: [...] } } */
export function parseAegis(json: string): ImportedAccount[] {
  const data = safeParse(json) as {
    header?: { slots?: unknown };
    db?:
      | string
      | {
          entries?: Array<{
            type?: string;
            name?: string;
            issuer?: string;
            info?: {
              secret?: string;
              algo?: string;
              digits?: number;
              period?: number;
              counter?: number;
            };
          }>;
        };
  };
  if (data.header?.slots || typeof data.db === 'string') {
    throw new ImportError('This Aegis export is encrypted. Export it unencrypted first.');
  }
  if (!data.db || !Array.isArray(data.db.entries)) throw new ImportError('Not an Aegis export');
  return data.db.entries
    .filter((e) => e.type === 'totp' || e.type === 'hotp')
    .map((e) => {
      const info = e.info ?? {};
      if (!info.secret) throw new ImportError(`"${e.name}" has no secret`);
      const a: ImportedAccount = {
        type: e.type as 'totp' | 'hotp',
        issuer: e.issuer ?? '',
        label: e.name ?? '',
        secret: info.secret.toUpperCase(),
        algorithm: normalizeAlgorithm(info.algo),
        digits: info.digits ?? 6,
        period: info.period ?? 30,
      };
      if (a.type === 'hotp') a.counter = info.counter ?? 0;
      return a;
    });
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    throw new ImportError('File is not valid JSON');
  }
}
