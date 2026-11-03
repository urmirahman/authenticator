/**
 * Bloom design tokens, shared by web (CSS variables in tokens.css) and mobile (theme object).
 * Keep tokens.css in sync: tokens.test.ts checks every color here appears there.
 */

/** Rose "bloom" accent scale. 600 is the main accent on light, 400 on dark (contrast >= 4.5:1 for text). */
export const rose = {
  50: '#fff1f4',
  100: '#ffe4ea',
  200: '#fecdd9',
  300: '#fda4b9',
  400: '#fb7195',
  500: '#f04473',
  600: '#dc2560',
  700: '#b9184f',
  800: '#9a1747',
  900: '#831843',
} as const;

/** Secondary accent used only in the logo gradient and highlights. */
export const violet = { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' } as const;

/** Warm neutrals: off-white paper for light, deep charcoal for dark. */
export const ink = {
  0: '#ffffff',
  50: '#faf8f7',
  100: '#f3f0ee',
  200: '#e7e2df',
  300: '#d3ccc8',
  400: '#a39b97',
  500: '#78716c',
  600: '#57524f',
  700: '#3a3638',
  800: '#242126',
  900: '#17151a',
  950: '#0f0d11',
} as const;

export const semantic = {
  success: '#15803d',
  warning: '#b45309',
  danger: '#dc2626',
} as const;

export interface ColorScheme {
  bg: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  danger: string;
  success: string;
  warning: string;
}

export const light: ColorScheme = {
  bg: ink[50],
  surface: ink[0],
  surfaceMuted: ink[100],
  border: ink[200],
  text: ink[900],
  textMuted: ink[500],
  accent: rose[600],
  accentText: ink[0],
  accentSoft: rose[50],
  danger: semantic.danger,
  success: semantic.success,
  warning: semantic.warning,
};

export const dark: ColorScheme = {
  bg: ink[950],
  surface: ink[900],
  surfaceMuted: ink[800],
  border: ink[700],
  text: ink[50],
  textMuted: ink[400],
  accent: rose[400],
  accentText: ink[950],
  accentSoft: '#2a1520',
  danger: '#f87171',
  success: '#4ade80',
  warning: '#fbbf24',
};

/** 4-pt spacing scale (px / dp). */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;

/** Corner radius. Cards use lg, buttons md, pills full. */
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

/** Type scale (px / dp) and families. Codes use a tabular monospace. */
export const font = {
  sans: "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif",
  mono: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace",
  size: { xs: 12, sm: 14, md: 16, lg: 18, xl: 22, xxl: 28, display: 44 },
} as const;

export const brand = {
  name: 'Bloom Authenticator',
  shortName: 'Bloom',
  slug: 'bloom',
  tagline: 'Two-factor codes that bloom on your devices — encrypted end to end.',
  description:
    'Bloom Authenticator keeps your 2FA codes in an end-to-end encrypted vault that syncs across web, iPhone and Android. Only you can unlock it.',
} as const;
