import { brand } from '@repo/brand';
import { md, site } from './site';

export const aboutPage = () => `# About ${brand.name}

${brand.description}

Bloom is a small, independent project by [${site.operator}](${site.developerUrl}). It is designed so that we can't read your
codes.

## Availability
Bloom is available now on the web. The Android app is under review on Google Play and is coming soon.

## Free to use
Bloom Authenticator is free to use. There are no ads and no paid plans.

## Contact
${md(site.contactEmail)}
`;
