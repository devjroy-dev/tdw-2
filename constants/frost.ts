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
  // Page material
  pageFallback:   '#E8E5E0',
  frostTint:      'rgba(244,242,238,0.42)',
  frostTintHeavy: 'rgba(244,242,238,0.62)',
  desatOverlay:   'rgba(58,55,51,0.45)',

  // Frosted button / row / panel material
  buttonFrostTint:    'rgba(255,253,248,0.32)',  // sits on top of page-frost, slightly brighter
  buttonFrostHover:   'rgba(255,253,248,0.42)',  // pressed state — slightly brighter
  buttonFrostBorder:  'rgba(168,146,75,0.18)',   // gold-tinted hairline (subtle)
  composerFrostTint:  'rgba(28,24,20,0.22)',     // darker frost for Dream compose bar
  composerHairline:   'rgba(168,146,75,0.30)',

  // Type
  ink:    '#1A1815',
  soft:   '#3A3733',
  muted:  '#8C8480',
  hint:   '#5A5650',
  hairline: '#C8C3BC',

  // Sacred
  goldMuted:  '#A8924B',
  goldTrue:   '#C9A84C',

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
  androidPageTint:  'rgba(244,242,238,0.62)',

  // Box-level frost (rest state of UnveilCanvas — lighter, layered on page-frost)
  boxBlurWeb:       'blur(10px)',
  boxBlurIOS:       30,
  androidBoxTint:   'rgba(244,242,238,0.32)',

  // BUTTON / ROW / PANEL frost — used by FrostedSurface (NEW in v2)
  // Sits on top of page-frost. Slightly brighter/whiter than the page so
  // buttons read as tactile against the surroundings without breaking material.
  buttonBlurWeb:    'blur(14px) saturate(110%)',
  buttonBlurIOS:    35,
  androidButtonTint: 'rgba(255,253,248,0.55)',

  // COMPOSER frost — darker, used inside Dream chat compose bar
  composerBlurWeb:    'blur(28px) saturate(115%) brightness(0.94)',
  composerBlurIOS:    55,
  androidComposerTint: 'rgba(245,242,235,0.78)',

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
    eyebrow: 'DISCOVER \u00B7 BETA',
    moreLabel: 'More',
    overlayTitle: 'How would you like to look?',
    options: {
      blindSwipe: { title: 'Blind Swipe', sub: 'One vendor at a time. Vertical for the next, horizontal for more of them.' },
      myFeed:     { title: 'My Feed',     sub: 'Scroll through everyone we have curated for you.' },
      couture:    { title: 'Couture',     sub: 'Atelier-only. Invitation pieces, by appointment.' },
      categories: { title: 'Categories',  sub: 'MUA, photography, decor, jewellery, and more.' },
    },
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
// First five are paid placements managed by Dev/Swati from admin.
// Replace these URIs with real curated content via admin in production.
export const DiscoverHeroes: Array<{ uri: string; vendor?: string; caption?: string }> = [
  { uri: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=90&auto=format&fit=crop', vendor: 'Hero \u00B7 Spot 1' },
  { uri: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1600&q=90&auto=format&fit=crop', vendor: 'Hero \u00B7 Spot 2' },
  { uri: 'https://images.unsplash.com/photo-1583394293214-28a4b0843b1d?w=1600&q=90&auto=format&fit=crop', vendor: 'Hero \u00B7 Spot 3' },
  { uri: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1600&q=90&auto=format&fit=crop', vendor: 'Hero \u00B7 Spot 4' },
  { uri: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1600&q=90&auto=format&fit=crop', vendor: 'Hero \u00B7 Spot 5' },
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
