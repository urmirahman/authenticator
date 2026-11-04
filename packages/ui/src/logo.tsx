import { useId } from 'react';

/**
 * Bloom logo mark as an inline React SVG (same drawing as packages/brand/assets/logo-mark.svg):
 * a multicolour infinity loop (emerald → lime → amber → coral → rose → violet) with a padlock
 * at the crossing. The lock uses the page text colour, so it stays visible in dark mode.
 * The viewBox is cropped to the loop (wider than tall); `size` is the height.
 */
const LOOP =
  'M111.0 64.0 L110.7 69.0 L109.7 73.8 L108.1 78.2 L106.0 81.9 L103.5 85.0 L100.8 87.2 L98.0 88.7 L95.1 89.6 L92.3 89.7 L89.5 89.4 L86.8 88.6 L84.3 87.3 L81.9 85.8 L79.6 84.0 L77.4 82.0 L75.4 79.9 L73.5 77.6 L71.6 75.2 L69.9 72.8 L68.1 70.3 L66.5 67.8 L64.8 65.3 L63.2 62.7 L61.5 60.2 L59.9 57.7 L58.1 55.2 L56.4 52.8 L54.5 50.4 L52.6 48.1 L50.6 46.0 L48.4 44.0 L46.1 42.2 L43.7 40.7 L41.2 39.4 L38.5 38.6 L35.7 38.3 L32.9 38.4 L30.0 39.3 L27.2 40.8 L24.5 43.0 L22.0 46.1 L19.9 49.8 L18.3 54.2 L17.3 59.0 L17.0 64.0 L17.3 69.0 L18.3 73.8 L19.9 78.2 L22.0 81.9 L24.5 85.0 L27.2 87.2 L30.0 88.7 L32.9 89.6 L35.7 89.7 L38.5 89.4 L41.2 88.6 L43.7 87.3 L46.1 85.8 L48.4 84.0 L50.6 82.0 L52.6 79.9 L54.5 77.6 L56.4 75.2 L58.1 72.8 L59.9 70.3 L61.5 67.8 L63.2 65.3 L64.8 62.7 L66.5 60.2 L68.1 57.7 L69.9 55.2 L71.6 52.8 L73.5 50.4 L75.4 48.1 L77.4 46.0 L79.6 44.0 L81.9 42.2 L84.3 40.7 L86.8 39.4 L89.5 38.6 L92.3 38.3 L95.1 38.4 L98.0 39.3 L100.8 40.8 L103.5 43.0 L106.0 46.1 L108.1 49.8 L109.7 54.2 L110.7 59.0 L111.0 64.0 Z';
const SHACKLE = 'M58 63 V58.5 A6 6 0 0 1 70 58.5 V63';

export function LogoMark({
  size = 32,
  title = 'Bloom Authenticator',
}: {
  size?: number;
  title?: string;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      width={(size * 112) / 72}
      height={size}
      viewBox="8 28 112 72"
      role="img"
      aria-label={title}
    >
      <defs>
        <linearGradient id={`${id}f`} x1="14" y1="0" x2="114" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00a775" />
          <stop offset="0.3" stopColor="#7fcf5a" />
          <stop offset="0.46" stopColor="#f5b94a" />
          <stop offset="0.6" stopColor="#ff806b" />
          <stop offset="0.76" stopColor="#f04473" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <mask id={`${id}c`} maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128">
          <rect width="128" height="128" fill="#fff" />
          <path d={SHACKLE} fill="none" stroke="#000" strokeWidth="11" strokeLinecap="round" />
          <rect x="51" y="59" width="26" height="24" rx="7" fill="#000" />
        </mask>
        <mask id={`${id}h`} maskUnits="userSpaceOnUse" x="0" y="0" width="128" height="128">
          <rect width="128" height="128" fill="#fff" />
          <circle cx="64" cy="69.5" r="2.6" fill="#000" />
          <rect x="62.7" y="70" width="2.6" height="5.6" rx="1.3" fill="#000" />
        </mask>
      </defs>
      <path
        d={LOOP}
        fill="none"
        stroke={`url(#${id}f)`}
        strokeWidth="12"
        strokeLinejoin="round"
        mask={`url(#${id}c)`}
      />
      <g style={{ color: 'var(--bloom-text, #17151a)' }}>
        <path
          d={SHACKLE}
          fill="none"
          stroke="currentColor"
          strokeWidth="4.2"
          strokeLinecap="round"
        />
        <rect
          x="54.5"
          y="62.5"
          width="19"
          height="17"
          rx="4.5"
          fill="currentColor"
          mask={`url(#${id}h)`}
        />
      </g>
    </svg>
  );
}

/** Mark + "Bloom" wordmark for headers. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-bold tracking-tight text-fg">
      <LogoMark size={size} />
      <span className="text-lg">Bloom</span>
    </span>
  );
}
