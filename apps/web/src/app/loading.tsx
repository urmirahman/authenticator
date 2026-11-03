/** Route-level loading state (shown while a page's code loads). */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50dvh] items-center justify-center"
    >
      <span className="size-8 animate-spin rounded-full border-4 border-accent/30 border-t-accent motion-reduce:animate-none" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
