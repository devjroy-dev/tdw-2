/**
 * Frost — Landing (v3 — final mockup, locked).
 *
 * Composition:
 *   - Light grey paper page (Layer 1, flat colour, no full-bleed photo)
 *   - Two greyscale image boxes side by side (gold dot, no label)
 *   - Wide Dream AI card (gold "Dream Ai" eyebrow + 2 italic Cormorant lines)
 *   - Journey button at the foot (gold italic "Journey", darker container)
 *   - Single frost pane covering everything (Layer 3)
 *   - Text on top of frost (Layer 4) — sharp where it counts, soft where it should be
 *
 * Image rule:
 *   - On every home-screen entry (mount + focus return), refresh both images
 *   - Muse box: random pick from bride's moodboard_items
 *   - Discover box: random pick from active discover_heroes
 *   - Empty Muse → fall back to a different hero than Discover got
 *   - Anti-collision: never render the same URL in both boxes
 *   - All handled server-side by /api/v2/frost/home-images/:userId
 *
 * Greyscale (Path 1):
 *   - Native: react-native-color-matrix-image-filters <Grayscale amount={1}>
 *   - Web: CSS filter: grayscale(100%)
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image, Platform, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Grayscale } from 'react-native-color-matrix-image-filters';
import {
  FrostColors, FrostFonts, FrostMaterial, FrostCopy,
} from '../../constants/frost';
import { brideIdle, fetchHomeImages } from '../../services/frostApi';

// ─── Wedding date — wired to user profile in v1.7 ──────────────────────────
const WEDDING_DATE = new Date('2026-09-25T00:00:00+05:30');

// Android API 31+ supports experimental dimezis BlurView (true material blur).
const ANDROID_BLUR_SUPPORTED =
  Platform.OS === 'android' &&
  typeof Platform.Version === 'number' &&
  (Platform.Version as number) >= FrostMaterial.androidMinApi;

// ─── v3 design tokens (locked) ─────────────────────────────────────────────
const PAGE_GREY        = '#E2DFDA';
const CARD_FILL        = '#ECE9E4';
const STAMP_FILL       = '#CFCBC5';
const HAIRLINE         = '#B5B1AC';
const HAIRLINE_STRONG  = '#A39E97';
const INK_TEXT         = '#1A1815';
const SOFT_TEXT        = '#3A3733';
const GOLD             = '#B89A4F';
const GOLD_BRIGHT      = '#C9A84C';
const FROST_TINT       = 'rgba(225,222,217,0.18)';

// ─── Static fallback line picker ──────────────────────────────────────────
function pickFallbackLines(): [string, string] {
  const hour = new Date().getHours();
  const pool = FrostCopy.idlePool;
  return [pool[hour % pool.length], pool[(hour + 4) % pool.length]];
}

// ─── Date helpers ─────────────────────────────────────────────────────────
function dayNumberToWords(n: number): string {
  const ones = ['', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth',
    'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth',
    'Seventeenth', 'Eighteenth', 'Nineteenth'];
  const tens = ['', '', 'Twentieth', 'Thirtieth'];
  const tensPrefix = ['', '', 'Twenty-', 'Thirty-'];
  if (n < 20) return ones[n];
  if (n % 10 === 0) return tens[Math.floor(n / 10)];
  return tensPrefix[Math.floor(n / 10)] + ones[n % 10];
}

function daysUntil(target: Date): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(target); t.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((t.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

// ─── Greyscale Image — Path 1 ─────────────────────────────────────────────
// On native, wrap in <Grayscale amount={1}>. On web, use CSS filter.
function GreyImage({ uri, style }: { uri: string; style: any }) {
  if (Platform.OS === 'web') {
    return (
      <Image
        source={{ uri }}
        style={[
          style,
          // @ts-ignore web-only
          { filter: 'grayscale(100%) contrast(0.92) brightness(1.02)',
            WebkitFilter: 'grayscale(100%) contrast(0.92) brightness(1.02)' },
        ]}
        resizeMode="cover"
      />
    );
  }
  return (
    <Grayscale amount={1}>
      <Image source={{ uri }} style={style} resizeMode="cover" />
    </Grayscale>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────
export default function FrostLanding() {
  const insets = useSafeAreaInsets();

  // Re-render every minute to keep countdown current
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((x: number) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Idle DreamAi lines (live from backend, fall back to static pool)
  const [idleLines, setIdleLines] = useState<[string, string]>(pickFallbackLines());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await brideIdle();
        if (cancelled) return;
        if (r?.lines && r.lines.length >= 2) {
          setIdleLines([r.lines[0], r.lines[1]]);
        }
      } catch {
        // silent — fallback lines remain
      }
    };
    load();
    const id = setInterval(load, 30 * 60 * 1000); // 30 min refresh
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Home-screen images — refresh on every focus
  const [museUrl, setMuseUrl] = useState<string | null>(null);
  const [discoverUrl, setDiscoverUrl] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const r = await fetchHomeImages();
          if (cancelled || !r?.success) return;
          setMuseUrl(r.muse_image_url || null);
          setDiscoverUrl(r.discover_image_url || null);
        } catch {
          // silent — boxes show empty cream
        }
      })();
      return () => { cancelled = true; };
    }, []),
  );

  const { weekday, month, year } = {
    weekday: WEDDING_DATE.toLocaleDateString('en-IN', { weekday: 'long' }),
    month:   WEDDING_DATE.toLocaleDateString('en-IN', { month: 'long' }),
    year:    WEDDING_DATE.getFullYear().toString(),
  };
  const dayWord = dayNumberToWords(WEDDING_DATE.getDate());
  const days    = daysUntil(WEDDING_DATE);
  const [lineA, lineB] = idleLines;

  const goMuse     = () => { Haptics.selectionAsync?.(); router.push('/(frost)/canvas/muse' as any); };
  const goDiscover = () => { Haptics.selectionAsync?.(); router.push('/(frost)/canvas/discover' as any); };
  const goDream    = () => { Haptics.selectionAsync?.(); router.push('/(frost)/canvas/dream' as any); };
  const goJourney  = () => { Haptics.selectionAsync?.(); router.push('/(frost)/canvas/journey' as any); };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={PAGE_GREY} />

      {/* ── Hero block ── */}
      <View style={styles.hero}>
        <Text style={styles.weekday}>{weekday}</Text>
        <Text style={styles.dateLine}>{dayWord} of {month}</Text>
        <Text style={styles.year}>{year}</Text>
        <View style={styles.rule} />
        <View style={styles.daysWrap}>
          <Text style={styles.daysNum}>{days}</Text>
          <Text style={styles.daysWord}>{FrostCopy.landing.daysWord}</Text>
        </View>
      </View>

      {/* ── Two image boxes ── */}
      <View style={styles.gridRow}>
        <Pressable
          style={styles.imgBox}
          onPress={goMuse}
          onLongPress={goMuse}
          accessibilityLabel="Muse"
        >
          {museUrl ? (
            <View style={styles.photoFrame}>
              <GreyImage uri={museUrl} style={styles.photoImg} />
            </View>
          ) : null}
          <View style={[styles.boxDot, { backgroundColor: GOLD_BRIGHT }]} />
        </Pressable>

        <Pressable
          style={styles.imgBox}
          onPress={goDiscover}
          onLongPress={goDiscover}
          accessibilityLabel="Discover"
        >
          {discoverUrl ? (
            <View style={styles.photoFrame}>
              <GreyImage uri={discoverUrl} style={styles.photoImg} />
            </View>
          ) : null}
          <View style={[styles.boxDot, { backgroundColor: GOLD_BRIGHT }]} />
        </Pressable>
      </View>

      {/* ── Dream AI card ── */}
      <Pressable
        style={styles.dreamCard}
        onPress={goDream}
        onLongPress={goDream}
        accessibilityLabel="Dream Ai"
      >
        <Text style={styles.dreamLabel}>Dream Ai</Text>
        <View style={styles.dreamLine}>
          <Text style={styles.dreamGlyph}>✦</Text>
          <Text style={styles.dreamText}>{lineA}</Text>
        </View>
        <View style={styles.dreamLine}>
          <Text style={styles.dreamGlyph}>✦</Text>
          <Text style={styles.dreamText}>{lineB}</Text>
        </View>
      </Pressable>

      <View style={{ flex: 1 }} />

      {/* ── Journey button ── */}
      <Pressable
        onPress={goJourney}
        onLongPress={goJourney}
        style={[styles.journeyBox, { marginBottom: Math.max(insets.bottom, 16) }]}
        accessibilityLabel="Journey"
      >
        <Text style={styles.journeyLabel}>Journey</Text>
      </Pressable>

      {/* ── Single frost pane covering everything (Layer 3) ── */}
      {/* Sits on top of the imagery + container shapes, but below the text overlay
          which we render afterwards via a stack of absolute layers. To keep the
          architecture simple in v3, the frost is the LAST sibling — it covers all
          content, but text colours are tuned to survive a 2.5px haze. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {Platform.OS === 'web' ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              // @ts-ignore web-only
              { backdropFilter: 'blur(2.5px) saturate(101%)',
                WebkitBackdropFilter: 'blur(2.5px) saturate(101%)',
                backgroundColor: FROST_TINT },
            ]}
          />
        ) : Platform.OS === 'ios' ? (
          <BlurView
            intensity={12}
            tint="light"
            style={[StyleSheet.absoluteFill, { backgroundColor: FROST_TINT }]}
          />
        ) : ANDROID_BLUR_SUPPORTED ? (
          <BlurView
            intensity={10}
            tint="light"
            experimentalBlurMethod={'dimezisBlurView' as any}
            style={[StyleSheet.absoluteFill, { backgroundColor: FROST_TINT }]}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: FROST_TINT }]} />
        )}
      </View>

      {/* ── Text overlay (Layer 4) — sits above the frost, sharp ── */}
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top }]}>
        <View style={styles.hero} pointerEvents="none">
          <Text style={styles.weekday}>{weekday}</Text>
          <Text style={styles.dateLine}>{dayWord} of {month}</Text>
          <Text style={styles.year}>{year}</Text>
          <View style={styles.rule} />
          <View style={styles.daysWrap}>
            <Text style={styles.daysNum}>{days}</Text>
            <Text style={styles.daysWord}>{FrostCopy.landing.daysWord}</Text>
          </View>
        </View>

        {/* Dot overlays — sharp gold above frost */}
        <View style={styles.gridRow} pointerEvents="none">
          <View style={[styles.imgBox, { backgroundColor: 'transparent', borderColor: 'transparent' }]}>
            <View style={[styles.boxDot, { backgroundColor: GOLD_BRIGHT }]} />
          </View>
          <View style={[styles.imgBox, { backgroundColor: 'transparent', borderColor: 'transparent' }]}>
            <View style={[styles.boxDot, { backgroundColor: GOLD_BRIGHT }]} />
          </View>
        </View>

        <View style={[styles.dreamCard, { backgroundColor: 'transparent', borderColor: 'transparent' }]} pointerEvents="none">
          <Text style={styles.dreamLabel}>Dream Ai</Text>
          <View style={styles.dreamLine}>
            <Text style={styles.dreamGlyph}>✦</Text>
            <Text style={styles.dreamText}>{lineA}</Text>
          </View>
          <View style={styles.dreamLine}>
            <Text style={styles.dreamGlyph}>✦</Text>
            <Text style={styles.dreamText}>{lineB}</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />

        <View
          pointerEvents="none"
          style={[styles.journeyBox, {
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            marginBottom: Math.max(insets.bottom, 16),
          }]}
        >
          <Text style={styles.journeyLabel}>Journey</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_GREY,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
  },
  weekday: {
    fontFamily: FrostFonts.display,
    fontWeight: '300',
    fontSize: 22,
    lineHeight: 26,
    color: INK_TEXT,
  },
  dateLine: {
    fontFamily: FrostFonts.display,
    fontWeight: '400',
    fontStyle: 'italic',
    fontSize: 30,
    lineHeight: 34,
    color: GOLD_BRIGHT,
    letterSpacing: 0.3,
    marginTop: 2,
    textAlign: 'center',
  },
  year: {
    fontFamily: FrostFonts.display,
    fontWeight: '300',
    fontSize: 18,
    lineHeight: 22,
    color: INK_TEXT,
    marginTop: 2,
  },
  rule: {
    width: 40,
    height: StyleSheet.hairlineWidth,
    backgroundColor: HAIRLINE,
    marginTop: 10,
    marginBottom: 8,
  },
  daysWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  daysNum: {
    fontFamily: FrostFonts.display,
    fontWeight: '500',
    fontSize: 24,
    lineHeight: 28,
    color: GOLD_BRIGHT,
  },
  daysWord: {
    fontFamily: FrostFonts.label,
    fontWeight: '400',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: GOLD,
  },

  // Image boxes
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    marginTop: 10,
  },
  imgBox: {
    flex: 1,
    aspectRatio: 1 / 1.18,
    backgroundColor: CARD_FILL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    borderRadius: 18,
    overflow: 'hidden',
  },
  photoFrame: {
    position: 'absolute',
    top: 8, left: 8, right: 8, bottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  boxDot: {
    position: 'absolute',
    left: 18,
    top: 18,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Dream AI card
  dreamCard: {
    marginTop: 12,
    marginHorizontal: 18,
    backgroundColor: CARD_FILL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  dreamLabel: {
    fontFamily: FrostFonts.display,
    fontWeight: '600',
    fontStyle: 'italic',
    fontSize: 19,
    letterSpacing: 0.4,
    color: GOLD_BRIGHT,
    marginBottom: 10,
  },
  dreamLine: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  dreamGlyph: {
    fontSize: 13,
    color: SOFT_TEXT,
    marginTop: 3,
  },
  dreamText: {
    flex: 1,
    fontFamily: FrostFonts.display,
    fontWeight: '300',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 21,
    color: SOFT_TEXT,
  },

  // Journey button
  journeyBox: {
    marginHorizontal: 18,
    backgroundColor: STAMP_FILL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE_STRONG,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  journeyLabel: {
    fontFamily: FrostFonts.display,
    fontWeight: '600',
    fontStyle: 'italic',
    fontSize: 19,
    letterSpacing: 0.8,
    color: GOLD_BRIGHT,
  },
});
