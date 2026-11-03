import { brand, light } from '@repo/brand';
import type { MetadataRoute } from 'next';

/** PWA manifest: lets people "install" Bloom from the browser. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.shortName,
    description: brand.description,
    start_url: '/vault',
    display: 'standalone',
    background_color: light.bg,
    theme_color: light.accent,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
