/** Minimum master password length (web + mobile). Length beats complexity rules. */
export const MIN_MASTER_PASSWORD = 10;

/**
 * Very rough strength hint (length + variety + word count). A nudge, not a security guarantee;
 * the real protection is Argon2id plus a long passphrase.
 */
export function strengthOf(pw: string): { score: 0 | 1 | 2 | 3; label: string } {
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9\s]/].filter((r) => r.test(pw)).length;
  const words = pw.trim().split(/\s+/).filter(Boolean).length;
  if (pw.length < MIN_MASTER_PASSWORD) return { score: 0, label: 'Too short' };
  if (pw.length >= 20 || (words >= 4 && pw.length >= 16)) return { score: 3, label: 'Strong' };
  if (pw.length >= 14 && variety >= 2) return { score: 2, label: 'Good' };
  return { score: 1, label: 'Okay — longer is better' };
}
