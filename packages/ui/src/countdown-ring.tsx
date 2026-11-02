export interface CountdownRingProps {
  /** Seconds left in the current TOTP period. */
  remaining: number;
  period: number;
  size?: number;
}

/** Small SVG ring that drains as the TOTP code gets closer to expiring. */
export function CountdownRing({ remaining, period, size = 28 }: CountdownRingProps) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - remaining / period);
  return (
    <svg width={size} height={size} aria-label={`${remaining}s left`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={3} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={remaining <= 5 ? '#ef4444' : '#6366f1'}
        strokeWidth={3}
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
