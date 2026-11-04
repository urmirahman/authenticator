import type { ReactNode } from 'react';
import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';

/** Layout for marketing, legal and help pages (route group: no effect on URLs). */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    // "Meadow" colours (globals.css) apply to marketing/legal pages only; the app keeps rose.
    <div className="theme-meadow flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
