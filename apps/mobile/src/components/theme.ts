import { useColorScheme } from 'react-native';

/** Light/dark palette. The theme preference sets the app's color scheme (see preferences.tsx). */
const light = {
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#cbd5e1',
  accent: '#4f46e5',
};
const dark = {
  bg: '#020617',
  card: '#0f172a',
  text: '#f1f5f9',
  muted: '#94a3b8',
  border: '#334155',
  accent: '#818cf8',
};

export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === 'dark' ? dark : light;
}
