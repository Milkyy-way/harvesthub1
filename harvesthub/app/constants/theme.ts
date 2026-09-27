// Palette deepened for the Home redesign (Checkpoint 9) — primary/accent
// are richer versions of the original tokens, not new ones, so every
// existing screen (buttons, headers) picks up the more premium look for
// free without needing its own edit. primaryMid is new — used for gradient
// midpoints (hero backgrounds, ring avatars) where a single flat primary
// looks too flat; berry is new — a secondary accent for variety (spotlight
// rings), used sparingly.
export const colors = {
  background: '#F6F2E7',
  surface: '#FFFFFF',
  primary: '#2F4F3B',
  primaryMid: '#3E6B4C',
  primaryDark: '#1E3324',
  accent: '#D9A441',
  berry: '#8C3A3F',
  text: '#23291F',
  textMuted: '#767C6A',
  border: '#E7E2D3',
  danger: '#B3453A',
  white: '#FFFFFF',
} as const;

// 'Newsreader'/'Manrope' loaded via @expo-google-fonts in app/_layout.tsx.
// Headline = serif display (Home hero, section titles, card names);
// everything else stays on the system font — Manrope is reserved for a
// few brand-forward UI moments (wordmark), not a full body-font swap.
export const fonts = {
  headline: 'Newsreader_600SemiBold',
  headlineBold: 'Newsreader_700Bold',
  brand: 'Manrope_800ExtraBold',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;
