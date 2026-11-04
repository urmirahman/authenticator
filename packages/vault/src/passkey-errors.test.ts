import { describe, expect, it, vi } from 'vitest';
import { friendlyPasskeyError, passkeyErrorMessage } from './passkey-errors';

const dom = (name: string, message = 'raw spec text https://www.w3.org/TR/webauthn-2/') =>
  Object.assign(new Error(message), { name });

describe('passkeyErrorMessage', () => {
  it('maps NotAllowedError to a cancelled/timed-out hint', () => {
    const r = passkeyErrorMessage(dom('NotAllowedError'));
    expect(r.message).toBe(
      'Passkey setup was cancelled or timed out. Try again, and make sure to approve the prompt from your browser or device.',
    );
    expect(r.tone).toBe('info');
  });

  it('says sign-in instead of setup for sign-in', () => {
    expect(passkeyErrorMessage(dom('NotAllowedError'), 'signin').message).toMatch(
      /^Passkey sign-in/,
    );
  });

  it('maps InvalidStateError to an existing passkey', () => {
    expect(passkeyErrorMessage(dom('InvalidStateError')).message).toBe(
      'This device already has a passkey for your account.',
    );
  });

  it.each(['NotSupportedError', 'SecurityError'])('maps %s to unsupported / insecure', (n) => {
    const r = passkeyErrorMessage(dom(n));
    expect(r.message).toMatch(/aren’t available here/);
    expect(r.message).toMatch(/secure/);
    expect(r.tone).toBe('error');
  });

  it('maps AbortError to cancelled', () => {
    expect(passkeyErrorMessage(dom('AbortError')).message).toBe('Passkey setup was cancelled.');
  });

  it('never leaks raw messages for unknown errors or non-errors', () => {
    for (const e of [dom('TypeError', 'secret internals'), 'boom', null, undefined, 42]) {
      const r = passkeyErrorMessage(e);
      expect(r.message).not.toMatch(/secret internals|w3\.org|boom/);
      expect(r.message).toMatch(/didn’t work this time/);
    }
  });

  it('logs details to the console only', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = friendlyPasskeyError(dom('NotAllowedError'));
    expect(warn).toHaveBeenCalledOnce();
    expect(r.message).not.toMatch(/w3\.org/);
    warn.mockRestore();
  });
});
