import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

/** Public pages are indexable; the app itself (vault, settings, ...) is not useful to crawl. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/vault',
        '/settings',
        '/devices',
        '/activity',
        '/backups',
        '/transfer',
        '/auth/',
        '/recovery-kit',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
