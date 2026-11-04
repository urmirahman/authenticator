import { describe, expect, it } from 'vitest';
import {
  EMPTY_KEY_MESSAGE,
  friendlyKeyError,
  INVALID_KEY_MESSAGE,
  normalizeSecret,
  secretKeyError,
  SHORT_KEY_MESSAGE,
} from './secret-key';

describe('secret keys', () => {
  it('normalises spaces, dashes, case and padding', () => {
    expect(normalizeSecret(' jbsw y3dp-ehpk 3pxp== ')).toBe('JBSWY3DPEHPK3PXP');
  });

  it('accepts valid keys', () => {
    expect(secretKeyError('JBSWY3DPEHPK3PXP')).toBeNull();
  });

  it('explains empty, invalid and short keys kindly', () => {
    expect(secretKeyError('')).toBe(EMPTY_KEY_MESSAGE);
    expect(secretKeyError('JBSWY3DP1HPK')).toBe(INVALID_KEY_MESSAGE); // 1 is not base32
    expect(secretKeyError('JBSWY3D0')).toBe(INVALID_KEY_MESSAGE); // 0 is not base32
    expect(secretKeyError('JBSW')).toBe(SHORT_KEY_MESSAGE);
  });

  it('maps raw base32 errors to friendly copy', () => {
    expect(friendlyKeyError(new Error('Invalid base32 character: 1'))).toBe(INVALID_KEY_MESSAGE);
    expect(friendlyKeyError(new Error('Network down'))).toBe('Network down');
  });
});
