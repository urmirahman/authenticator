# Bloom Authenticator — brand

**Name:** Bloom Authenticator (short: **Bloom**; code/slugs: `bloom`). Repo, package scopes and bundle id
`dev.urmirahman.authenticator` stay unchanged (OAuth clients depend on them).

**Idea:** a six-petal flower around a countdown ring. Petals = your accounts opening up; the ring = the
30-second TOTP timer; the white core reads as a lock/keyhole.

## Logo files (`packages/brand/assets`)

| File                      | Use                                                           |
| ------------------------- | ------------------------------------------------------------- |
| `logo-mark.svg`           | Default mark (favicons, headers, avatars)                     |
| `wordmark.svg`            | Mark + "Bloom AUTHENTICATOR" (text uses `currentColor`)       |
| `logo-mono.svg`           | One color (`currentColor`), for print / single-color contexts |
| `app-icon.svg`            | 1024² app icon on rose-50 background                          |
| `adaptive-foreground.svg` | Android adaptive icon / splash (transparent, safe-zone sized) |

PNG exports: `pnpm -F @repo/brand export-icons` (sharp) writes web favicons/PWA icons/OG image and Expo icon/splash.
Rules: keep clear space ≥ one petal width; don't recolor petals except the mono version; minimum size 16 px (mark) / 120 px (wordmark).
The art is an original placeholder; a designer polish pass is welcome before launch.

## Palette (`packages/brand/src/tokens.ts`, mirrored in `tokens.css`)

- **Rose (accent):** 600 `#dc2560` on light, 400 `#fb7195` on dark. Soft backgrounds: rose-50 / `#2a1520`.
- **Violet:** `#8b5cf6`, only in the logo gradient and small highlights.
- **Ink (neutrals):** off-white `#faf8f7` → charcoal `#17151a` / `#0f0d11`.
- **Semantic:** success `#15803d`, warning `#b45309`, danger `#dc2626` (lighter variants in dark mode).
  Contrast is unit-tested (WCAG AA: body ≥ 7:1, muted and accent ≥ 4.5:1).

## Typography

Rounded system sans (`ui-rounded`, SF Pro Rounded, Nunito fallback) for UI; tabular monospace for codes.
Scale: 12 / 14 / 16 / 18 / 22 / 28 / 44.

## Shape and spacing

Radius 8 / 12 / 16 / 24 (cards 16, buttons 12, pills full). Spacing on a 4-pt grid (4, 8, 12, 16, 24, 32, 48).

## Using tokens

- **Web:** `@import '@repo/brand/tokens.css'` → Tailwind classes `bg-bg`, `bg-surface`, `text-fg`, `text-muted`,
  `border-line`, `bg-accent`, `text-accent`, `bg-accent-soft`, `rose-*`, `ink-*`. Dark mode via `.dark` on `<html>`.
- **Mobile:** `import { light, dark, space, radius, font } from '@repo/brand'` (see `apps/mobile/src/components/theme.ts`).

## Voice

Calm, plain, honest. Explain security in everyday words, never overclaim ("we can't read your codes" — true;
no "military-grade", no certifications we don't hold). Short sentences, second person, no fear-mongering.

## Mobile UI (cozy)

- **Feel:** minimal and warm. Off-white paper (`ink-50`) in light, deep charcoal (`ink-950`) in dark; one rose accent, violet only in gradients (avatar, logo).
- **Shape:** cards use radius 24 (xl) with a hairline border, buttons radius 16, pills fully round. Generous padding (20–24) and 24 between sections.
- **Lists:** settings-style groups with a small uppercase title, icon bubbles (accent on `accentSoft`), chevrons for navigation and ↗ for web pages.
- **Codes:** large monospace digits in the accent color, grouped 3-3 (4-4 for 8 digits), turning red in the last 5 seconds; countdown ring with seconds.
- **Motion:** 260 ms fade-and-rise on first appearance, soft pulse for skeletons; none of it when Reduce Motion is on. Haptics: selection tick on taps, success on copy/save, warning on a wrong password.
- **Microcopy:** short, kind, human ("Nothing blooming yet", "Welcome back", "Opening your vault…"). Never blame the user; say what to do next.

## Landing "Meadow" palette (marketing and legal pages)

Inspired by the colour mood of code-bloom.net (colours only, no logo, copy or layout). Scoped with `.theme-meadow` on the `(public)` layout in `apps/web/src/app/globals.css`; the app screens keep the rose tokens.

| Role               | Light     | Dark      |
| ------------------ | --------- | --------- |
| Background (paper) | `#f6f8f7` | `#101814` |
| Surface            | `#ffffff` | `#1c2922` |
| Surface muted      | `#edf2ef` | `#151e19` |
| Border             | `#d8ded7` | `#35463c` |
| Text               | `#0a0a0a` | `#edf5ef` |
| Muted text         | `#5b625f` | `#b6c4ba` |
| Accent (buttons)   | `#006b4d` | `#26c99b` |
| Text on accent     | `#ffffff` | `#09120e` |
| Accent soft        | `#c9f4e2` | `#254b3d` |

Extras: night band `#0a0a0a` with emerald glow `#00b386`, lime CTA `#c9f36b` with a coral `#ff806b` offset shadow, lilac `#e8d8ff` and coral blobs in the hero glow. The glow drifts slowly and stops under Reduce Motion.
