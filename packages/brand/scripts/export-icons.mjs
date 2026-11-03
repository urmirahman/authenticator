#!/usr/bin/env node
/* global console, Buffer */
/**
 * Renders the SVG brand assets to PNGs for web (favicon, PWA, Open Graph) and Expo (icon, splash,
 * Android adaptive icon). Run: pnpm -F @repo/brand export-icons
 */
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const asset = (n) => readFileSync(join(root, 'assets', n));
const repo = join(root, '..', '..');

const jobs = [
  // web
  ['logo-mark.svg', 'apps/web/public/icons/icon-192.png', 192],
  ['logo-mark.svg', 'apps/web/public/icons/icon-512.png', 512],
  ['app-icon.svg', 'apps/web/public/icons/maskable-512.png', 512],
  ['app-icon.svg', 'apps/web/public/apple-touch-icon.png', 180],
  ['logo-mark.svg', 'apps/web/public/favicon-32.png', 32],
  // mobile (Expo)
  ['app-icon.svg', 'apps/mobile/assets/icon.png', 1024],
  ['adaptive-foreground.svg', 'apps/mobile/assets/adaptive-icon.png', 1024],
  ['adaptive-foreground.svg', 'apps/mobile/assets/splash-icon.png', 1024],
];

for (const [src, out, size] of jobs) {
  const dest = join(repo, out);
  mkdirSync(dirname(dest), { recursive: true });
  await sharp(asset(src), { density: 384 }).resize(size, size).png().toFile(dest);
  console.log('wrote', out);
}

// Open Graph image 1200x630: wordmark on the light background.
const og = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#faf8f7"/>
  <g transform="translate(160 200) scale(1.7)" color="#17151a">${asset('wordmark.svg')
    .toString()
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<svg[^>]*>/, '')
    .replace('</svg>', '')}</g>
  <text x="160" y="520" font-family="system-ui, sans-serif" font-size="34" fill="#57524f">Two-factor codes, end-to-end encrypted.</text>
</svg>`);
await sharp(og).png().toFile(join(repo, 'apps/web/public/og.png'));
console.log('wrote apps/web/public/og.png');
