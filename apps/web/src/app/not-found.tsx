import { LogoMark } from '@repo/ui/logo';
import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      id="main"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <LogoMark size={64} />
      <h1 className="text-3xl font-bold">This page didn&apos;t bloom</h1>
      <p className="text-muted">We couldn&apos;t find what you were looking for.</p>
      <div className="flex gap-3">
        <Link href="/" className="rounded-md bg-accent px-4 py-2 font-semibold text-accent-fg">
          Home
        </Link>
        <Link href="/help" className="rounded-md px-4 py-2 font-semibold ring-1 ring-line">
          Help
        </Link>
      </div>
    </main>
  );
}
