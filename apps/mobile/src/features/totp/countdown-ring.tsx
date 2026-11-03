import { useColors } from '@/components/theme';
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
  const colors = useColors();
  const r = size / 2 - 3;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} accessibilityLabel={`${remaining} seconds left`}>
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={colors.border}
        strokeWidth={3}
        fill="none"
      />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={remaining <= 5 ? colors.danger : colors.accent}
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
