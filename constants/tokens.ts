export const Colors = {
  background: '#F8F7F5',
  card:       '#FFFFFF',
  warm:       '#F4F1EC',   // secondary surfaces — tags, pills, avatar bg
  gold:       '#C9A84C',
  ink:        '#0C0A09',
  dark:       '#111111',
  muted:      '#8C8480',
  dim:        '#555250',   // slightly lighter than muted — used in PWA eyebrows
  border:     '#E2DED8',
  error:      '#C0392B',
  success:    '#27AE60',
} as const;

export const Fonts = {
  // Cormorant Garamond — display, hero text
  display:        'CormorantGaramond_300Light',
  displayMedium:  'CormorantGaramond_400Regular',
  displayBold:    'CormorantGaramond_600SemiBold',

  // DM Sans — body text
  body:           'DMSans_300Light',
  bodyMedium:     'DMSans_400Regular',
  bodyBold:       'DMSans_500Medium',

  // Jost — labels, eyebrows, tags, buttons, pills
  // PWA fontWeight 200 → Jost_200ExtraLight
  // PWA fontWeight 300 → Jost_300Light
  // PWA fontWeight 400 → Jost_400Regular
  labelThin:      'Jost_200ExtraLight',   // section labels, eyebrows (PWA fw:200)
  label:          'Jost_300Light',         // chips, tags, secondary (PWA fw:300)
  labelMedium:    'Jost_400Regular',       // buttons, active states (PWA fw:400)
} as const;

// letterSpacing — converted from PWA em values at 9px base
// 0.12em = 1.08 ≈ 1   | chips, cancel buttons
// 0.15em = 1.35 ≈ 1.4 | field labels, CTAs
// 0.18em = 1.62 ≈ 1.6 | button labels
// 0.2em  = 1.8  ≈ 1.8 | quick actions, section labels
// 0.22em = 1.98 ≈ 2   | money labels, form labels
// 0.25em = 2.25 ≈ 2.2 | page eyebrows (most prominent)
export const LetterSpacing = {
  tight:    1,
  normal:   1.4,
  medium:   1.6,
  wide:     1.8,
  wider:    2,
  widest:   2.2,
} as const;

export const Radius = {
  card:  14,
  pill:  100,
  sheet: 20,
  input: 10,
} as const;

export const RAILWAY_URL =
  process.env.EXPO_PUBLIC_RAILWAY_URL ??
  'https://dream-wedding-production-89ae.up.railway.app';
