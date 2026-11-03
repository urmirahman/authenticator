/** "just now", "5 min ago", "3 h ago", "2 days ago", else a short date. */
export function timeAgo(t: number | string | null | undefined, now = Date.now()): string {
  if (t === null || t === undefined) return 'Not yet';
  const ms = now - new Date(t).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  return new Date(t).toLocaleDateString();
}

export const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
