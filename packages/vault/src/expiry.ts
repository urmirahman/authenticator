/**
 * Optional account expiry ("Advanced → Expires"). Stored inside the encrypted item as
 * `expiresAt` (a calendar date, YYYY-MM-DD). Items without it — including every item written
 * before schema v2 — never expire.
 */

/** Current account item schema. v1 had no `schema` field; v2 adds optional `expiresAt`. */
export const ACCOUNT_SCHEMA_VERSION = 2;

/** "Expires soon" shows this many days ahead. */
export const EXPIRES_SOON_DAYS = 7;

export type ExpiryStatus = 'none' | 'ok' | 'soon' | 'expired';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY = 24 * 60 * 60 * 1000;

/** True for a real calendar date in YYYY-MM-DD form. */
export function isExpiryDate(value: string | undefined | null): value is string {
  if (!value || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  return !Number.isNaN(d.getTime()) && toExpiryDate(d) === value;
}

/** Local calendar date → YYYY-MM-DD. */
export function toExpiryDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The item is usable through the whole expiry day and expired from the next local midnight. */
export function expiryStatus(expiresAt: string | undefined, now: Date = new Date()): ExpiryStatus {
  if (!isExpiryDate(expiresAt)) return 'none';
  const end = new Date(`${expiresAt}T00:00:00`).getTime() + DAY;
  const left = end - now.getTime();
  if (left <= 0) return 'expired';
  return left <= EXPIRES_SOON_DAYS * DAY ? 'soon' : 'ok';
}

/** Friendly date for chips and labels, e.g. "12 Jan 2027". */
export function formatExpiry(expiresAt: string, locale?: string): string {
  return new Date(`${expiresAt}T00:00:00`).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Set or clear expiry on account data and stamp the current schema version. */
export function withExpiry<T extends { expiresAt?: string; schema?: number }>(
  data: T,
  expiresAt: string | undefined,
): T {
  const next: T = { ...data, schema: ACCOUNT_SCHEMA_VERSION };
  if (isExpiryDate(expiresAt)) next.expiresAt = expiresAt;
  else delete next.expiresAt;
  return next;
}
