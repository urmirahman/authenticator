import { legalLinks } from '@repo/content';
import { LogoMark } from '@repo/ui/logo';
import Link from 'next/link';

export function PublicFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark size={22} />
          <span>© {new Date().getFullYear()} Bloom Authenticator</span>
        </div>
        <nav aria-label="Legal and help" className="flex flex-wrap gap-x-5 gap-y-2 sm:ml-auto">
          {legalLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
