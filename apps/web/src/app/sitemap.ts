import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/security', '/help', '/privacy', '/cookies', '/terms', '/about', '/sign-in'].map(
    (p) => ({
      url: `${SITE_URL}${p}`,
      changeFrequency: 'monthly',
    }),
  );
}
