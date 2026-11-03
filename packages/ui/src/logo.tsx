/**
 * Bloom logo mark as an inline React SVG (same drawing as packages/brand/assets/logo-mark.svg).
 * Inline so it needs no image loader and inherits size from props.
 */
const ANGLES = [0, 60, 120, 180, 240, 300];

export function LogoMark({
  size = 32,
  title = 'Bloom Authenticator',
}: {
  size?: number;
  title?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" role="img" aria-label={title}>
      <defs>
        <linearGradient id="bloom-petal-ui" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fb7195" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      {ANGLES.map((a) => (
        <ellipse
          key={a}
          cx="64"
          cy="31"
          rx="13"
          ry="21"
          transform={`rotate(${a} 64 64)`}
          fill="url(#bloom-petal-ui)"
          opacity="0.92"
        />
      ))}
      <circle cx="64" cy="64" r="24" fill="#fff" />
      <circle
        cx="64"
        cy="64"
        r="15"
        fill="none"
        stroke="#dc2560"
        strokeOpacity="0.25"
        strokeWidth="5"
      />
      <circle
        cx="64"
        cy="64"
        r="15"
        fill="none"
        stroke="#dc2560"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="66 94.25"
        transform="rotate(-90 64 64)"
      />
      <circle cx="64" cy="64" r="3.5" fill="#17151a" />
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
