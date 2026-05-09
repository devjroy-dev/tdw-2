/**
 * Frost — Landing (v4 — vintage palette + F-2 frost on photos).
 *
 * What changed from v3:
 *   - Vintage palette (matches the Vogue/Harper's-Bazaar carbon-print mood)
 *   - F-2 frost on photos: each greyscale image is wrapped in a low-intensity
 *     BlurView so the photographs feel hazy. The page itself is flat — no
 *     full-page blur (it never worked on Android, and the per-image approach
 *     produces the visible softening Dev was after).
 *   - Dream Ai card now sits on the same darker stamp as the Journey button
 *     (both anchor surfaces share one tonal stop)
 *   - Image latency: image-frames render in stamp-grey immediately so the
 *     boxes never appear empty during fetch
 *
 * What stayed:
 *   - Two image boxes side by side, gold dot in the corner of each
 *   - Wide Dream AI card (gold "Dream Ai" eyebrow + 2 italic Cormorant lines)
 *   - Journey button at the foot
 *   - useFocusEffect refresh on every home-screen entry
 *   - Anti-collision via /api/v2/frost/home-images/:userId
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
  FrostFonts, FrostCopy,
} from '../../constants/frost';
import {
  brideIdle, fetchHomeImages, fetchCircleFeed, formatCircleActivity,
  CircleActivityEvent,
} from '../../services/frostApi';

// ─── Wedding date — wired to user profile in v1.7 ──────────────────────────
const WEDDING_DATE = new Date('2026-09-25T00:00:00+05:30');

// ─── v4 vintage tokens (locked) ────────────────────────────────────────────
// All in the warm-grey family. Page paper is the lightest stop, the anchor
// stamp (Dream Ai + Journey) is deeper, photographs sit at greyscale.
const PAGE_PAPER       = '#D8D3CC';      // home page background — nudged warmer (round 3)
const CARD_FILL        = '#ECE9E4';      // image box fill (slightly cooler pale)
const STAMP_FILL       = '#C0BCB6';      // Dream Ai card + Journey stamp (matched, deeper)
const HAIRLINE         = '#B5B1AC';
const HAIRLINE_STRONG  = '#A39E97';
const INK              = '#2C2823';      // warm charcoal display
const SOFT             = '#5A5650';      // warm mid-grey body
const BRASS            = '#BFA04D';      // polished brass — pops on warmer page (round 3)

// Per-image frost tint sits on top of the BlurView for a subtle warm wash.
const PHOTO_FROST_TINT = 'rgba(154,149,142,0.10)';

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

// ─── F-2 frosted greyscale image — the visible softness primitive ─────────
// On native: greyscale wrapper → image → low-intensity BlurView on top with
// a soft warm tint. Real blur on the photograph itself.
// On web: CSS filter chain — grayscale + blur — applied directly to the image.
function FrostedGreyImage({
  uri,
  containerStyle,
  imageStyle,
}: {
  uri: string;
  containerStyle: any;
  imageStyle: any;
}) {
  if (Platform.OS === 'web') {
    return (
      <Image
        source={{ uri }}
        style={[
          imageStyle,
          // @ts-ignore web-only style
          {
            filter: 'grayscale(100%) blur(2.5px) contrast(0.95)',
            WebkitFilter: 'grayscale(100%) blur(2.5px) contrast(0.95)',
          },
        ]}
        resizeMode="cover"
      />
    );
  }
  return (
    <View style={containerStyle}>
      <Grayscale amount={1}>
        <Image source={{ uri }} style={imageStyle} resizeMode="cover" />
      </Grayscale>
      <BlurView
        intensity={4}
        tint="light"
        style={[StyleSheet.absoluteFill, { backgroundColor: PHOTO_FROST_TINT }]}
        pointerEvents="none"
      />
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────
export default function FrostLanding() {
  const insets = useSafeAreaInsets();

  // Re-render every minute so countdown stays current
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

  // Circle activity feed — refresh on every focus, same protocol as images
  const [circleLines, setCircleLines] = useState<string[]>([]);

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
          // silent — boxes show empty stamp colour
        }
      })();
      // Circle activity — latest 2 events, same refresh-on-focus protocol
      (async () => {
        try {
          const events = await fetchCircleFeed(10);
          if (cancelled) return;
          const lines = (events || []).slice(0, 2).map(formatCircleActivity);
          setCircleLines(lines);
        } catch {
          // silent — empty state line will render
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
  const goCircle   = () => { Haptics.selectionAsync?.(); router.push('/(frost)/canvas/journey/circle' as any); };
  const goJourney  = () => { Haptics.selectionAsync?.(); router.push('/(frost)/canvas/journey' as any); };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={PAGE_PAPER} />

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
          <View style={styles.photoFrame}>
            {museUrl ? (
              <FrostedGreyImage
                uri={museUrl}
                containerStyle={StyleSheet.absoluteFill}
                imageStyle={styles.photoImg}
              />
            ) : null}
          </View>
          <View style={[styles.boxDot, { backgroundColor: BRASS }]} />
        </Pressable>

        <Pressable
          style={styles.imgBox}
          onPress={goDiscover}
          onLongPress={goDiscover}
          accessibilityLabel="Discover"
        >
          <View style={styles.photoFrame}>
            {discoverUrl ? (
              <FrostedGreyImage
                uri={discoverUrl}
                containerStyle={StyleSheet.absoluteFill}
                imageStyle={styles.photoImg}
              />
            ) : null}
          </View>
          <View style={[styles.boxDot, { backgroundColor: BRASS }]} />
        </Pressable>
      </View>

      {/* ── Dream AI card (now on the same deeper stamp as Journey) ── */}
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

      {/* ── Circle card (round 3 — paired voice with Dream Ai) ── */}
      <Pressable
        style={styles.circleCard}
        onPress={goCircle}
        onLongPress={goCircle}
        accessibilityLabel="Circle"
      >
        <Text style={styles.circleLabel}>Circle</Text>
        {circleLines.length > 0 ? (
          circleLines.map((line, idx) => (
            <View key={idx} style={styles.circleLine}>
              <Text style={styles.circleGlyph}>✦</Text>
              <Text style={styles.circleText}>{line}</Text>
            </View>
          ))
        ) : (
          <View style={styles.circleLine}>
            <Text style={styles.circleGlyph}>✦</Text>
            <Text style={styles.circleText}>Quiet here for now.</Text>
          </View>
        )}
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
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_PAPER,
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
    color: INK,
  },
  dateLine: {
    fontFamily: FrostFonts.display,
    fontWeight: '400',
    fontStyle: 'italic',
    fontSize: 30,
    lineHeight: 34,
    color: BRASS,
    letterSpacing: 0.3,
    marginTop: 2,
    textAlign: 'center',
  },
  year: {
    fontFamily: FrostFonts.display,
    fontWeight: '300',
    fontSize: 18,
    lineHeight: 22,
    color: INK,
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
    color: BRASS,
  },
  daysWord: {
    fontFamily: FrostFonts.label,
    fontWeight: '400',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: BRASS,
  },

  // Image boxes — now show stamp-coloured frames immediately so they never appear empty
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    marginTop: 10,
  },
  imgBox: {
    flex: 1,
    aspectRatio: 1 / 1.18,
    backgroundColor: STAMP_FILL,        // matches dream/journey stamp — coherent if image is slow
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
    backgroundColor: CARD_FILL,         // soft pale fill while image loads
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

  // Dream AI card — now on STAMP_FILL (matching Journey)
  dreamCard: {
    marginTop: 12,
    marginHorizontal: 18,
    backgroundColor: STAMP_FILL,        // matched to Journey
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE_STRONG,
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
    color: BRASS,
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
    color: SOFT,
    marginTop: 3,
  },
  dreamText: {
    flex: 1,
    fontFamily: FrostFonts.display,
    fontWeight: '300',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 21,
    color: SOFT,
  },

  // Circle card — paired voice with Dream Ai (same dimensions)
  circleCard: {
    marginTop: 12,
    marginHorizontal: 18,
    backgroundColor: STAMP_FILL,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: HAIRLINE_STRONG,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  circleLabel: {
    fontFamily: FrostFonts.display,
    fontWeight: '600',
    fontStyle: 'italic',
    fontSize: 19,
    letterSpacing: 0.4,
    color: BRASS,
    marginBottom: 10,
  },
  circleLine: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  circleGlyph: {
    fontSize: 13,
    color: SOFT,
    marginTop: 3,
  },
  circleText: {
    flex: 1,
    fontFamily: FrostFonts.display,
    fontWeight: '300',
    fontStyle: 'italic',
    fontSize: 15,
    lineHeight: 21,
    color: SOFT,
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
    color: BRASS,
  },
});
