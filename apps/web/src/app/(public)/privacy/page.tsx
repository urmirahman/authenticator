import { privacyPolicy } from '@repo/content';
import type { Metadata } from 'next';
import { MarkdownPage } from '@/components/public/markdown-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Bloom handles your data: end-to-end encrypted vault, minimal account data, no trackers.',
};

export default function Page() {
  return <MarkdownPage markdown={privacyPolicy()} />;
}
