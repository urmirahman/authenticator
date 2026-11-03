import { aboutPage } from '@repo/content';
import type { Metadata } from 'next';
import { MarkdownPage } from '@/components/public/markdown-page';

export const metadata: Metadata = {
  title: 'About & open source',
  description: 'About Bloom Authenticator and the open-source projects it uses.',
};

export default function Page() {
  return <MarkdownPage markdown={aboutPage()} />;
}
