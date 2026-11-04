import { brand } from '@repo/brand';
import { md, site } from './site';

export const aboutPage = () => `# About ${brand.name}

${brand.description}

Bloom is a small, independent project by ${md(site.operator)}. It is designed so that we can't read your
codes, and the code is open for anyone to inspect: ${site.repoUrl}.

## Built with open source
| Project | Used for | License |
| --- | --- | --- |
| [Next.js](https://nextjs.org), React | Web app | MIT |
| [Expo](https://expo.dev), React Native | Mobile apps | MIT |
| [@noble/hashes, @noble/ciphers](https://paulmillr.com/noble/) | Argon2id, HMAC, XChaCha20-Poly1305 | MIT |
| [Go](https://go.dev), [chi](https://go-chi.io), [pgx](https://github.com/jackc/pgx) | API server | BSD-3 / MIT |
| [PostgreSQL](https://www.postgresql.org) | Database | PostgreSQL License |
| [go-webauthn](https://github.com/go-webauthn/webauthn) | Passkeys | BSD-3 |
| [jsQR](https://github.com/cozmo/jsQR), [qrcode](https://github.com/soldair/node-qrcode) | Reading / drawing QR codes | Apache-2.0 / MIT |
| [Tailwind CSS](https://tailwindcss.com) | Styling | MIT |
| Simple Icons (brand colors) | Issuer colors | CC0 |

Full dependency licenses are listed in each package's \`node_modules\` and \`go.mod\`, and the full list with versions is in the repository's lockfiles.

## Contact
${md(site.contactEmail)}
`;
