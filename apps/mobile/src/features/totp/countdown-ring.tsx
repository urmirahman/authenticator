import Svg, { Circle } from 'react-native-svg';

export function CountdownRing({
  remaining,
  period,
  size = 28,
}: {
  remaining: number;
  period: number;
  size?: number;
}) {
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={3} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={remaining <= 5 ? '#ef4444' : '#6366f1'}
        strokeWidth={3}
        fill="none"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - remaining / period)}
        rotation={-90}
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}
