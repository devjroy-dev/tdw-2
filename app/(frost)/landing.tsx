/**
 * Frost — Landing (v7 — Dark/Light picker is a user feature).
 *
 * Modes:
 *   E1A ("Dark")  — Dark mosaic, warm-night frame.
 *   E3  ("Light") — Light mosaic, warm paper.
 *
 * E1B was a dev iteration and has been removed. The picker is now a
 * permanent user feature (SHOW_MODE_PICKER stays true): long-press the
 * date to open the sheet and switch tone (Dark / Light) or content
 * (Dream / Sanctuary). The selection persists per device via AsyncStorage.
 *
 * Internal code variable names (E1A, E3) are retained — only user-facing
 * strings say "Dark" and "Light".
 *
 * Grayscale import stays Platform-gated to keep web bundling working
 * during `eas update` (color-matrix lib can't be bundled for web).
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image, Platform, StatusBar,
  Modal, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FrostFonts, FrostCopy,
} from '../../constants/frost';
import {
  brideIdle, fetchHomeImages, fetchCircleFeed, formatCircleActivity,
} from '../../services/frostApi';
import { fetchPagesSummary } from '../../services/pagesApi';

// ── Platform-gated Grayscale import ────────────────────────────────────────
// Imports from GrayscaleShim.native.tsx on iOS/Android (real filter) and
// from GrayscaleShim.web.tsx on web (no-op passthrough). The split is
// required because react-native-color-matrix-image-filters imports
// react-native internals that can't be bundled for web.
import { Grayscale } from '../../components/frost/GrayscaleShim';

// ─── Wedding date — wired to user profile in v1.7 ──────────────────────────
const WEDDING_DATE = new Date('2026-09-25T00:00:00+05:30');

// ═══════════════════════════════════════════════════════════════════════════
// MODE PICKER CONFIG
// ═══════════════════════════════════════════════════════════════════════════

type HomeModeKey = 'E1A' | 'E3';

// User feature: long-press the date to open the picker sheet. Stays true.
const SHOW_MODE_PICKER = true;

// Default mode used until the bride picks one (and on first launch).
const DEFAULT_MODE: HomeModeKey = 'E3';

// AsyncStorage key for the per-device chosen mode
const MODE_STORAGE_KEY = '@frost.home_mode';

// ── SANCTUARY MODE — Content axis (new May 10, Session 29) ──
// Orthogonal to Tone (homeMode). Each axis persists independently.
type ContentMode = 'dream' | 'sanctuary';
const CONTENT_MODE_STORAGE_KEY = '@frost.content_mode';
const DEFAULT_CONTENT_MODE: ContentMode = 'dream';

// Order modes for the picker sheet (matches mockup viewing order)
const CYCLE_ORDER: HomeModeKey[] = ['E1A', 'E3'];

// User-facing names for the picker sheet
const MODE_LABELS: Record<HomeModeKey, { title: string; sub: string }> = {
  E1A: { title: 'Dark',  sub: 'Warm-night frame, soft dark descent' },
  E3:  { title: 'Light', sub: 'Warm paper, atelier frame' },
};

// ─── Mode descriptors ──────────────────────────────────────────────────────
type Layout = 'classic' | 'mosaic';
type PhotoTreatment = 'frost' | 'colour' | 'bw';

interface ModeDescriptor {
  layout:           Layout;
  photoTreatment:   PhotoTreatment;
  pagePaper:        string;
  cardFill:         string;
  stampFill:        string;
  hairline:         string;
  hairlineStrong:   string;
  ink:              string;
  soft:             string;
  brass:            string;
  brassMuted:       string;
  imgBoxRadius:     number;
  photoFrameRadius: number;
  cardRadius:       number;
  photoAspect:      number;
  statusBarStyle:   'dark-content' | 'light-content';
  heroGradient?:    [string, string];
  dreamGradient?:   [string, string];
  circleGradient?:  [string, string];
  journeyGradient?: [string, string];
  photoBottomGradient?: boolean;
  // Sanctuary mode gradients — interpolated between circle bottom → journey top
  // in three equal tonal steps. Same paper, same brass, same fonts. Hidden in
  // Dream mode; visible only when contentMode === 'sanctuary'.
  museGradient?:    [string, string];
  momentsGradient?: [string, string];
  pagesGradient?:   [string, string];
}

const MODES: Record<HomeModeKey, ModeDescriptor> = {
  // E1 A — pleasant dark range. Hero ends slightly lifted (current behaviour kept),
  // photo paper sits one step deeper at #1F1915, then dream descends from there.
  // Photo→dream handoff is invisible. Hero→photo is a small deepening step.
  E1A: {
    layout: 'mosaic', photoTreatment: 'colour',
    pagePaper: '#1B1612', cardFill: '#1B1612', stampFill: '#1F1915',
    hairline: 'rgba(191,160,77,0.18)', hairlineStrong: 'rgba(191,160,77,0.22)',
    ink: '#F5F0E8', soft: 'rgba(245,240,232,0.62)',
    brass: '#BFA04D', brassMuted: '#A8924B',
    imgBoxRadius: 0, photoFrameRadius: 0, cardRadius: 0,
    photoAspect: 1 / 1, statusBarStyle: 'light-content',
    heroGradient:    ['#1B1612', '#231D17'],
    dreamGradient:   ['#1F1915', '#1A1410'],
    circleGradient:  ['#1A1410', '#15110E'],
    // Sanctuary descent: circle bottom #15110E → journey top #15110E
    // (same point — so we step through three increasingly deep paper stops)
    museGradient:    ['#15110E', '#13100D'],
    momentsGradient: ['#13100D', '#110E0B'],
    pagesGradient:   ['#110E0B', '#100C0A'],
    journeyGradient: ['#15110E', '#100C0A'],
  },
  // E3 — light, warm paper. Unchanged from prior shipped behaviour.
  E3: {
    layout: 'mosaic', photoTreatment: 'colour',
    pagePaper: '#D8D3CC', cardFill: '#D8D3CC', stampFill: '#C8C2BA',
    hairline: 'rgba(44,40,35,0.12)', hairlineStrong: 'rgba(44,40,35,0.18)',
    ink: '#2C2823', soft: '#5A5650',
    brass: '#BFA04D', brassMuted: '#A8924B',
    imgBoxRadius: 0, photoFrameRadius: 0, cardRadius: 0,
    photoAspect: 1 / 1, statusBarStyle: 'dark-content',
    heroGradient:    ['#D8D3CC', '#CFC9C1'],
    dreamGradient:   ['#C8C2BA', '#BBB5AC'],
    circleGradient:  ['#BCB6AD', '#B0AAA1'],
    // Sanctuary descent: circle bottom #B0AAA1 → journey top #A8A29A
    // Three quiet steps down the warm-grey ramp
    museGradient:    ['#B0AAA1', '#ACA69D'],
    momentsGradient: ['#ACA69D', '#A8A29A'],
    pagesGradient:   ['#A8A29A', '#A09A91'],
    journeyGradient: ['#A8A29A', '#948E86'],
  },
};

const PHOTO_FROST_TINT = 'rgba(154,149,142,0.10)';

// ─── Static fallback line picker ───────────────────────────────────────────
function pickFallbackLines(): [string, string] {
  const hour = new Date().getHours();
  const pool = FrostCopy.idlePool;
  return [pool[hour % pool.length], pool[(hour + 4) % pool.length]];
}

// ─── Date helpers ──────────────────────────────────────────────────────────
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
function ModePhoto({
  uri, treatment, containerStyle, imageStyle,
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

// ─── Mode picker bottom sheet ──────────────────────────────────────────────
// Two-section sheet: CONTENT (Dream / Sanctuary) above TONE (Dark / Light).
// Stays open after a selection so bride can adjust both axes; italic "Done" dismisses.
const CONTENT_OPTIONS: { key: ContentMode; title: string; sub: string }[] = [
  { key: 'dream',     title: 'Dream',     sub: 'Photos and inspiration' },
  { key: 'sanctuary', title: 'Sanctuary', sub: 'A quiet space — your planner' },
];

function ModePickerSheet({
  visible, currentMode, contentMode, onPick, onPickContent, onClose,
}: {
  visible: boolean;
  currentMode: HomeModeKey;
  contentMode: ContentMode;
  onPick: (m: HomeModeKey) => void;
  onPickContent: (c: ContentMode) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose}>
        <Pressable style={pickerStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={pickerStyles.handle} />
          <Text style={pickerStyles.title}>Pick a home rendition</Text>
          <Text style={pickerStyles.sub}>Pick tone and content. The sheet stays open for both.</Text>
          <ScrollView style={{ maxHeight: 540 }}>
            {/* CONTENT section */}
            <Text style={pickerStyles.sectionEyebrow}>CONTENT</Text>
            {CONTENT_OPTIONS.map((c) => {
              const isCurrent = c.key === contentMode;
              return (
                <Pressable
                  key={c.key}
                  onPress={() => onPickContent(c.key)}
                  style={[pickerStyles.row, isCurrent && pickerStyles.rowActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[pickerStyles.rowTitle, isCurrent && pickerStyles.rowTitleActive]}>
                      {c.title}
                    </Text>
                    <Text style={pickerStyles.rowSub}>{c.sub}</Text>
                  </View>
                  {isCurrent ? <View style={pickerStyles.dot} /> : null}
                </Pressable>
              );
            })}
            {/* TONE section */}
            <Text style={pickerStyles.sectionEyebrow}>TONE</Text>
            {CYCLE_ORDER.map((m) => {
              const isCurrent = m === currentMode;
              return (
                <Pressable
                  key={m}
                  onPress={() => onPick(m)}
                  style={[pickerStyles.row, isCurrent && pickerStyles.rowActive]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[pickerStyles.rowTitle, isCurrent && pickerStyles.rowTitleActive]}>
                      {MODE_LABELS[m].title}
                    </Text>
                    <Text style={pickerStyles.rowSub}>{MODE_LABELS[m].sub}</Text>
                  </View>
                  {isCurrent ? <View style={pickerStyles.dot} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable onPress={onClose} style={pickerStyles.dismiss}>
            <Text style={pickerStyles.dismissText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1B1612',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingBottom: 40,
    paddingTop: 12,
    paddingHorizontal: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(191,160,77,0.22)',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(245,240,232,0.3)',
    alignSelf: 'center', marginBottom: 12,
  },
  title: {
    fontFamily: FrostFonts.display, fontStyle: 'italic',
    fontSize: 22, color: '#BFA04D', textAlign: 'center', marginBottom: 4,
  },
  sub: {
    fontFamily: FrostFonts.body, fontSize: 12,
    color: 'rgba(245,240,232,0.55)', textAlign: 'center', marginBottom: 16,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 12, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  rowActive: {
    backgroundColor: 'rgba(191,160,77,0.12)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(191,160,77,0.4)',
  },
  rowTitle: {
    fontFamily: FrostFonts.display, fontStyle: 'italic',
    fontSize: 16, color: '#F5F0E8',
  },
  rowTitleActive: { color: '#BFA04D' },
  rowSub: {
    fontFamily: FrostFonts.body, fontSize: 12, marginTop: 2,
    color: 'rgba(245,240,232,0.55)',
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#BFA04D',
  },
  dismiss: {
    marginTop: 14, paddingVertical: 14, alignItems: 'center',
  },
  dismissText: {
    // Italic Cormorant for "Done" — frost editorial register, not utility
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 16, letterSpacing: 0.4,
    color: '#BFA04D',
  },
  // Eyebrow above each section (CONTENT, TONE)
  sectionEyebrow: {
    fontFamily: FrostFonts.label, fontSize: 9, fontWeight: '300',
    letterSpacing: 3.6, textTransform: 'uppercase',
    color: 'rgba(245,240,232,0.42)',
    marginTop: 14, marginBottom: 8, paddingHorizontal: 14,
  },
});

// ─── Screen ────────────────────────────────────────────────────────────────
export default function FrostLanding() {
  const insets = useSafeAreaInsets();

  // Mode state — initial value loaded from AsyncStorage on mount.
  const [homeMode, setHomeMode] = useState<HomeModeKey>(DEFAULT_MODE);
  const [contentMode, setContentMode] = useState<ContentMode>(DEFAULT_CONTENT_MODE);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Toast state — used when bride flips Content via badge tap
  const [toast, setToast] = useState<string | null>(null);
  const toastFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!SHOW_MODE_PICKER) {
      setHomeMode(DEFAULT_MODE);
      // contentMode still loads — it persists regardless of SHOW_MODE_PICKER
    }
    let cancelled = false;
    (async () => {
      try {
        // Load tonal mode (only when picker is shown)
        if (SHOW_MODE_PICKER) {
          const stored = await AsyncStorage.getItem(MODE_STORAGE_KEY);
          if (!cancelled && stored && CYCLE_ORDER.includes(stored as HomeModeKey)) {
            setHomeMode(stored as HomeModeKey);
          }
        }
        // Load content mode (always)
        const storedContent = await AsyncStorage.getItem(CONTENT_MODE_STORAGE_KEY);
        if (!cancelled && (storedContent === 'dream' || storedContent === 'sanctuary')) {
          setContentMode(storedContent);
        }
      } catch {
        // silent — fallback to defaults
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persistContentMode = useCallback(async (m: ContentMode) => {
    setContentMode(m);
    try { await AsyncStorage.setItem(CONTENT_MODE_STORAGE_KEY, m); } catch {}
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    Animated.sequence([
      Animated.timing(toastFade, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastFade, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [toastFade]);

  const flipContent = useCallback(() => {
    const next: ContentMode = contentMode === 'dream' ? 'sanctuary' : 'dream';
    Haptics.selectionAsync?.();
    persistContentMode(next);
    showToast(next === 'sanctuary' ? 'Now in Sanctuary' : 'Now in Dream');
  }, [contentMode, persistContentMode, showToast]);

  const persistMode = useCallback(async (m: HomeModeKey) => {
    setHomeMode(m);
    try { await AsyncStorage.setItem(MODE_STORAGE_KEY, m); } catch {}
  }, []);

  const openPicker = useCallback(() => {
    if (!SHOW_MODE_PICKER) return;
    Haptics.selectionAsync?.();
    setPickerOpen(true);
  }, []);

  const handlePick = useCallback((m: HomeModeKey) => {
    persistMode(m);
    setPickerOpen(false);
  }, [persistMode]);

  const mode = MODES[homeMode];
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
      } catch {}
    };
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Home-screen images — refresh on every focus
  const [museUrl, setMuseUrl] = useState<string | null>(null);
  const [discoverUrl, setDiscoverUrl] = useState<string | null>(null);
  const [circleLines, setCircleLines] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // Only fetch home images in Dream mode — Sanctuary has no photo row
      if (contentMode === 'dream') {
        (async () => {
          try {
            const r = await fetchHomeImages();
            if (cancelled || !r?.success) return;
            setMuseUrl(r.muse_image_url || null);
            setDiscoverUrl(r.discover_image_url || null);
            // Prefetch so boxes don't flash empty during refresh
            if (r.muse_image_url)     Image.prefetch(r.muse_image_url).catch(() => {});
            if (r.discover_image_url) Image.prefetch(r.discover_image_url).catch(() => {});
          } catch {}
        })();
      }
      (async () => {
        try {
          const events = await fetchCircleFeed(10);
          if (cancelled) return;
          const lines = (events || []).slice(0, 2).map(formatCircleActivity);
          setCircleLines(lines);
        } catch {}
      })();
      return () => { cancelled = true; };
    }, [contentMode]),
  );

  // Sanctuary sub-line strings — fetched on focus when in Sanctuary mode
  const [sanctuarySublines, setSanctuarySublines] = useState<{ muse: string; moments: string; pages: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (contentMode === 'sanctuary') {
        (async () => {
          try {
            const r = await fetchPagesSummary();
            if (cancelled || !r?.success) return;
            setSanctuarySublines(r.data || null);
          } catch {}
        })();
      }
      return () => { cancelled = true; };
    }, [contentMode]),
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
  const goPages    = () => { Haptics.selectionAsync?.(); router.push('/(frost)/canvas/pages' as any); };
  const goMoments  = () => { Haptics.selectionAsync?.(); showToast('Moments arrives next.'); };

  // ── MOSAIC LAYOUT (Dark/Light) — Dream OR Sanctuary content ───────────
  if (mode.layout === 'mosaic') {
    const isSanctuary = contentMode === 'sanctuary';
    const sanctuaryMuseLine    = sanctuarySublines?.muse || 'Loading…';
    const sanctuaryMomentsLine = sanctuarySublines?.moments || 'These moments will always remind you of your journey.';
    const sanctuaryPagesLine   = sanctuarySublines?.pages || 'Loading…';

    return (
      <View style={[styles.root]}>
        <StatusBar barStyle={mode.statusBarStyle} backgroundColor={mode.pagePaper} />

        <View style={[styles.mosaicScreen, { paddingTop: insets.top }]}>
          {/* HERO TILE — wraps date + countdown. Long-press = picker.
              Mode badge is a separate Pressable, non-propagating — single tap flips Content. */}
          <View style={{ flex: 4 }}>
            <Pressable
              onLongPress={openPicker}
              delayLongPress={500}
              style={{ flex: 1 }}
            >
              <LinearGradient colors={mode.heroGradient!} style={styles.mosaicHero}>
                <Text style={styles.mosaicWeekday}>{weekday}</Text>
                <Text style={styles.mosaicDateLine}>{dayWord} of {month}</Text>
                <Text style={styles.mosaicYear}>{year}</Text>
                <View style={styles.mosaicRule} />
                <View style={styles.daysWrap}>
                  <Text style={styles.mosaicDaysNum}>{days}</Text>
                  <Text style={styles.mosaicDaysWord}>{FrostCopy.landing.daysWord}</Text>
                </View>
              </LinearGradient>
            </Pressable>
            {/* Mode badge sits absolute over the hero. Tap flips Content. Doesn't propagate. */}
            <Pressable
              onPress={flipContent}
              hitSlop={12}
              style={styles.mosaicBadgePressable}
              accessibilityLabel={`Flip to ${isSanctuary ? 'Dream' : 'Sanctuary'} mode`}
            >
              {SHOW_MODE_PICKER ? (
                <Text style={styles.mosaicModeBadge}>{homeMode}</Text>
              ) : null}
              <Text style={styles.mosaicModeBadgeContent}>
                {isSanctuary ? 'SANCTUARY' : 'DREAM'}
              </Text>
            </Pressable>
          </View>

          {/* ── DREAM CONTENT — original photo row + 3 voice tiles ── */}
          {!isSanctuary ? (
            <>
              <View style={styles.mosaicPhotoRow}>
                <Pressable
                  style={[styles.mosaicPhotoTile, styles.mosaicPhotoLeft]}
                  onLongPress={goMuse}
                  accessibilityLabel="Muse"
                >
                  {museUrl ? (
                    <ModePhoto
                      uri={museUrl} treatment={mode.photoTreatment}
                      containerStyle={StyleSheet.absoluteFill} imageStyle={styles.photoImg}
                    />
                  ) : null}
                  <Text style={styles.mosaicTileLabel}>Muse</Text>
                  <View style={styles.mosaicTileDot} />
                </Pressable>

                <Pressable
                  style={styles.mosaicPhotoTile}
                  onLongPress={goDiscover}
                  accessibilityLabel="Discover"
                >
                  {discoverUrl ? (
                    <ModePhoto
                      uri={discoverUrl} treatment={mode.photoTreatment}
                      containerStyle={StyleSheet.absoluteFill} imageStyle={styles.photoImg}
                    />
                  ) : null}
                  <Text style={styles.mosaicTileLabel}>Discover</Text>
                  <View style={styles.mosaicTileDot} />
                </Pressable>
              </View>

              <Pressable
                onLongPress={goDream}
                accessibilityLabel="Dream Ai"
                style={{ flex: 2.4 }}
              >
                <LinearGradient colors={mode.dreamGradient!} style={styles.mosaicVoice}>
                  <Text style={styles.mosaicDreamLabel}>Dream Ai</Text>
                  <View style={styles.mosaicDreamLine}>
                    <Text style={styles.mosaicDreamGlyph}>✦</Text>
                    <Text style={styles.mosaicDreamText}>{lineA}</Text>
                  </View>
                  <View style={styles.mosaicDreamLine}>
                    <Text style={styles.mosaicDreamGlyph}>✦</Text>
                    <Text style={styles.mosaicDreamText}>{lineB}</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                onLongPress={goCircle}
                accessibilityLabel="Circle"
                style={{ flex: 1.8 }}
              >
                <LinearGradient colors={mode.circleGradient!} style={styles.mosaicVoice}>
                  <Text style={styles.mosaicCircleLabel}>Circle</Text>
                  {circleLines.length > 0 ? (
                    circleLines.map((line, idx) => (
                      <View key={idx} style={styles.mosaicCircleLine}>
                        <Text style={styles.mosaicCircleGlyph}>✦</Text>
                        <Text style={styles.mosaicCircleText}>{line}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.mosaicCircleLine}>
                      <Text style={styles.mosaicCircleGlyph}>✦</Text>
                      <Text style={styles.mosaicCircleText}>Quiet here for now.</Text>
                    </View>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={goJourney} onLongPress={goJourney}
                accessibilityLabel="Journey"
                style={{ flex: 1.2, paddingBottom: Math.max(insets.bottom, 0) }}
              >
                <LinearGradient colors={mode.journeyGradient!} style={styles.mosaicJourney}>
                  <Text style={styles.mosaicJourneyLabel}>Journey</Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            // ── SANCTUARY CONTENT — 6 stacked tonal bands, no photo row ──
            // Flex distribution: clean 0.25 descent for symmetric pour
            <>
              <Pressable
                onLongPress={goDream}
                accessibilityLabel="Dream Ai"
                style={{ flex: 2.25 }}
              >
                <LinearGradient colors={mode.dreamGradient!} style={styles.mosaicVoice}>
                  <Text style={styles.mosaicSanctuaryLabel}>Dream Ai</Text>
                  <View style={styles.mosaicDreamLine}>
                    <Text style={styles.mosaicSanctuaryGlyph}>✦</Text>
                    <Text style={styles.mosaicSanctuaryText}>{lineA}</Text>
                  </View>
                  <View style={styles.mosaicDreamLine}>
                    <Text style={styles.mosaicSanctuaryGlyph}>✦</Text>
                    <Text style={styles.mosaicSanctuaryText}>{lineB}</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                onLongPress={goCircle}
                accessibilityLabel="Circle"
                style={{ flex: 2.0 }}
              >
                <LinearGradient colors={mode.circleGradient!} style={styles.mosaicVoice}>
                  <Text style={styles.mosaicSanctuaryLabel}>Circle</Text>
                  {circleLines.length > 0 ? (
                    circleLines.map((line, idx) => (
                      <View key={idx} style={styles.mosaicCircleLine}>
                        <Text style={styles.mosaicSanctuaryGlyph}>✦</Text>
                        <Text style={styles.mosaicSanctuaryText}>{line}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={styles.mosaicCircleLine}>
                      <Text style={styles.mosaicSanctuaryGlyph}>✦</Text>
                      <Text style={styles.mosaicSanctuaryText}>Quiet here for now.</Text>
                    </View>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable
                onLongPress={goMuse}
                accessibilityLabel="Muse"
                style={{ flex: 1.75 }}
              >
                <LinearGradient colors={mode.museGradient || mode.circleGradient!} style={styles.mosaicVoice}>
                  <Text style={styles.mosaicSanctuaryLabel}>Muse</Text>
                  <View style={styles.mosaicCircleLine}>
                    <Text style={styles.mosaicSanctuaryGlyph}>✦</Text>
                    <Text style={styles.mosaicSanctuaryText}>{sanctuaryMuseLine}</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={goMoments} onLongPress={goMoments}
                accessibilityLabel="Moments"
                style={{ flex: 1.5 }}
              >
                <LinearGradient colors={mode.momentsGradient || mode.circleGradient!} style={styles.mosaicVoice}>
                  <Text style={styles.mosaicSanctuaryLabel}>Moments</Text>
                  <View style={styles.mosaicCircleLine}>
                    <Text style={styles.mosaicSanctuaryGlyph}>✦</Text>
                    <Text style={styles.mosaicSanctuaryText}>{sanctuaryMomentsLine}</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={goPages} onLongPress={goPages}
                accessibilityLabel="Pages"
                style={{ flex: 1.25 }}
              >
                <LinearGradient colors={mode.pagesGradient || mode.circleGradient!} style={styles.mosaicVoice}>
                  <Text style={styles.mosaicSanctuaryLabel}>Pages</Text>
                  <View style={styles.mosaicCircleLine}>
                    <Text style={styles.mosaicSanctuaryGlyph}>✦</Text>
                    <Text style={styles.mosaicSanctuaryText}>{sanctuaryPagesLine}</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={goJourney} onLongPress={goJourney}
                accessibilityLabel="Journey"
                style={{ flex: 1.0, paddingBottom: Math.max(insets.bottom, 0) }}
              >
                <LinearGradient colors={mode.journeyGradient!} style={styles.mosaicJourney}>
                  <Text style={styles.mosaicJourneyLabel}>Journey</Text>
                </LinearGradient>
              </Pressable>
            </>
          )}
        </View>

        <ModePickerSheet
          visible={pickerOpen}
          currentMode={homeMode}
          contentMode={contentMode}
          onPick={handlePick}
          onPickContent={(c) => persistContentMode(c)}
          onClose={() => setPickerOpen(false)}
        />

        {/* Toast — shown when bride flips Content via badge */}
        {toast ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.toastWrap,
              { opacity: toastFade, bottom: insets.bottom + 60 },
            ]}
          >
            <Text style={styles.toastText}>{toast}</Text>
          </Animated.View>
        ) : null}
      </View>
    );
  }

  // ── CLASSIC LAYOUT (SANCTUARY/A/B/C) ──────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle={mode.statusBarStyle} backgroundColor={mode.pagePaper} />

      {/* Hero block — long-press opens picker */}
      <Pressable
        onLongPress={openPicker}
        delayLongPress={500}
        style={styles.hero}
      >
        <Text style={styles.weekday}>{weekday}</Text>
        <Text style={styles.dateLine}>{dayWord} of {month}</Text>
        <Text style={styles.year}>{year}</Text>
        <View style={styles.rule} />
        <View style={styles.daysWrap}>
          <Text style={styles.daysNum}>{days}</Text>
          <Text style={styles.daysWord}>{FrostCopy.landing.daysWord}</Text>
        </View>
        {SHOW_MODE_PICKER ? (
          <Text style={styles.modeBadge}>{homeMode}</Text>
        ) : null}
      </Pressable>

      {/* Two image boxes */}
      <View style={styles.gridRow}>
        <Pressable
          style={styles.imgBox} onLongPress={goMuse}
          accessibilityLabel="Muse"
        >
          <View style={styles.photoFrame}>
            {museUrl ? (
              <ModePhoto
                uri={museUrl} treatment={mode.photoTreatment}
                containerStyle={StyleSheet.absoluteFill} imageStyle={styles.photoImg}
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
          style={styles.imgBox} onLongPress={goDiscover}
          accessibilityLabel="Discover"
        >
          <View style={styles.photoFrame}>
            {discoverUrl ? (
              <ModePhoto
                uri={discoverUrl} treatment={mode.photoTreatment}
                containerStyle={StyleSheet.absoluteFill} imageStyle={styles.photoImg}
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

      <Pressable
        style={styles.dreamCard} onLongPress={goDream}
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

      <Pressable
        style={styles.circleCard} onLongPress={goCircle}
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

      <Pressable
        onPress={goJourney} onLongPress={goJourney}
        style={[styles.journeyBox, { marginBottom: Math.max(insets.bottom, 16) }]}
        accessibilityLabel="Journey"
      >
        <Text style={styles.journeyLabel}>Journey</Text>
      </Pressable>

      <ModePickerSheet
        visible={pickerOpen}
        currentMode={homeMode}
        contentMode={contentMode}
        onPick={handlePick}
        onPickContent={(c) => persistContentMode(c)}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
function makeStyles(m: ModeDescriptor) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: m.pagePaper },

    // ── Mosaic ────────────────────────────────────────────────────────
    mosaicScreen: { flex: 1, flexDirection: 'column' },
    mosaicHero: {
      flex: 1,
      alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 16, paddingVertical: 16,
    },
    // PHOTO ROW — framed pair architecture. Stamp paper around AND between photos.
    // Gap between tiles = same as outer padding, so the frame paper holds two
    // distinct rounded windows side by side. No more edge-to-edge seam.
    mosaicPhotoRow: {
      flex: 4, flexDirection: 'row', gap: 8, padding: 8,
      backgroundColor: m.stampFill,
    },
    mosaicPhotoTile: {
      flex: 1, overflow: 'hidden', backgroundColor: m.cardFill,
      position: 'relative', borderRadius: 14,
    },
    // Kept for type compatibility (still referenced by JSX) but no longer adds a border.
    // The seam is gone — frame paper between photos handles the separation.
    mosaicPhotoLeft: {},
    mosaicTileLabel: {
      position: 'absolute', top: 10, left: 10,
      fontFamily: FrostFonts.label, fontWeight: '300',
      fontSize: 8, letterSpacing: 3,
      color: 'rgba(255,255,255,0.92)', textTransform: 'uppercase',
      textShadowColor: 'rgba(0,0,0,0.55)',
      textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
    },
    mosaicTileDot: {
      position: 'absolute', top: 12, right: 12,
      width: 5, height: 5, borderRadius: 2.5, backgroundColor: m.brass,
    },
    mosaicVoice: {
      flex: 1,
      paddingVertical: 14, paddingHorizontal: 18,
      justifyContent: 'center',
      gap: 6,
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: m.hairline,
    },
    mosaicJourney: {
      flex: 1,
      paddingVertical: 16, alignItems: 'center', justifyContent: 'center',
      borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: m.hairline,
    },

    // Mosaic hero text — uses real italic Cormorant faces, sized to mockup
    mosaicWeekday: {
      fontFamily: 'CormorantGaramond_400Regular_Italic',
      fontSize: 22, lineHeight: 24,
      color: m.ink,
    },
    mosaicDateLine: {
      fontFamily: 'CormorantGaramond_400Regular_Italic',
      fontSize: 26, lineHeight: 28,
      letterSpacing: 0.3, color: m.brass,
      textAlign: 'center', paddingHorizontal: 4,
    },
    mosaicYear: {
      fontFamily: 'CormorantGaramond_300Light',
      fontSize: 13, letterSpacing: 0.8,
      marginTop: 6, color: m.soft,
    },
    mosaicRule: {
      width: 22, height: 1,
      backgroundColor: m.brassMuted, opacity: 0.5,
      marginVertical: 16,
    },
    mosaicDaysNum: {
      fontFamily: 'CormorantGaramond_300Light_Italic',
      fontSize: 38, lineHeight: 38,
      color: m.brassMuted,
    },
    mosaicDaysWord: {
      fontFamily: FrostFonts.label, fontWeight: '300',
      fontSize: 9, letterSpacing: 3.5, textTransform: 'uppercase',
      color: m.soft,
    },
    // Mode badge: tappable surface positioned over the hero's bottom area.
    // Tap flips Content (Dream ↔ Sanctuary). Tone label sits on top, content
    // label sits below — together they're the single discoverable affordance.
    mosaicBadgePressable: {
      position: 'absolute',
      bottom: 18,
      alignSelf: 'center',
      alignItems: 'center',
      paddingVertical: 6, paddingHorizontal: 12,
    },
    mosaicModeBadge: {
      fontFamily: FrostFonts.label, fontWeight: '300',
      fontSize: 9, letterSpacing: 3.5, textTransform: 'uppercase',
      color: m.brassMuted, opacity: 0.7,
    },
    mosaicModeBadgeContent: {
      marginTop: 4,
      fontFamily: FrostFonts.label, fontWeight: '300',
      fontSize: 9, letterSpacing: 4.4, textTransform: 'uppercase',
      color: m.brass, opacity: 0.8,
    },
    // Toast — shown when bride flips Content via badge.
    // Italic Cormorant brass on dim charcoal, fade-in fade-out.
    toastWrap: {
      position: 'absolute',
      left: 32, right: 32,
      paddingVertical: 12, paddingHorizontal: 18,
      borderRadius: 22,
      backgroundColor: 'rgba(18,14,11,0.88)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(191,160,77,0.22)',
      alignItems: 'center',
    },
    toastText: {
      fontFamily: 'CormorantGaramond_300Light_Italic',
      fontSize: 16, color: '#BFA04D',
      letterSpacing: 0.4,
    },

    // Mosaic Dream Ai voice text
    mosaicDreamLabel: {
      fontFamily: 'CormorantGaramond_400Regular_Italic',
      fontSize: 14, color: m.brass,
    },
    mosaicDreamLine: {
      flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    },
    mosaicDreamGlyph: {
      fontSize: 8, color: m.brass, marginTop: 3,
    },
    mosaicDreamText: {
      flex: 1,
      fontFamily: 'CormorantGaramond_300Light_Italic',
      fontSize: 11.5, lineHeight: 15.5,
      color: m.soft,
    },

    // Mosaic Circle voice text
    mosaicCircleLabel: {
      fontFamily: 'CormorantGaramond_400Regular_Italic',
      fontSize: 14, color: m.brass,
    },
    mosaicCircleLine: {
      flexDirection: 'row', gap: 6, alignItems: 'flex-start',
    },
    mosaicCircleGlyph: {
      fontSize: 8, color: m.brass, marginTop: 3,
    },
    mosaicCircleText: {
      flex: 1,
      fontFamily: 'CormorantGaramond_300Light_Italic',
      fontSize: 11.5, lineHeight: 15.5,
      color: m.soft,
    },

    // Mosaic Journey label
    mosaicJourneyLabel: {
      fontFamily: 'CormorantGaramond_400Regular_Italic',
      fontSize: 16, letterSpacing: 0.4,
      color: m.brass,
    },

    // ── SANCTUARY MODE TYPOGRAPHY (Session 29 evening — May 10) ──
    // Slightly larger across all five voice bands (Dream Ai, Circle, Muse,
    // Moments, Pages) when contentMode === 'sanctuary'. Sanctuary has no
    // photo row to anchor the eye, so typography carries more presence.
    // Asymmetric bump: labels +2pt (announce), sub-lines +1.5pt (settled).
    mosaicSanctuaryLabel: {
      fontFamily: 'CormorantGaramond_400Regular_Italic',
      fontSize: 16, color: m.brass,
    },
    mosaicSanctuaryGlyph: {
      fontSize: 9, color: m.brass, marginTop: 3,
    },
    mosaicSanctuaryText: {
      flex: 1,
      fontFamily: 'CormorantGaramond_300Light_Italic',
      fontSize: 13, lineHeight: 17.5,
      color: m.soft,
    },

    // ── Hero (classic) — UNTOUCHED, used by SANCTUARY/A/B/C only ───────

    // Hero (classic)
    hero: { alignItems: 'center', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 12 },
    weekday: {
      fontFamily: FrostFonts.display, fontWeight: '300',
      fontSize: 22, lineHeight: 26, color: m.ink,
    },
    dateLine: {
      fontFamily: FrostFonts.display, fontWeight: '400', fontStyle: 'italic',
      fontSize: 30, lineHeight: 34, color: m.brass,
      letterSpacing: 0.3, marginTop: 2, textAlign: 'center',
    },
    year: {
      fontFamily: FrostFonts.display, fontWeight: '300',
      fontSize: 18, lineHeight: 22, color: m.ink, marginTop: 2,
    },
    rule: {
      width: 40, height: StyleSheet.hairlineWidth,
      backgroundColor: m.hairline, marginTop: 10, marginBottom: 8,
    },
    daysWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    daysNum: {
      fontFamily: FrostFonts.display, fontWeight: '500',
      fontSize: 24, lineHeight: 28, color: m.brass,
    },
    daysWord: {
      fontFamily: FrostFonts.label, fontWeight: '400',
      fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: m.brass,
    },
    modeBadge: {
      marginTop: 10,
      fontFamily: FrostFonts.label, fontWeight: '300',
      fontSize: 9, letterSpacing: 3.5, textTransform: 'uppercase',
      color: m.brassMuted, opacity: 0.7,
    },

    // Image boxes (classic)
    gridRow: {
      flexDirection: 'row',
      gap: m.cardRadius === 0 ? 0 : 12,
      paddingHorizontal: m.cardRadius === 0 ? 0 : 18,
      marginTop: m.cardRadius === 0 ? 0 : 10,
    },
    imgBox: {
      flex: 1, aspectRatio: m.photoAspect, backgroundColor: m.stampFill,
      borderWidth: m.cardRadius === 0 ? 0 : StyleSheet.hairlineWidth,
      borderColor: m.hairline, borderRadius: m.imgBoxRadius, overflow: 'hidden',
    },
    photoFrame: {
      position: 'absolute',
      top: m.cardRadius === 0 ? 0 : 8, left: m.cardRadius === 0 ? 0 : 8,
      right: m.cardRadius === 0 ? 0 : 8, bottom: m.cardRadius === 0 ? 0 : 8,
      borderRadius: m.photoFrameRadius, overflow: 'hidden', backgroundColor: m.cardFill,
    },
    photoImg: { width: '100%', height: '100%' },
    photoGradientBottom: {
      position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%',
    },
    boxDot: {
      position: 'absolute',
      left: m.cardRadius === 0 ? 14 : 18, top: m.cardRadius === 0 ? 14 : 18,
      width: 6, height: 6, borderRadius: 3,
    },

    // Dream Ai card (classic)
    dreamCard: {
      marginTop: m.cardRadius === 0 ? 0 : 12,
      marginHorizontal: m.cardRadius === 0 ? 0 : 18,
      backgroundColor: m.stampFill,
      borderWidth: m.cardRadius === 0 ? 0 : StyleSheet.hairlineWidth,
      borderColor: m.hairlineStrong, borderRadius: m.cardRadius,
      paddingVertical: 18, paddingHorizontal: 20,
    },
    dreamLabel: {
      fontFamily: FrostFonts.display, fontWeight: '600', fontStyle: 'italic',
      fontSize: 19, letterSpacing: 0.4, color: m.brass, marginBottom: 10,
    },
    dreamLine: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 4 },
    dreamGlyph: { fontSize: 13, color: m.soft, marginTop: 3 },
    dreamText: {
      flex: 1,
      fontFamily: FrostFonts.display, fontWeight: '300', fontStyle: 'italic',
      fontSize: 15, lineHeight: 21, color: m.soft,
    },

    // Circle card (classic)
    circleCard: {
      marginTop: m.cardRadius === 0 ? 0 : 12,
      marginHorizontal: m.cardRadius === 0 ? 0 : 18,
      backgroundColor: m.stampFill,
      borderWidth: m.cardRadius === 0 ? 0 : StyleSheet.hairlineWidth,
      borderColor: m.hairlineStrong, borderRadius: m.cardRadius,
      paddingVertical: 18, paddingHorizontal: 20,
    },
    circleLabel: {
      fontFamily: FrostFonts.display, fontWeight: '600', fontStyle: 'italic',
      fontSize: 19, letterSpacing: 0.4, color: m.brass, marginBottom: 10,
    },
    circleLine: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 4 },
    circleGlyph: { fontSize: 13, color: m.soft, marginTop: 3 },
    circleText: {
      flex: 1,
      fontFamily: FrostFonts.display, fontWeight: '300', fontStyle: 'italic',
      fontSize: 15, lineHeight: 21, color: m.soft,
    },

    // Journey button (classic)
    journeyBox: {
      marginHorizontal: m.cardRadius === 0 ? 0 : 18,
      backgroundColor: m.stampFill,
      borderWidth: m.cardRadius === 0 ? 0 : StyleSheet.hairlineWidth,
      borderColor: m.hairlineStrong,
      borderRadius: m.cardRadius === 0 ? 0 : 14,
      paddingVertical: 14, alignItems: 'center',
    },
    journeyLabel: {
      fontFamily: FrostFonts.display, fontWeight: '600', fontStyle: 'italic',
      fontSize: 19, letterSpacing: 0.8, color: m.brass,
    },
  });
}
