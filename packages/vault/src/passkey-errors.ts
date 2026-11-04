/**
 * Friendly copy for WebAuthn / passkey failures, shared by web and mobile.
 * Browsers throw DOMExceptions whose messages are long and technical (and sometimes link to the
 * spec); we map them by `name` and keep the raw details for the console only.
 */
export type PasskeyAction = 'register' | 'signin';

export interface FriendlyError {
  /** Short, kind, user-facing message. */
  message: string;
  /** 'info' for cancellations (not really an error), 'error' otherwise. */
  tone: 'info' | 'error';
  /** The original error name, for logs/tests. */
  name: string;
}

const errorName = (e: unknown): string => {
  if (e && typeof e === 'object' && 'name' in e && typeof e.name === 'string') return e.name;
  return 'Error';
};

export function passkeyErrorMessage(e: unknown, action: PasskeyAction = 'register'): FriendlyError {
  const name = errorName(e);
  const verb = action === 'register' ? 'Passkey setup' : 'Passkey sign-in';
  switch (name) {
    case 'NotAllowedError':
      return {
        name,
        tone: 'info',
        message: `${verb} was cancelled or timed out. Try again, and make sure to approve the prompt from your browser or device.`,
      };
    case 'InvalidStateError':
      return {
        name,
        tone: 'info',
        message:
          action === 'register'
            ? 'This device already has a passkey for your account.'
            : 'This passkey can’t be used right now. Try another sign-in method.',
      };
    case 'NotSupportedError':
    case 'SecurityError':
      return {
        name,
        tone: 'error',
        message:
          'Passkeys aren’t available here. Your browser or device may not support them, or this page isn’t on a secure (https) address.',
      };
    case 'AbortError':
      return { name, tone: 'info', message: `${verb} was cancelled.` };
    default:
      return {
        name,
        tone: 'error',
        message: `${verb} didn’t work this time. Please try again in a moment.`,
      };
  }
}

/** Map and log: details go to the console only, the friendly message is returned. */
export function friendlyPasskeyError(
  e: unknown,
  action: PasskeyAction = 'register',
): FriendlyError {
  const friendly = passkeyErrorMessage(e, action);
  console.warn(`[passkey:${action}]`, e);
  return friendly;
}
