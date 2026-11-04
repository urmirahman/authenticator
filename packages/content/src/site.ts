/**
 * Facts that legal pages, security.txt and the apps all reuse.
 *
 * LEGAL DEFAULTS: sensible starting values chosen for launch prep. Urmi should confirm or change
 * them here (one place); every page picks them up. If a value is ever unknown again, wrap it in
 * todo() and it renders highlighted, and `pendingTodos()` lists it.
 */
const TODO = 'TODO:';
export const todo = (what: string) => `${TODO} ${what}`;
export const isTodo = (v: string) => v.startsWith(TODO);

/** The single contact address used by Terms, Privacy, Security and security.txt. */
export const CONTACT_EMAIL = 'privacy@bloomauth.app';

export const site = {
  operator: 'Urmi Rahman',
  address: 'Dhaka, Bangladesh (full postal address available on request by email)',
  jurisdiction: 'Bangladesh',
  contactEmail: CONTACT_EMAIL,
  privacyEmail: CONTACT_EMAIL,
  securityEmail: CONTACT_EMAIL,
  domain: 'https://bloomauth.app',
  effectiveDate: '4 November 2026',
  minimumAge: '16',
  repoUrl: 'https://github.com/urmirahman/authenticator',
} as const;

export function pendingTodos(): string[] {
  return Object.entries(site)
    .filter(([, v]) => isTodo(v))
    .map(([k, v]) => `${k}: ${v.slice(TODO.length + 1)}`);
}

/** In markdown we show placeholders as <mark> so they stand out on the page. */
export const md = (v: string) => (isTodo(v) ? `<mark>${v}</mark>` : v);
