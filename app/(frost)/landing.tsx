/**
 * Frost — Landing (v5 — eight-mode toggle for home-screen rendition test).
 *
 * This file ships eight visual modes behind a single top-level constant so we
 * can A/B/C/D/E test on real device without rebuilds. Once a winner is picked,
 * a small follow-up patch deletes the seven losers and the toggle.
 *
 * Modes:
 *   SANCTUARY — current state. Vintage palette, F-2 frost on photos.
 *   A         — colour photos. Everything else identical to SANCTUARY.
 *   B         — colour photos + cooler/whiter paper + sharp 8px corners.
 *   C         — PWA energy. Taller photos (1.15 aspect), dark gradient at the
 *               bottom of each photo, sharp 0px corners, reduced page padding.
 *   E1        — borderless mosaic. Dark navy gradient hero, colour photos.
 *   E2        — borderless mosaic. Dark navy gradient hero, B&W photos.
 *   E3        — borderless mosaic. Dirty-white paper hero, colour photos.
 *   E4        — borderless mosaic. Dirty-white paper hero, B&W photos.
 *
 * To test: edit HOME_MODE below, save, hot-reload picks it up.
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
import { LinearGradient } from 'expo-linear-gradient';
import {
  FrostFonts, FrostCopy,
} from '../../constants/frost';
import {
  brideIdle, fetchHomeImages, fetchCircleFeed, formatCircleActivity,
} from '../../services/frostApi';

// ─── Wedding date — wired to user profile in v1.7 ──────────────────────────
const WEDDING_DATE = new Date('2026-09-25T00:00:00+05:30');

// ═══════════════════════════════════════════════════════════════════════════
// HOME MODE TOGGLE — flip this string to A/B/C/E1/E2/E3/E4/SANCTUARY.
// Hot reload picks it up. No rebuild needed. Default = SANCTUARY (safe revert).
// ═══════════════════════════════════════════════════════════════════════════

type HomeModeKey = 'SANCTUARY' | 'A' | 'B' | 'C' | 'E1' | 'E2' | 'E3' | 'E4';
const HOME_MODE: HomeModeKey = 'E1';

// ─── Mode descriptors ──────────────────────────────────────────────────────
type Layout = 'classic' | 'mosaic';
type PhotoTreatment = 'frost' | 'colour' | 'bw';

interface ModeDescriptor {
  layout:           Layout;
  photoTreatment:   PhotoTreatment;
  // Palette
  pagePaper:        string;
  cardFill:         string;
  stampFill:        string;
  hairline:         string;
  hairlineStrong:   string;
  ink:              string;
  soft:             string;
  brass:            string;
  brassMuted:       string;
  // Photo frame radii (classic layout only)
  imgBoxRadius:     number;
  photoFrameRadius: number;
  cardRadius:       number;
  // Photo aspect (classic layout only)
  photoAspect:      number;
  // Status bar tint
  statusBarStyle:   'dark-content' | 'light-content';
  // Mosaic-specific gradient stops (mosaic layout only)
  heroGradient?:    [string, string];
  dreamGradient?:   [string, string];
  circleGradient?:  [string, string];
  journeyGradient?: [string, string];
  // C only — bottom-of-photo dark gradient for legibility
  photoBottomGradient?: boolean;
}

const MODES: Record<HomeModeKey, ModeDescriptor> = {
  // ── SANCTUARY: current state (revert default) ────────────────────────────
  SANCTUARY: {
    layout:           'classic',
    photoTreatment:   'frost',
    pagePaper:        '#D8D3CC',
    cardFill:         '#ECE9E4',
    stampFill:        '#C0BCB6',
    hairline:         '#B5B1AC',
    hairlineStrong:   '#A39E97',
    ink:              '#2C2823',
    soft:             '#5A5650',
    brass:            '#BFA04D',
    brassMuted:       '#A8924B',
    imgBoxRadius:     18,
    photoFrameRadius: 12,
    cardRadius:       18,
    photoAspect:      1 / 1.18,
    statusBarStyle:   'dark-content',
  },

  // ── A: colour photos. Otherwise identical to SANCTUARY. ──────────────────
  A: {
    layout:           'classic',
    photoTreatment:   'colour',
    pagePaper:        '#D8D3CC',
    cardFill:         '#ECE9E4',
    stampFill:        '#C0BCB6',
    hairline:         '#B5B1AC',
    hairlineStrong:   '#A39E97',
    ink:              '#2C2823',
    soft:             '#5A5650',
    brass:            '#BFA04D',
    brassMuted:       '#A8924B',
    imgBoxRadius:     18,
    photoFrameRadius: 12,
    cardRadius:       18,
    photoAspect:      1 / 1.18,
    statusBarStyle:   'dark-content',
  },

  // ── B: cooler/whiter paper + sharper corners ─────────────────────────────
  B: {
    layout:           'classic',
    photoTreatment:   'colour',
    pagePaper:        '#EDEAE4',
    cardFill:         '#F4F1EB',
    stampFill:        '#D2CEC8',
    hairline:         '#C2BEB8',
    hairlineStrong:   '#A39E97',
    ink:              '#2C2823',
    soft:             '#5A5650',
    brass:            '#BFA04D',
    brassMuted:       '#A8924B',
    imgBoxRadius:     8,
    photoFrameRadius: 6,
    cardRadius:       8,
    photoAspect:      1 / 1.18,
    statusBarStyle:   'dark-content',
  },

  // ── C: PWA energy on classic layout ──────────────────────────────────────
  C: {
    layout:           'classic',
    photoTreatment:   'colour',
    pagePaper:        '#D8D3CC',
    cardFill:         '#1A1612',
    stampFill:        '#C0BCB6',
    hairline:         '#B5B1AC',
    hairlineStrong:   '#A39E97',
    ink:              '#2C2823',
    soft:             '#5A5650',
    brass:            '#BFA04D',
    brassMuted:       '#A8924B',
    imgBoxRadius:     0,
    photoFrameRadius: 0,
    cardRadius:       0,
    photoAspect:      1 / 1.32,                  // taller, more dramatic
    statusBarStyle:   'dark-content',
    photoBottomGradient: true,
  },

  // ── E1: mosaic, dark, colour photos ──────────────────────────────────────
  E1: {
    layout:           'mosaic',
    photoTreatment:   'colour',
    pagePaper:        '#1B1612',
    cardFill:         '#1B1612',
    stampFill:        '#2D2620',
    hairline:         'rgba(191,160,77,0.18)',
    hairlineStrong:   'rgba(191,160,77,0.22)',
    ink:              '#F5F0E8',
    soft:             'rgba(245,240,232,0.62)',
    brass:            '#BFA04D',
    brassMuted:       '#A8924B',
    imgBoxRadius:     0,
    photoFrameRadius: 0,
    cardRadius:       0,
    photoAspect:      1 / 1,
    statusBarStyle:   'light-content',
    heroGradient:     ['#1B1612', '#2A2018'],
    dreamGradient:    ['#2D2620', '#1A1612'],
    circleGradient:   ['#1F1A18', '#2C2520'],
    journeyGradient:  ['#15110E', '#221C18'],
  },

  // ── E2: mosaic, dark, B&W photos ─────────────────────────────────────────
  E2: {
    layout:           'mosaic',
    photoTreatment:   'bw',
    pagePaper:        '#1B1612',
    cardFill:         '#1B1612',
    stampFill:        '#2D2620',
    hairline:         'rgba(191,160,77,0.18)',
    hairlineStrong:   'rgba(191,160,77,0.22)',
    ink:              '#F5F0E8',
    soft:             'rgba(245,240,232,0.62)',
    brass:            '#BFA04D',
    brassMuted:       '#A8924B',
    imgBoxRadius:     0,
    photoFrameRadius: 0,
    cardRadius:       0,
    photoAspect:      1 / 1,
    statusBarStyle:   'light-content',
    heroGradient:     ['#1B1612', '#2A2018'],
    dreamGradient:    ['#2D2620', '#1A1612'],
    circleGradient:   ['#1F1A18', '#2C2520'],
    journeyGradient:  ['#15110E', '#221C18'],
  },

  // ── E3: mosaic, light, colour photos ─────────────────────────────────────
  E3: {
    layout:           'mosaic',
    photoTreatment:   'colour',
    pagePaper:        '#D8D3CC',
    cardFill:         '#D8D3CC',
    stampFill:        '#C8C2BA',
    hairline:         'rgba(44,40,35,0.12)',
    hairlineStrong:   'rgba(44,40,35,0.18)',
    ink:              '#2C2823',
    soft:             '#5A5650',
    brass:            '#BFA04D',
    brassMuted:       '#A8924B',
    imgBoxRadius:     0,
    photoFrameRadius: 0,
    cardRadius:       0,
    photoAspect:      1 / 1,
    statusBarStyle:   'dark-content',
    heroGradient:     ['#D8D3CC', '#CFC9C1'],
    dreamGradient:    ['#C8C2BA', '#BBB5AC'],
    circleGradient:   ['#BCB6AD', '#B0AAA1'],
    journeyGradient:  ['#A8A29A', '#948E86'],
  },

  // ── E4: mosaic, light, B&W photos ────────────────────────────────────────
  E4: {
    layout:           'mosaic',
    photoTreatment:   'bw',
    pagePaper:        '#D8D3CC',
    cardFill:         '#D8D3CC',
    stampFill:        '#C8C2BA',
    hairline:         'rgba(44,40,35,0.12)',
    hairlineStrong:   'rgba(44,40,35,0.18)',
    ink:              '#2C2823',
    soft:             '#5A5650',
    brass:            '#BFA04D',
    brassMuted:       '#A8924B',
    imgBoxRadius:     0,
    photoFrameRadius: 0,
    cardRadius:       0,
    photoAspect:      1 / 1,
    statusBarStyle:   'dark-content',
    heroGradient:     ['#D8D3CC', '#CFC9C1'],
    dreamGradient:    ['#C8C2BA', '#BBB5AC'],
    circleGradient:   ['#BCB6AD', '#B0AAA1'],
    journeyGradient:  ['#A8A29A', '#948E86'],
  },
};

// Per-image frost tint (SANCTUARY only)
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

// ─── Photo treatment primitive ─────────────────────────────────────────────
// One component, three behaviours: frost (SANCTUARY), colour (A/B/C/E1/E3),
// bw (E2/E4). On native, bw uses the same Grayscale wrapper as frost minus
// the BlurView. On web, all three are CSS filters on the Image.
function ModePhoto({
  uri,
  treatment,
  containerStyle,
  imageStyle,
}: {
  uri: string;
  treatment: PhotoTreatment;
  containerStyle: any;
  imageStyle: any;
}) {
  if (Platform.OS === 'web') {
    const filter =
      treatment === 'frost' ? 'grayscale(100%) blur(2.5px) contrast(0.95)' :
      treatment === 'bw'    ? 'grayscale(100%) contrast(0.95)' :
                              'none';
    return (
      <Image
        source={{ uri }}
        style={[
          imageStyle,
          // @ts-ignore web-only style
          {
            filter: filter !== 'none' ? filter : undefined,
            WebkitFilter: filter !== 'none' ? filter : undefined,
          },
        ]}
        resizeMode="cover"
      />
    );
  }

  // Native
  if (treatment === 'colour') {
    return (
      <View style={containerStyle}>
        <Image source={{ uri }} style={imageStyle} resizeMode="cover" />
      </View>
    );
  }

  if (treatment === 'bw') {
    return (
      <View style={containerStyle}>
        <Grayscale amount={1} style={StyleSheet.absoluteFill}>
          <Image source={{ uri }} style={imageStyle} resizeMode="cover" />
        </Grayscale>
      </View>
    );
  }

  // frost (SANCTUARY)
  return (
    <View style={containerStyle}>
      <Grayscale amount={1} style={StyleSheet.absoluteFill}>
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
  const mode = MODES[HOME_MODE];
  const styles = makeStyles(mode);

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

  // ── MOSAIC LAYOUT (E1/E2/E3/E4) ────────────────────────────────────────
  if (mode.layout === 'mosaic') {
    return (
      <View style={[styles.root]}>
        <StatusBar barStyle={mode.statusBarStyle} backgroundColor={mode.pagePaper} />

        <View style={[styles.mosaicScreen, { paddingTop: insets.top }]}>
          {/* HERO TILE — solid gradient, type only */}
          <LinearGradient
            colors={mode.heroGradient!}
            style={styles.mosaicHero}
          >
            <Text style={styles.weekday}>{weekday}</Text>
            <Text style={styles.dateLine}>{dayWord} of {month}</Text>
            <Text style={styles.year}>{year}</Text>
            <View style={styles.rule} />
            <View style={styles.daysWrap}>
              <Text style={styles.daysNum}>{days}</Text>
              <Text style={styles.daysWord}>{FrostCopy.landing.daysWord}</Text>
            </View>
          </LinearGradient>

          {/* PHOTO ROW — Muse | Discover, edge to edge */}
          <View style={styles.mosaicPhotoRow}>
            <Pressable
              style={[styles.mosaicPhotoTile, styles.mosaicPhotoLeft]}
              onPress={goMuse}
              onLongPress={goMuse}
              accessibilityLabel="Muse"
            >
              {museUrl ? (
                <ModePhoto
                  uri={museUrl}
                  treatment={mode.photoTreatment}
                  containerStyle={StyleSheet.absoluteFill}
                  imageStyle={styles.photoImg}
                />
              ) : null}
              <Text style={styles.mosaicTileLabel}>Muse</Text>
              <View style={styles.mosaicTileDot} />
            </Pressable>

            <Pressable
              style={styles.mosaicPhotoTile}
              onPress={goDiscover}
              onLongPress={goDiscover}
              accessibilityLabel="Discover"
            >
              {discoverUrl ? (
                <ModePhoto
                  uri={discoverUrl}
                  treatment={mode.photoTreatment}
                  containerStyle={StyleSheet.absoluteFill}
                  imageStyle={styles.photoImg}
                />
              ) : null}
              <Text style={styles.mosaicTileLabel}>Discover</Text>
              <View style={styles.mosaicTileDot} />
            </Pressable>
          </View>

          {/* DREAM AI — gradient tile */}
          <Pressable onPress={goDream} onLongPress={goDream} accessibilityLabel="Dream Ai">
            <LinearGradient colors={mode.dreamGradient!} style={styles.mosaicVoice}>
              <Text style={styles.dreamLabel}>Dream Ai</Text>
              <View style={styles.dreamLine}>
                <Text style={styles.dreamGlyph}>✦</Text>
                <Text style={styles.dreamText}>{lineA}</Text>
              </View>
              <View style={styles.dreamLine}>
                <Text style={styles.dreamGlyph}>✦</Text>
                <Text style={styles.dreamText}>{lineB}</Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* CIRCLE — gradient tile */}
          <Pressable onPress={goCircle} onLongPress={goCircle} accessibilityLabel="Circle">
            <LinearGradient colors={mode.circleGradient!} style={styles.mosaicVoice}>
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
            </LinearGradient>
          </Pressable>

          {/* JOURNEY — gradient foot anchor */}
          <Pressable
            onPress={goJourney}
            onLongPress={goJourney}
            accessibilityLabel="Journey"
            style={{ paddingBottom: Math.max(insets.bottom, 0) }}
          >
            <LinearGradient colors={mode.journeyGradient!} style={styles.mosaicJourney}>
              <Text style={styles.journeyLabel}>Journey</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── CLASSIC LAYOUT (SANCTUARY/A/B/C) ───────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle={mode.statusBarStyle} backgroundColor={mode.pagePaper} />

      {/* Hero block */}
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

      {/* Two image boxes */}
      <View style={styles.gridRow}>
        <Pressable
          style={styles.imgBox}
          onPress={goMuse}
          onLongPress={goMuse}
          accessibilityLabel="Muse"
        >
          <View style={styles.photoFrame}>
            {museUrl ? (
              <ModePhoto
                uri={museUrl}
                treatment={mode.photoTreatment}
                containerStyle={StyleSheet.absoluteFill}
                imageStyle={styles.photoImg}
              />
            ) : null}
            {mode.photoBottomGradient ? (
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']}
                style={styles.photoGradientBottom}
                pointerEvents="none"
              />
            ) : null}
          </View>
          <View style={[styles.boxDot, { backgroundColor: mode.brass }]} />
        </Pressable>

        <Pressable
          style={styles.imgBox}
          onPress={goDiscover}
          onLongPress={goDiscover}
          accessibilityLabel="Discover"
        >
          <View style={styles.photoFrame}>
            {discoverUrl ? (
              <ModePhoto
                uri={discoverUrl}
                treatment={mode.photoTreatment}
                containerStyle={StyleSheet.absoluteFill}
                imageStyle={styles.photoImg}
              />
            ) : null}
            {mode.photoBottomGradient ? (
              <LinearGradient
                colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']}
                style={styles.photoGradientBottom}
                pointerEvents="none"
              />
            ) : null}
          </View>
          <View style={[styles.boxDot, { backgroundColor: mode.brass }]} />
        </Pressable>
      </View>

      {/* Dream AI card */}
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

      {/* Circle card */}
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

      {/* Journey button */}
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
function makeStyles(m: ModeDescriptor) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: m.pagePaper,
    },

    // ── Mosaic layout ─────────────────────────────────────────────────────
    mosaicScreen: {
      flex: 1,
      flexDirection: 'column',
    },
    mosaicHero: {
      flex: 4,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
      paddingVertical: 18,
    },
    mosaicPhotoRow: {
      flex: 4,
      flexDirection: 'row',
    },
    mosaicPhotoTile: {
      flex: 1,
      overflow: 'hidden',
      backgroundColor: m.cardFill,
      position: 'relative',
    },
    mosaicPhotoLeft: {
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: m.hairline,
    },
    mosaicTileLabel: {
      position: 'absolute',
      top: 14,
      left: 14,
      fontFamily: FrostFonts.label,
      fontWeight: '300',
      fontSize: 9,
      letterSpacing: 3,
      color: m.layout === 'mosaic' && m.photoTreatment !== 'bw' && m.statusBarStyle === 'dark-content'
        ? 'rgba(255,255,255,0.92)'
        : 'rgba(255,255,255,0.92)',
      textTransform: 'uppercase',
      textShadowColor: 'rgba(0,0,0,0.55)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 4,
    },
    mosaicTileDot: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: m.brass,
    },
    mosaicVoice: {
      paddingVertical: 16,
      paddingHorizontal: 22,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: m.hairline,
    },
    mosaicJourney: {
      paddingVertical: 18,
      alignItems: 'center',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: m.hairline,
    },

    // ── Hero (classic) ────────────────────────────────────────────────────
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
      color: m.ink,
    },
    dateLine: {
      fontFamily: FrostFonts.display,
      fontWeight: '400',
      fontStyle: 'italic',
      fontSize: 30,
      lineHeight: 34,
      color: m.brass,
      letterSpacing: 0.3,
      marginTop: 2,
      textAlign: 'center',
    },
    year: {
      fontFamily: FrostFonts.display,
      fontWeight: '300',
      fontSize: 18,
      lineHeight: 22,
      color: m.ink,
      marginTop: 2,
    },
    rule: {
      width: 40,
      height: StyleSheet.hairlineWidth,
      backgroundColor: m.hairline,
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
      color: m.brass,
    },
    daysWord: {
      fontFamily: FrostFonts.label,
      fontWeight: '400',
      fontSize: 10,
      letterSpacing: 3,
      textTransform: 'uppercase',
      color: m.brass,
    },

    // ── Image boxes (classic) ─────────────────────────────────────────────
    gridRow: {
      flexDirection: 'row',
      gap: m.cardRadius === 0 ? 0 : 12,
      paddingHorizontal: m.cardRadius === 0 ? 0 : 18,
      marginTop: m.cardRadius === 0 ? 0 : 10,
    },
    imgBox: {
      flex: 1,
      aspectRatio: m.photoAspect,
      backgroundColor: m.stampFill,
      borderWidth: m.cardRadius === 0 ? 0 : StyleSheet.hairlineWidth,
      borderColor: m.hairline,
      borderRadius: m.imgBoxRadius,
      overflow: 'hidden',
    },
    photoFrame: {
      position: 'absolute',
      top:    m.cardRadius === 0 ? 0 : 8,
      left:   m.cardRadius === 0 ? 0 : 8,
      right:  m.cardRadius === 0 ? 0 : 8,
      bottom: m.cardRadius === 0 ? 0 : 8,
      borderRadius: m.photoFrameRadius,
      overflow: 'hidden',
      backgroundColor: m.cardFill,
    },
    photoImg: {
      width: '100%',
      height: '100%',
    },
    photoGradientBottom: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '38%',
    },
    boxDot: {
      position: 'absolute',
      left: m.cardRadius === 0 ? 14 : 18,
      top:  m.cardRadius === 0 ? 14 : 18,
      width: 6,
      height: 6,
      borderRadius: 3,
    },

    // ── Dream Ai card (classic) ───────────────────────────────────────────
    dreamCard: {
      marginTop: m.cardRadius === 0 ? 0 : 12,
      marginHorizontal: m.cardRadius === 0 ? 0 : 18,
      backgroundColor: m.stampFill,
      borderWidth: m.cardRadius === 0 ? 0 : StyleSheet.hairlineWidth,
      borderColor: m.hairlineStrong,
      borderRadius: m.cardRadius,
      paddingVertical: 18,
      paddingHorizontal: 20,
    },
    dreamLabel: {
      fontFamily: FrostFonts.display,
      fontWeight: '600',
      fontStyle: 'italic',
      fontSize: 19,
      letterSpacing: 0.4,
      color: m.brass,
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
      color: m.soft,
      marginTop: 3,
    },
    dreamText: {
      flex: 1,
      fontFamily: FrostFonts.display,
      fontWeight: '300',
      fontStyle: 'italic',
      fontSize: 15,
      lineHeight: 21,
      color: m.soft,
    },

    // ── Circle card (classic) ─────────────────────────────────────────────
    circleCard: {
      marginTop: m.cardRadius === 0 ? 0 : 12,
      marginHorizontal: m.cardRadius === 0 ? 0 : 18,
      backgroundColor: m.stampFill,
      borderWidth: m.cardRadius === 0 ? 0 : StyleSheet.hairlineWidth,
      borderColor: m.hairlineStrong,
      borderRadius: m.cardRadius,
      paddingVertical: 18,
      paddingHorizontal: 20,
    },
    circleLabel: {
      fontFamily: FrostFonts.display,
      fontWeight: '600',
      fontStyle: 'italic',
      fontSize: 19,
      letterSpacing: 0.4,
      color: m.brass,
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
      color: m.soft,
      marginTop: 3,
    },
    circleText: {
      flex: 1,
      fontFamily: FrostFonts.display,
      fontWeight: '300',
      fontStyle: 'italic',
      fontSize: 15,
      lineHeight: 21,
      color: m.soft,
    },

    // ── Journey button (classic) ──────────────────────────────────────────
    journeyBox: {
      marginHorizontal: m.cardRadius === 0 ? 0 : 18,
      backgroundColor: m.stampFill,
      borderWidth: m.cardRadius === 0 ? 0 : StyleSheet.hairlineWidth,
      borderColor: m.hairlineStrong,
      borderRadius: m.cardRadius === 0 ? 0 : 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    journeyLabel: {
      fontFamily: FrostFonts.display,
      fontWeight: '600',
      fontStyle: 'italic',
      fontSize: 19,
      letterSpacing: 0.8,
      color: m.brass,
    },
  });
}
