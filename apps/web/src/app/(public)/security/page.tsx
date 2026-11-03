import { securityPage } from '@repo/content';
import type { Metadata } from 'next';
import { MarkdownPage } from '@/components/public/markdown-page';

export const metadata: Metadata = {
  title: 'Security',
  description:
    'How Bloom protects your 2FA vault, our threat model and how to report vulnerabilities.',
};

export default function Page() {
  return <MarkdownPage markdown={securityPage()} />;
}
