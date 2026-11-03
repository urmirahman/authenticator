import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dark, ink, light, rose } from './tokens';

const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8').toLowerCase();

/** WCAG relative luminance contrast ratio. */
function contrast(a: string, b: string) {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

describe('tokens', () => {
  it('css mirrors every palette and scheme color', () => {
    for (const v of [
      ...Object.values(rose),
      ...Object.values(ink),
      ...Object.values(light),
      ...Object.values(dark),
    ]) {
      expect(css).toContain(v.toLowerCase());
    }
  });

  it.each([
    ['light', light],
    ['dark', dark],
  ] as const)('%s scheme meets WCAG AA contrast', (_, s) => {
    expect(contrast(s.text, s.bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(s.textMuted, s.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(s.accent, s.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(s.accentText, s.accent)).toBeGreaterThanOrEqual(4.5);
  });
});
