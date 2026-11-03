import { cookiePolicy } from '@repo/content';
import type { Metadata } from 'next';
import { MarkdownPage } from '@/components/public/markdown-page';

export const metadata: Metadata = {
  title: 'Cookie & storage notice',
  description: 'Bloom uses no tracking cookies; only strictly necessary browser storage.',
};

export default function Page() {
  return <MarkdownPage markdown={cookiePolicy()} />;
}
