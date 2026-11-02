import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source, so Next compiles them.
  transpilePackages: [
    '@repo/ui',
    '@repo/types',
    '@repo/crypto',
    '@repo/api-client',
    '@repo/importers',
  ],
};

export default nextConfig;
