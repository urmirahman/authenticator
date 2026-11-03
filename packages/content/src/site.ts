/**
 * Facts that legal pages, security.txt and the apps all reuse. Values wrapped in todo() are
 * PLACEHOLDERS that Urmi must fill before launch; they render highlighted so nobody misses them.
 * `pendingTodos()` lists every remaining one (used by tests and the report).
 */
const TODO = 'TODO:';
export const todo = (what: string) => `${TODO} ${what}`;
export const isTodo = (v: string) => v.startsWith(TODO);

export const site = {
  operator: todo('legal name of the operator (person or company)'),
  address: todo('postal address for legal notices'),
  jurisdiction: todo('country / state whose law governs the Terms'),
  contactEmail: todo('support email, e.g. support@your-domain'),
  privacyEmail: todo('privacy email, e.g. privacy@your-domain'),
  securityEmail: todo('security email, e.g. security@your-domain'),
  domain: todo('production domain, e.g. https://bloomauth.app'),
  effectiveDate: todo('effective date, e.g. 1 January 2027'),
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
