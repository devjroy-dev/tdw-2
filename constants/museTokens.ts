/**
 * museTokens.ts
 *
 * Two visual looks for the Muse canvas: E1 (dark mosaic) and E3 (light mosaic).
 * Triggered by the bride's home mode selection (AsyncStorage @frost.home_mode):
 *   - home_mode === 'E1'  →  E1 Muse
 *   - anything else       →  E3 Muse  (default fallback)
 *
 * Token values come verbatim from app/(frost)/landing.tsx mode descriptors,
 * so home and Muse stay tonally locked. Do not drift these without also
 * updating landing.tsx — single source of truth for the two looks lives there.
 */
export type MuseLook = 'E1' | 'E3';

export interface MuseLookTokens {
  pagePaper:    string;  // canvas background
  cardFill:     string;  // tile fallback fill (when image fails)
  stampFill:    string;  // secondary surface (overlay panels)
  hairline:     string;  // soft separator
  ink:          string;  // primary type colour
  soft:         string;  // secondary type colour
  brass:        string;  // polished brass — primary affordances
  brassMuted:   string;  // aged brass — whispers (eyebrow)
  pillSecondaryBg:     string;  // More + Edit fill
  pillSecondaryBorder: string;  // More + Edit hairline
  pillSecondaryText:   string;  // More + Edit text
  closeColor:          string;  // X button
  scrimGradient:       [string, string];  // tap-reveal gradient (transparent → dark)
  tileAspect:   number;  // height ÷ width per tile
  statusBarStyle: 'dark-content' | 'light-content';
}

export const MUSE_LOOKS: Record<MuseLook, MuseLookTokens> = {
  E1: {
    pagePaper:    '#1B1612',
    cardFill:     '#2D2620',
    stampFill:    '#2D2620',
    hairline:     'rgba(191,160,77,0.18)',
    ink:          '#F5F0E8',
    soft:         'rgba(245,240,232,0.62)',
    brass:        '#BFA04D',
    brassMuted:   '#A8924B',
    pillSecondaryBg:     'rgba(245,240,232,0.06)',
    pillSecondaryBorder: 'rgba(191,160,77,0.32)',
    pillSecondaryText:   'rgba(245,240,232,0.92)',
    closeColor:          'rgba(245,240,232,0.8)',
    scrimGradient:       ['rgba(15,12,10,0)', 'rgba(15,12,10,0.78)'],
    tileAspect:   1.18,
    statusBarStyle: 'light-content',
  },
  E3: {
    pagePaper:    '#D8D3CC',
    cardFill:     '#C8C2BA',
    stampFill:    '#C8C2BA',
    hairline:     'rgba(44,40,35,0.12)',
    ink:          '#2C2823',
    soft:         '#5A5650',
    brass:        '#BFA04D',
    brassMuted:   '#A8924B',
    pillSecondaryBg:     'transparent',
    pillSecondaryBorder: 'rgba(44,40,35,0.22)',
    pillSecondaryText:   '#2C2823',
    closeColor:          '#5A5650',
    scrimGradient:       ['rgba(0,0,0,0)', 'rgba(0,0,0,0.55)'],
    tileAspect:   1.08,
    statusBarStyle: 'dark-content',
  },
};

/** AsyncStorage key — must match landing.tsx MODE_STORAGE_KEY. */
export const MODE_STORAGE_KEY = '@frost.home_mode';

/** Map the bride's home mode to a Muse look. E1 home → E1 Muse. Else E3. */
export function muselookFromHomeMode(homeMode: string | null | undefined): MuseLook {
  return homeMode === 'E1' ? 'E1' : 'E3';
}
