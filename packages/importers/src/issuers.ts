/**
 * Curated issuer -> icon map. `slug` is a Simple Icons slug (https://simpleicons.org, CC0),
 * so apps can render the brand logo if they bundle Simple Icons; otherwise use `color` +
 * initials. No network lookups and no scraping: the list is hand-maintained.
 */
export interface IssuerIcon {
  slug: string;
  color: string; // brand hex, no #
  name: string;
}

const ICONS: Record<string, IssuerIcon> = {
  google: { slug: 'google', color: '4285F4', name: 'Google' },
  github: { slug: 'github', color: '181717', name: 'GitHub' },
  gitlab: { slug: 'gitlab', color: 'FC6D26', name: 'GitLab' },
  microsoft: { slug: 'microsoft', color: '5E5E5E', name: 'Microsoft' },
  apple: { slug: 'apple', color: '000000', name: 'Apple' },
  amazon: { slug: 'amazon', color: 'FF9900', name: 'Amazon' },
  aws: { slug: 'amazonwebservices', color: 'FF9900', name: 'AWS' },
  facebook: { slug: 'facebook', color: '0866FF', name: 'Facebook' },
  instagram: { slug: 'instagram', color: 'E4405F', name: 'Instagram' },
  x: { slug: 'x', color: '000000', name: 'X' },
  twitter: { slug: 'x', color: '000000', name: 'X' },
  linkedin: { slug: 'linkedin', color: '0A66C2', name: 'LinkedIn' },
  discord: { slug: 'discord', color: '5865F2', name: 'Discord' },
  slack: { slug: 'slack', color: '4A154B', name: 'Slack' },
  dropbox: { slug: 'dropbox', color: '0061FF', name: 'Dropbox' },
  cloudflare: { slug: 'cloudflare', color: 'F38020', name: 'Cloudflare' },
  vercel: { slug: 'vercel', color: '000000', name: 'Vercel' },
  digitalocean: { slug: 'digitalocean', color: '0080FF', name: 'DigitalOcean' },
  heroku: { slug: 'heroku', color: '430098', name: 'Heroku' },
  npm: { slug: 'npm', color: 'CB3837', name: 'npm' },
  docker: { slug: 'docker', color: '2496ED', name: 'Docker' },
  paypal: { slug: 'paypal', color: '002991', name: 'PayPal' },
  stripe: { slug: 'stripe', color: '635BFF', name: 'Stripe' },
  coinbase: { slug: 'coinbase', color: '0052FF', name: 'Coinbase' },
  binance: { slug: 'binance', color: 'F0B90B', name: 'Binance' },
  reddit: { slug: 'reddit', color: 'FF4500', name: 'Reddit' },
  twitch: { slug: 'twitch', color: '9146FF', name: 'Twitch' },
  steam: { slug: 'steam', color: '000000', name: 'Steam' },
  epicgames: { slug: 'epicgames', color: '313131', name: 'Epic Games' },
  atlassian: { slug: 'atlassian', color: '0052CC', name: 'Atlassian' },
  notion: { slug: 'notion', color: '000000', name: 'Notion' },
  figma: { slug: 'figma', color: 'F24E1E', name: 'Figma' },
  shopify: { slug: 'shopify', color: '7AB55C', name: 'Shopify' },
  wordpress: { slug: 'wordpress', color: '21759B', name: 'WordPress' },
  proton: { slug: 'proton', color: '6D4AFF', name: 'Proton' },
  bitwarden: { slug: 'bitwarden', color: '175DDC', name: 'Bitwarden' },
  '1password': { slug: '1password', color: '3B66BC', name: '1Password' },
  okta: { slug: 'okta', color: '007DC1', name: 'Okta' },
  openai: { slug: 'openai', color: '412991', name: 'OpenAI' },
  tiktok: { slug: 'tiktok', color: '000000', name: 'TikTok' },
};

const ALIASES: Record<string, string> = {
  'google.com': 'google',
  gmail: 'google',
  'github.com': 'github',
  'amazon web services': 'aws',
  'microsoft account': 'microsoft',
  outlook: 'microsoft',
  'x.com': 'x',
  'twitter.com': 'twitter',
  protonmail: 'proton',
  'proton mail': 'proton',
  meta: 'facebook',
};

/** Find an icon for an issuer string ("GitHub", "github.com", "Amazon Web Services"...). */
export function issuerIcon(issuer: string): IssuerIcon | undefined {
  const k = issuer.trim().toLowerCase();
  if (!k) return undefined;
  const direct =
    ICONS[ALIASES[k] ?? k] ?? ICONS[k.replace(/\.(com|org|io|net)$/, '').replace(/\s+/g, '')];
  return direct;
}

/** Fallback avatar text: first letters of up to two words. */
export function issuerInitials(issuer: string): string {
  const words = issuer.trim().split(/\s+/).filter(Boolean);
  return (
    words.length > 1 ? words[0]![0]! + words[1]![0]! : (words[0] ?? '?').slice(0, 2)
  ).toUpperCase();
}
