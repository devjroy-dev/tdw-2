/**
 * Frost — Landing (v2 — wired to bride-idle).
 *
 * Same composition. The Dream box's two lines now pull live from
 * GET /api/v2/dreamai/bride-idle/:userId — Haiku generates 2 contextual
 * lines based on her actual data (days till wedding, vendors booked,
 * total spent). Hour-bucketed cache on the backend means the lines stay
 * stable through the day and refresh once an hour.
 *
 * Falls back to static FrostCopy.idlePool on error or while loading so
 * the bride NEVER sees an empty Dream box.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions, StatusBar, Image, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import UnveilCanvas from '../../components/frost/UnveilCanvas';
import RotatingImage from '../../components/frost/RotatingImage';
import {
  FrostColors, FrostFonts, FrostType, FrostSpace, FrostRadius,
  FrostMotion, FrostMaterial, FrostLayout, FrostCopy,
} from '../../constants/frost';
import { brideIdle } from '../../services/frostApi';

// ─── Wedding date — to be wired to user profile in v1.7 ──────────────────────
const WEDDING_DATE = new Date('2026-09-25T00:00:00+05:30');

// ─── Underlying image ────────────────────────────────────────────────────────
const UNDER_IMAGE =
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=85&auto=format&fit=crop';

const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=1080&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1080&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1583394293214-28a4b0843b1d?w=1080&q=85&auto=format&fit=crop',
];

// ─── Static fallback line picker — used while idle endpoint loads ────────────
function pickFallbackLines(): [string, string] {
  const hour = new Date().getHours();
  const pool = FrostCopy.idlePool;
  return [pool[hour % pool.length], pool[(hour + 4) % pool.length]];
}

// ─── Date helpers ────────────────────────────────────────────────────────────
function formatDateAsLetters(d: Date) {
  return {
    weekday: d.toLocaleDateString('en-IN', { weekday: 'long' }),
    month:   d.toLocaleDateString('en-IN', { month: 'long' }),
    year:    d.getFullYear().toString(),
  };
}

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

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function FrostLanding() {
  const insets = useSafeAreaInsets();
  const { width: screenW } = Dimensions.get('window');

  const [, force] = useState(0);
  const [idleLines, setIdleLines] = useState<[string, string]>(pickFallbackLines());

  // Re-render every minute to keep countdown current
  useEffect(() => {
    const id = setInterval(() => force(x => x + 1), FrostMotion.idleRefresh);
    return () => clearInterval(id);
  }, []);

  // Pull live idle lines from the backend on mount + every ~30 minutes
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await brideIdle();
        if (cancelled) return;
        if (r.lines && r.lines.length >= 2) {
          setIdleLines([r.lines[0], r.lines[1]]);
        }
      } catch {
        // Silent — fallback lines remain
      }
    };
    load();
    const id = setInterval(load, 30 * 60 * 1000); // 30 min refresh
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const { weekday, month, year } = formatDateAsLetters(WEDDING_DATE);
  const dayWord = dayNumberToWords(WEDDING_DATE.getDate());
  const days    = daysUntil(WEDDING_DATE);
  const [lineA, lineB] = idleLines;

  const sidePad   = FrostLayout.pageSidePadding;
  const gap       = FrostLayout.boxGap;
  const topBoxW   = (screenW - (sidePad * 2) - gap) / 2;
  const topBoxH   = topBoxW * FrostLayout.boxAspectRatio;
  const dreamBoxW = screenW - (sidePad * 2);
  const dreamBoxH = FrostLayout.dreamBoxHeight;

  const goJourney = () => {
    Haptics.selectionAsync?.();
    router.push('/(frost)/canvas/journey' as any);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* LAYER 1: full-bleed colour image */}
      <Image
        source={{ uri: UNDER_IMAGE }}
        style={[
          StyleSheet.absoluteFill,
          Platform.OS === 'web'
            ? // @ts-expect-error
              {
                filter: FrostMaterial.greyscaleFilter,
                WebkitFilter: FrostMaterial.greyscaleFilter,
              }
            : null,
        ]}
        resizeMode="cover"
      />
      {Platform.OS !== 'web' ? (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: FrostColors.desatOverlay }]}
          pointerEvents="none"
        />
      ) : null}

      {/* LAYER 1.5: box images */}
      <BoxImagesLayer
        sidePad={sidePad}
        gap={gap}
        topBoxW={topBoxW}
        topBoxH={topBoxH}
        dreamBoxW={dreamBoxW}
        dreamBoxH={dreamBoxH}
        topInset={insets.top}
      />

      {/* LAYER 2: ONE FROST PANE */}
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            // @ts-expect-error
            {
              backdropFilter: FrostMaterial.pageBlurWeb,
              WebkitBackdropFilter: FrostMaterial.pageBlurWeb,
              backgroundColor: FrostColors.frostTint,
            },
          ]}
          pointerEvents="none"
        />
      ) : Platform.OS === 'ios' ? (
        <BlurView
          intensity={FrostMaterial.pageBlurIOS}
          tint="light"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: FrostMaterial.androidPageTint }]}
          pointerEvents="none"
        />
      )}

      {/* LAYER 3: page UI */}
      <View style={[styles.contentLayer, { paddingTop: insets.top }]}>

        <View style={styles.heroWrap}>
          <Text style={styles.heroEyebrow}>{FrostCopy.landing.eyebrow}</Text>
          <Text style={styles.heroWeekday}>{weekday}</Text>
          <Text style={styles.heroDate}>{dayWord} of {month}</Text>
          <Text style={styles.heroYear}>{year}</Text>

          <View style={styles.heroRule} />

          <View style={styles.heroDaysWrap}>
            <Text style={styles.heroDaysNumber}>{days}</Text>
            <Text style={styles.heroDaysWord}>{FrostCopy.landing.daysWord}</Text>
          </View>
        </View>

        <View style={[styles.gridRow, { paddingHorizontal: sidePad, gap }]}>
          <UnveilCanvas
            width={topBoxW}
            height={topBoxH}
            eyebrow={FrostCopy.museCanvas.eyebrow}
            onUnveil={() => router.push('/(frost)/canvas/muse' as any)}
          />
          <UnveilCanvas
            width={topBoxW}
            height={topBoxH}
            eyebrow={FrostCopy.discoverCanvas.eyebrow}
            onUnveil={() => router.push('/(frost)/canvas/discover' as any)}
          />
        </View>

        <View style={[styles.dreamRow, { paddingHorizontal: sidePad }]}>
          <UnveilCanvas
            width={dreamBoxW}
            height={dreamBoxH}
            eyebrow={FrostCopy.dreamCanvas.eyebrow}
            onUnveil={() => router.push('/(frost)/canvas/dream' as any)}
            textContent
          >
            <View style={styles.dreamInner}>
              <View style={styles.dreamLineRow}>
                <Text style={styles.dreamGlyph}>✦</Text>
                <Text style={styles.dreamText}>{lineA}</Text>
              </View>
              <View style={styles.dreamLineRow}>
                <Text style={styles.dreamGlyph}>✦</Text>
                <Text style={styles.dreamText}>{lineB}</Text>
              </View>
            </View>
          </UnveilCanvas>
        </View>

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={goJourney}
          onLongPress={goJourney}
          style={[styles.journeyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          <View style={styles.journeyRule} />
          <Text style={styles.journeyLabel}>{FrostCopy.landing.journeyLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── BoxImagesLayer ───────────────────────────────────────────────────────────
function BoxImagesLayer({
  sidePad, gap, topBoxW, topBoxH, dreamBoxW, dreamBoxH, topInset,
}: {
  sidePad: number; gap: number;
  topBoxW: number; topBoxH: number; dreamBoxW: number; dreamBoxH: number;
  topInset: number;
}) {
  const HERO_H  = FrostLayout.heroBlockHeight;
  const ROW_GAP = 16;
  const topRowY   = topInset + HERO_H;
  const dreamRowY = topRowY + topBoxH + ROW_GAP;

  const greyscaleStyle = Platform.OS === 'web'
    ? // @ts-expect-error
      {
        filter: FrostMaterial.greyscaleBoxFilter,
        WebkitFilter: FrostMaterial.greyscaleBoxFilter,
      }
    : {};

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={{
          position: 'absolute', top: topRowY, left: sidePad, right: sidePad,
          flexDirection: 'row', gap,
        }}
      >
        <View
          style={[
            { width: topBoxW, height: topBoxH, borderRadius: FrostRadius.box, overflow: 'hidden' },
            greyscaleStyle,
          ]}
        >
          <RotatingImage sources={PLACEHOLDER_IMAGES} />
        </View>
        <View
          style={[
            { width: topBoxW, height: topBoxH, borderRadius: FrostRadius.box, overflow: 'hidden' },
            greyscaleStyle,
          ]}
        >
          <RotatingImage sources={PLACEHOLDER_IMAGES} offset />
        </View>
      </View>

      <View
        style={{
          position: 'absolute', top: dreamRowY, left: sidePad, right: sidePad,
        }}
      >
        <View
          style={{
            width: dreamBoxW,
            height: dreamBoxH,
            borderRadius: FrostRadius.box,
            backgroundColor: 'rgba(232,228,221,0.85)',
          }}
        />
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FrostColors.pageFallback },
  contentLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },

  heroWrap: {
    paddingTop: FrostSpace.xxxl,
    paddingBottom: FrostSpace.xxl,
    alignItems: 'center',
  },
  heroEyebrow: {
    ...FrostType.eyebrowLarge,
    marginBottom: FrostSpace.l,
  },
  heroWeekday: {
    ...FrostType.displayL,
    textAlign: 'center',
  },
  heroDate: {
    ...FrostType.displayXL,
    color: FrostColors.goldMuted,
    marginTop: FrostSpace.xs,
    textAlign: 'center',
    paddingHorizontal: FrostSpace.m,
  },
  heroYear: {
    fontFamily: FrostFonts.display,
    fontSize: 28, lineHeight: 32,
    color: FrostColors.ink,
    textAlign: 'center',
    marginTop: 6,
  },
  heroRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: FrostColors.hairline,
    width: 56,
    marginTop: FrostSpace.xl,
    marginBottom: FrostSpace.l,
  },
  heroDaysWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: FrostSpace.s,
  },
  heroDaysNumber: {
    fontFamily: FrostFonts.displayMedium,
    fontSize: 38, lineHeight: 42,
    color: FrostColors.goldMuted,
  },
  heroDaysWord: {
    fontFamily: FrostFonts.label,
    fontSize: 11, letterSpacing: 3,
    textTransform: 'uppercase',
    color: FrostColors.muted,
  },

  gridRow: { flexDirection: 'row', marginTop: 4 },
  dreamRow: { marginTop: FrostSpace.l },

  dreamInner: {
    flex: 1,
    paddingHorizontal: FrostSpace.xl,
    paddingTop: FrostSpace.xxxl + 4,
    paddingBottom: FrostSpace.xl,
    justifyContent: 'center',
    gap: FrostSpace.l - 2,
  },
  dreamLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: FrostSpace.m - 2,
  },
  dreamGlyph: {
    fontFamily: FrostFonts.body,
    fontSize: 14,
    color: FrostColors.soft,
    marginTop: 3,
  },
  dreamText: {
    flex: 1,
    ...FrostType.displayXS,
  },

  journeyBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: FrostColors.hairline,
    paddingTop: FrostSpace.l - 2,
    alignItems: 'center',
  },
  journeyRule: {
    width: 28,
    height: 2,
    backgroundColor: FrostColors.ink,
    marginBottom: FrostSpace.s,
    opacity: 0.85,
  },
  journeyLabel: {
    ...FrostType.displayS,
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
});
