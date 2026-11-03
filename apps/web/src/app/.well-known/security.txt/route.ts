import { securityTxt } from '@repo/content';

/** RFC 9116 security.txt, with Expires always ~1 year ahead of the build. */
export const dynamic = 'force-static';

export function GET() {
  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);
  return new Response(securityTxt(expires), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
