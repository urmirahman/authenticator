export interface CountdownRingProps {
  /** Seconds left in the current TOTP period. */
  remaining: number;
  period: number;
  size?: number;
}

/**
 * Small SVG ring that drains as the TOTP code gets closer to expiring. Colors come from the Bloom
 * CSS variables (packages/brand/tokens.css), so it follows light/dark automatically.
 */
export function CountdownRing({ remaining, period, size = 28 }: CountdownRingProps) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - remaining / period);
  return (
    <svg width={size} height={size} role="img" aria-label={`${remaining} seconds left`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--bloom-border)"
        strokeWidth={3}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={remaining <= 5 ? 'var(--bloom-danger)' : 'var(--bloom-accent)'}
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-1000 motion-safe:ease-linear"
      />
    </svg>
  );
}
