import { dark, light, type ColorScheme } from '@repo/brand';
import { useColorScheme } from 'react-native';

/**
 * Light/dark palette from the shared Bloom tokens (@repo/brand), plus short aliases the screens use.
 * The theme preference overrides the system scheme (see preferences.tsx).
 */
export type Colors = ColorScheme & { card: string; muted: string };

const withAliases = (s: ColorScheme): Colors => ({ ...s, card: s.surface, muted: s.textMuted });
const LIGHT = withAliases(light);
const DARK = withAliases(dark);

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? DARK : LIGHT;
}

export { radius, space, font } from '@repo/brand';
