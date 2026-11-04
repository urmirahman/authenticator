import { legalLinks, site } from '@repo/content';
import { LogoMark } from '@repo/ui/logo';
import Link from 'next/link';

export function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-2">
          <LogoMark size={22} />
          <span>Bloom Authenticator</span>
        </div>
        <nav aria-label="Legal and help" className="flex flex-wrap gap-x-5 gap-y-2 sm:ml-auto">
          {legalLinks.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-fg">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Developed with{' '}
            <span aria-label="love" role="img" className="text-rose-500">
              ♥
            </span>{' '}
            by{' '}
            <a
              href={site.developerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:text-fg hover:underline"
            >
              {site.operator}
            </a>
          </p>
          <p>
            © {year}{' '}
            <a
              href={site.companyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 hover:text-fg hover:underline"
            >
              {site.company}
            </a>
            . All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
