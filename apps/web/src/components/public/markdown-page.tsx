import { marked } from 'marked';

/**
 * Renders long-form content (legal, security, about) from @repo/content at build time.
 * The markdown is our own trusted content (not user input), so rendering its HTML is safe.
 */
export function MarkdownPage({ markdown }: { markdown: string }) {
  const html = marked.parse(markdown, { async: false });
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <article className="prose-bloom" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
