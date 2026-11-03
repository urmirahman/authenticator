import { termsOfService } from '@repo/content';
import type { Metadata } from 'next';
import { MarkdownPage } from '@/components/public/markdown-page';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms for using Bloom Authenticator.',
};

export default function Page() {
  return <MarkdownPage markdown={termsOfService()} />;
}
