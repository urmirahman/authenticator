import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_SCHEMA_VERSION,
  expiryStatus,
  isExpiryDate,
  toExpiryDate,
  withExpiry,
} from './expiry';

const at = (s: string) => new Date(`${s}T12:00:00`);

describe('expiry', () => {
  it('treats missing or invalid dates (old items) as never expiring', () => {
    expect(expiryStatus(undefined)).toBe('none');
    expect(expiryStatus('2026-02-30')).toBe('none');
    expect(expiryStatus('soon')).toBe('none');
  });

  it('validates calendar dates', () => {
    expect(isExpiryDate('2026-11-04')).toBe(true);
    expect(isExpiryDate('2026-13-01')).toBe(false);
    expect(toExpiryDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('is ok far away, soon within 7 days, and expired after the day ends', () => {
    expect(expiryStatus('2026-12-31', at('2026-11-04'))).toBe('ok');
    expect(expiryStatus('2026-11-10', at('2026-11-04'))).toBe('soon');
    expect(expiryStatus('2026-11-04', at('2026-11-04'))).toBe('soon');
    expect(expiryStatus('2026-11-03', at('2026-11-04'))).toBe('expired');
  });

  it('sets or clears expiry and stamps the schema version', () => {
    const base = { issuer: 'GitHub', expiresAt: '2026-01-01' };
    expect(withExpiry(base, '2027-01-01')).toEqual({
      issuer: 'GitHub',
      expiresAt: '2027-01-01',
      schema: ACCOUNT_SCHEMA_VERSION,
    });
    expect(withExpiry(base, undefined)).toEqual({ issuer: 'GitHub', schema: 2 });
  });
});
