export const Colors = {
  background: '#F8F7F5',
  card: '#FFFFFF',
  gold: '#C9A84C',
  ink: '#0C0A09',
  muted: '#8C8480',
  border: '#E2DED8',
  dark: '#111111',
  error: '#C0392B',
  success: '#27AE60',
} as const;

export const Fonts = {
  display: 'CormorantGaramond_300Light',
  displaySemiBold: 'CormorantGaramond_600SemiBold',
  body: 'DMSans_300Light',
  bodyMedium: 'DMSans_500Medium',
  label: 'DMSans_400Regular',
} as const;

export const Radius = {
  card: 14,
  pill: 100,
  sheet: 20,
  input: 8,
} as const;

export const RAILWAY_URL =
  process.env.EXPO_PUBLIC_RAILWAY_URL ??
  'https://dream-wedding-production-89ae.up.railway.app';
