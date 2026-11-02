import { describe, expect, it } from 'vitest';
import { fromBase64Url, toBase64Url } from './base64';
import { credentialToJSON, parseCreationOptions, parseRequestOptions } from './webauthn-json';

const bytes = (...n: number[]) => new Uint8Array(n);

describe('base64url', () => {
  it('round-trips bytes that need - and _', () => {
    const b = bytes(0xfb, 0xff, 0xbf, 1);
    const s = toBase64Url(b);
    expect(s).toBe('-_-_AQ');
    expect(fromBase64Url(s)).toEqual(b);
  });
});

describe('webauthn json', () => {
  it('turns request options strings into buffers', () => {
    const o = parseRequestOptions({
      challenge: 'AQID',
      rpId: 'localhost',
      allowCredentials: [{ type: 'public-key', id: 'BAU' }],
    });
    expect(new Uint8Array(o.challenge as ArrayBuffer)).toEqual(bytes(1, 2, 3));
    expect(new Uint8Array(o.allowCredentials![0]!.id as ArrayBuffer)).toEqual(bytes(4, 5));
    expect(o.rpId).toBe('localhost');
  });

  it('converts the user id for creation options', () => {
    const o = parseCreationOptions({
      challenge: 'AQID',
      user: { id: 'CQ', name: 'a', displayName: 'A' },
      rp: { name: 'x' },
    });
    expect(new Uint8Array(o.user.id as ArrayBuffer)).toEqual(bytes(9));
    expect(o.user.name).toBe('a');
  });

  it('serializes an assertion', () => {
    const ab = (...n: number[]) => bytes(...n).buffer as ArrayBuffer;
    const json = credentialToJSON({
      id: 'abc',
      rawId: ab(1),
      type: 'public-key',
      response: { clientDataJSON: ab(2), authenticatorData: ab(3), signature: ab(4) },
      getClientExtensionResults: () => ({}),
    });
    expect(json).toMatchObject({
      id: 'abc',
      rawId: 'AQ',
      response: { clientDataJSON: 'Ag', authenticatorData: 'Aw', signature: 'BA' },
    });
  });
});
