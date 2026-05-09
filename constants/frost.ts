/**
 * Frost design tokens — the locked aesthetic system.
 *
 * Single source of truth for ALL Frost surfaces. No screen, component, or
 * future session is permitted to invent colour values, font sizes, spacings,
 * timings, or button materials outside this file. Edit values here. Never inline.
 *
 * v2 update — total frost doctrine:
 *   - Every button, tile, row, panel uses FrostedSurface material
 *   - White cards are GONE from Frost (they belong to vendor app, not bride)
 *   - Frost breaks ONLY in: Muse full-bleed reveal, Discover hero carousel
 *     (until More tapped), Dream chat compose bar (which itself stays darker frost)
 */

// ─── COLOURS ──────────────────────────────────────────────────────────────────

export const FrostColors = {
  // Page material — vintage carbon (sanctuary mode)
  pageFallback:   '#9A958E',          // deep warm grey — Dream/Journey canvas BG
  frostTint:      'rgba(154,149,142,0.42)',
  frostTintHeavy: 'rgba(154,149,142,0.62)',
  desatOverlay:   'rgba(58,55,51,0.45)',

  // Frosted button / row / panel material
  buttonFrostTint:    'rgba(255,253,248,0.32)',  // sits on top of page-frost, slightly brighter
  buttonFrostHover:   'rgba(255,253,248,0.42)',  // pressed state — slightly brighter
  buttonFrostBorder:  'rgba(168,146,75,0.18)',   // gold-tinted hairline (subtle)
  composerFrostTint:  'rgba(28,24,20,0.22)',     // darker frost for Dream compose bar
  composerHairline:   'rgba(168,146,75,0.30)',

  // Type — vintage warm charcoal (was crisp near-black)
  ink:    '#2C2823',          // softened from #1A1815 — feels printed, not freshly inked
  soft:   '#5A5650',          // warmed mid-grey
  muted:  '#8C8480',
  hint:   '#5A5650',
  hairline: '#C8C3BC',

  // Sacred — polished brass (pops on warmer page) + aged brass (whispers)
  goldMuted:  '#A8924B',          // whispers — DAYS label, smaller captions
  goldTrue:   '#BFA04D',          // polished brass — pops on the warmer page

  // Utility
  white:    '#FFFFFF',
  black:    '#000000',
  scrim:    'rgba(0,0,0,0.4)',
  scrimSoft: 'rgba(0,0,0,0.22)',
} as const;

// ─── TYPOGRAPHY ───────────────────────────────────────────────────────────────

export const FrostFonts = {
  display:        'CormorantGaramond_300Light',
  displayMedium:  'CormorantGaramond_400Regular',
  displayBold:    'CormorantGaramond_600SemiBold',
  body:           'DMSans_300Light',
  bodyMedium:     'DMSans_400Regular',
  bodyBold:       'DMSans_500Medium',
  labelThin:      'Jost_200ExtraLight',
  label:          'Jost_300Light',
  labelMedium:    'Jost_400Regular',
} as const;

// ─── TYPE RAMP ────────────────────────────────────────────────────────────────

export const FrostType = {
  eyebrowSmall:  { fontFamily: FrostFonts.label, fontSize: 9,  letterSpacing: 2.4, textTransform: 'uppercase' as const, color: FrostColors.muted },
  eyebrowMedium: { fontFamily: FrostFonts.label, fontSize: 10, letterSpacing: 4,   textTransform: 'uppercase' as const, color: FrostColors.muted },
  eyebrowLarge:  { fontFamily: FrostFonts.label, fontSize: 11, letterSpacing: 4.5, textTransform: 'uppercase' as const, color: FrostColors.muted },
  bodySmall:  { fontFamily: FrostFonts.body, fontSize: 13, lineHeight: 19, color: FrostColors.soft },
  bodyMedium: { fontFamily: FrostFonts.body, fontSize: 15, lineHeight: 22, color: FrostColors.soft },
  bodyLarge:  { fontFamily: FrostFonts.body, fontSize: 17, lineHeight: 24, color: FrostColors.ink },
  displayXS: { fontFamily: FrostFonts.display, fontSize: 17, lineHeight: 24, color: FrostColors.soft, fontStyle: 'italic' as const },
  displayS:  { fontFamily: FrostFonts.display, fontSize: 20, lineHeight: 26, color: FrostColors.ink },
  displayM:  { fontFamily: FrostFonts.display, fontSize: 28, lineHeight: 32, color: FrostColors.ink },
  displayL:  { fontFamily: FrostFonts.display, fontSize: 30, lineHeight: 36, color: FrostColors.ink },
  displayXL: { fontFamily: FrostFonts.display, fontSize: 42, lineHeight: 50, color: FrostColors.goldMuted, fontStyle: 'italic' as const },
} as const;

// ─── SPACING ──────────────────────────────────────────────────────────────────

export const FrostSpace = {
  none: 0, xs: 4, s: 8, m: 12, l: 16, xl: 22, xxl: 28, xxxl: 38, huge: 48,
} as const;

export const FrostRadius = {
  none: 0, sm: 8, md: 12, box: 18, pill: 100, sheet: 24,
} as const;

// ─── ANIMATION ────────────────────────────────────────────────────────────────

export const FrostMotion = {
  pressDuration:    120,
  pressOutDuration: 180,
  longPressDelay:   420,
  revealDuration:   480,
  stackTransition:  280,
  cardOpenDuration: 280,
  cardDoneDuration: 540,
  imageFade:        800,
  imageInterval:    4500,
  idleRefresh:      60_000,
  // Discover hero carousel — slower than box rotation to feel editorial
  heroInterval:     5800,
  heroFade:         1100,
  // More overlay open/close
  moreOverlay:      320,
  // Swipe gesture threshold (Discover blind swipe)
  swipeThreshold:   80,
} as const;

// ─── FROST MATERIAL ───────────────────────────────────────────────────────────

export const FrostMaterial = {
  // Page-level frost (covers everything — landing, journey, dream)
  pageBlurWeb:      'blur(20px) saturate(105%)',
  pageBlurIOS:      45,
  pageBlurAndroid:  30,
  androidPageTint:  'rgba(154,149,142,0.55)',  // matched to vintage carbon page

  // Box-level frost (rest state of UnveilCanvas — lighter, layered on page-frost)
  boxBlurWeb:       'blur(10px)',
  boxBlurIOS:       30,
  boxBlurAndroid:   22,
  androidBoxTint:   'rgba(244,242,238,0.32)',

  // BUTTON / ROW / PANEL frost — used by FrostedSurface (NEW in v2)
  // Sits on top of page-frost. Slightly brighter/whiter than the page so
  // buttons read as tactile against the surroundings without breaking material.
  buttonBlurWeb:    'blur(14px) saturate(110%)',
  buttonBlurIOS:    35,
  buttonBlurAndroid: 26,
  androidButtonTint: 'rgba(255,253,248,0.55)',

  // COMPOSER frost — darker, used inside Dream chat compose bar
  composerBlurWeb:    'blur(28px) saturate(115%) brightness(0.94)',
  composerBlurIOS:    55,
  composerBlurAndroid: 38,
  androidComposerTint: 'rgba(245,242,235,0.78)',

  // Android experimental BlurView — true material on API 31+ (Android 12+).
  // Falls back to androidPageTint/etc translucent solids on older devices.
  androidExperimentalMethod: 'dimezisBlurView' as const,
  androidMinApi: 31,

  // Image filters (web)
  greyscaleFilter:    'grayscale(100%) contrast(0.92) brightness(1.05)',
  greyscaleBoxFilter: 'grayscale(100%) contrast(0.95) brightness(1.04)',
} as const;

// ─── LAYOUT CONSTANTS ─────────────────────────────────────────────────────────

export const FrostLayout = {
  pageSidePadding:   24,
  boxGap:            12,
  boxAspectRatio:    1.25,
  dreamBoxHeight:    180,
  journeyBarHeight:  60,
  heroBlockHeight:   320,

  // Canvas (full-bleed)
  canvasTopBarHeight:    56,
  canvasBottomBarHeight: 80,

  // Discover
  discoverHeroInterval: 5800,
  discoverMoreBtnSize:  44,    // diameter-ish for the small pill More button
} as const;

// ─── COPY POOLS ───────────────────────────────────────────────────────────────

export const FrostCopy = {
  brand: 'Frost',
  brandTagline: 'Where the bride dreams the wedding.',

  landing: {
    eyebrow: 'YOUR DAY',
    daysWord: 'days',
    journeyLabel: 'Journey',
  },

  museCanvas: {
    eyebrow: 'MUSE',
    emptyCaption: 'Your saved moments will live here.',
  },

  discoverCanvas: {
    eyebrow: 'DISCOVER · BETA',
    moreLabel: 'More',
    overlayTitle: 'How would you like to look?',
    options: {
      blindSwipe: { title: 'Blind Swipe',     sub: 'One image at a time. Right to save, left to pass.' },
      myFeed:     { title: 'My Discovery',    sub: 'Vertical for the next vendor, horizontal for more of them.' },
      couture:    { title: 'Couture',         sub: 'Atelier-only. Invitation pieces, by appointment.' },
      categories: { title: 'Categories',      sub: 'MUA, photography, decor, jewellery, and more.' },
    },
    blindSwipeEyebrow:    'DISCOVER · BLIND SWIPE',
    discoveryFeedEyebrow: 'DISCOVER · MY DISCOVERY',
    filter: {
      title: 'Filters',
      categoryLabel: 'Category',
      priceLabel: 'Budget',
      apply: 'Apply',
      reset: 'Reset',
      allCategory: 'All',
    },
    discoveryCategories: [
      { id: 'all',         label: 'All' },
      { id: 'photography', label: 'Photography' },
      { id: 'mua',         label: 'Makeup & Hair' },
      { id: 'decor',       label: 'Decor' },
      { id: 'venue',       label: 'Venue' },
      { id: 'designer',    label: 'Designer' },
      { id: 'event',       label: 'Event Mgmt' },
      { id: 'jewellery',   label: 'Jewellery' },
    ],
    priceMin: 25000,
    priceMax: 2500000,
    priceStep: 25000,
  },

  dreamCanvas: {
    eyebrow: 'DREAM',
    emptyTitle: 'Where your wedding speaks.',
    emptySub: 'Your AI and your Circle in one quiet stream.',
    inputPlaceholder: 'Tell DreamAi anything\u2026',
  },

  journeyCanvas: {
    eyebrow: 'JOURNEY',
    title: 'Take the ride.',
    sub: 'Every tool you need for your wedding lives here.',
  },

  // DreamAi idle pool
  idlePool: [
    'The light in October will be the colour of old letters.',
    'Sixty-three days. The brass band has not been booked yet.',
    'Your mother has been quiet today. That usually means she is choosing.',
    'It rained in Delhi. I hope wherever you are, the windows are open.',
    'Swati posted something. It is not about you, but you would like it.',
    'Three months until the lehenga should be in your hands. Two if you are picky.',
    'Marigolds are still under-rated. Tell me if you disagree.',
    'There is a song you have not played in a while. I noticed.',
    'Pick a colour for the morning. I will think about it with you.',
  ],
} as const;

// ─── DISCOVER HERO IMAGES — 5 paid/curated spots ─────────────────────────────
// Managed from admin at /admin/discover-heroes. These are fallbacks only —
// the native canvas fetches live from /api/v2/discover-heroes.
export const DiscoverHeroes: Array<{ uri: string; vendor?: string; caption?: string }> = [
  { uri: 'https://res.cloudinary.com/dccso5ljv/image/upload/v1778266065/IMG_2565.PNG_vua5o3.jpg', vendor: 'Hero \u00B7 Spot 1' },
  { uri: 'https://res.cloudinary.com/dccso5ljv/image/upload/v1778266049/IMG_9613_m69ddg.jpg', vendor: 'Hero \u00B7 Spot 2' },
  { uri: 'https://res.cloudinary.com/dccso5ljv/image/upload/v1776657982/pr39fasjcom3qfqlv9dd.jpg', vendor: 'Hero \u00B7 Spot 3' },
  { uri: 'https://res.cloudinary.com/dccso5ljv/image/upload/v1776349629/zzpw0ksa0cttm9gbdhqm.jpg', vendor: 'Hero \u00B7 Spot 4' },
  { uri: 'https://res.cloudinary.com/dccso5ljv/image/upload/v1775922562/Swati_bva6au.jpg', vendor: 'Hero \u00B7 Spot 5' },
];

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type FrostMessageRole = 'ai' | 'person' | 'event';

export interface FrostAILine { role: 'ai'; text: string; timestamp?: string; }
export interface FrostPersonLine { role: 'person'; name: string; avatar?: string; text?: string; action?: string; timestamp?: string; }
export interface FrostEventLine { role: 'event'; text: string; timestamp?: string; }
export type FrostMessage = FrostAILine | FrostPersonLine | FrostEventLine;

export interface FrostConfirmMutation { label: string; description?: string; }
export interface FrostConfirmPreview {
  summaryTitle: string;
  summaryLines: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  mutations: FrostConfirmMutation[];
}
