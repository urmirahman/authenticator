import { faqs, site, isTodo } from '@repo/content';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Help & FAQ',
  description: 'Answers to common questions about Bloom Authenticator.',
};

export default function HelpPage() {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Help &amp; FAQ</h1>
      <p className="mt-2 text-muted">Quick answers. Still stuck? Write to us.</p>
      <div className="mt-8 divide-y divide-line rounded-lg bg-surface ring-1 ring-line">
        {faqs.map((f) => (
          <details key={f.q} className="group p-5">
            <summary className="cursor-pointer font-semibold">{f.q}</summary>
            <p className="mt-2 text-muted">{f.a}</p>
          </details>
        ))}
      </div>
      <section className="mt-10 rounded-lg bg-accent-soft p-5 text-sm">
        <h2 className="font-semibold">Contact support</h2>
        <p className="mt-1">
          {isTodo(site.contactEmail) ? (
            <mark className="rounded bg-warning/20 px-1">{site.contactEmail}</mark>
          ) : (
            <a className="text-accent underline" href={`mailto:${site.contactEmail}`}>
              {site.contactEmail}
            </a>
          )}
        </p>
        <p className="mt-3">
          Found a security issue? See{' '}
          <Link className="text-accent underline" href="/security">
            responsible disclosure
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
