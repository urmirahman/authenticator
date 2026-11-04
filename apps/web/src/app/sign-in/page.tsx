import { legalLinks } from '@repo/content';
import { Logo } from '@repo/ui/logo';
import type { Metadata } from 'next';
import Link from 'next/link';
import { SignInCard } from '@/features/auth/sign-in-card';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <main
      id="main"
      className="theme-meadow relative isolate flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden p-6"
    >
      <div aria-hidden className="meadow-glow absolute inset-0 -z-10 blur-2xl" />
      <Link href="/" aria-label="Bloom home">
        <Logo size={36} />
      </Link>
      <SignInCard />
      <p className="max-w-sm text-center text-xs text-muted">
        By continuing you agree to the{' '}
        <Link className="underline" href="/terms">
          Terms
        </Link>{' '}
        and{' '}
        <Link className="underline" href="/privacy">
          Privacy Policy
        </Link>
        .
      </p>
      <nav aria-label="Legal" className="flex gap-4 text-xs text-muted">
        {legalLinks.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-fg">
            {l.label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
