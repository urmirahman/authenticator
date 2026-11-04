import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

const PAGES: { path: string; priority: number }[] = [
  { path: '/', priority: 1 },
  { path: '/about', priority: 0.8 },
  { path: '/security', priority: 0.8 },
  { path: '/help', priority: 0.7 },
  { path: '/sign-in', priority: 0.6 },
  { path: '/privacy', priority: 0.5 },
  { path: '/terms', priority: 0.5 },
  { path: '/cookies', priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.map(({ path, priority }) => ({
    url: path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: 'monthly',
    priority,
  }));
}
