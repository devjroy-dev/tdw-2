/**
 * Frost — Landing (v6 — in-app mode picker + AsyncStorage persistence).
 *
 * v6 changes from v5:
 *   - Mode picker UI: tap the date to cycle to next mode, long-press to open
 *     a bottom sheet with all 8 modes listed by name + description.
 *   - Selected mode persists to AsyncStorage so each device/bride can pick her
 *     own and have it stick across app restarts.
 *   - SHOW_MODE_PICKER guard at the top — set to false to permanently lock a
 *     mode (the picker UI hides, the AsyncStorage value is ignored).
 *   - Grayscale import is now Platform-gated to fix web-bundling failure
 *     during `eas update` (color-matrix lib can't be bundled for web).
 *
 * Modes:
 *   SANCTUARY — current state. Vintage palette, F-2 frost on photos.
 *   A         — colour photos. Everything else identical to SANCTUARY.
 *   B         — colour photos + cooler/whiter paper + sharp 8px corners.
 *   C         — PWA energy. Taller photos (1.32 aspect), dark gradient at
 *               the bottom of each photo, sharp 0px corners.
 *   E1        — borderless mosaic. Dark gradient hero, colour photos.
 *   E2        — borderless mosaic. Dark gradient hero, B&W photos.
 *   E3        — borderless mosaic. Dirty-white paper hero, colour photos.
 *   E4        — borderless mosaic. Dirty-white paper hero, B&W photos.
 *
 * To lock a final mode:
 *   1. Pick the winning mode in the in-app picker
 *   2. Set DEFAULT_MODE below to that mode
 *   3. Set SHOW_MODE_PICKER to false
 *   4. (Optional) the loser modes can be deleted in a follow-up cleanup
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image, Platform, StatusBar,
  Modal, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FrostFonts, FrostCopy,
} from '../../constants/frost';
import {
  brideIdle, fetchHomeImages, fetchCircleFeed, formatCircleActivity,
} from '../../services/frostApi';

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

type HomeModeKey = 'SANCTUARY' | 'A' | 'B' | 'C' | 'E1' | 'E2' | 'E3' | 'E4';

// Set to false when a winner is locked and we want to ship it for everyone.
// While true, the date is tappable to cycle modes; long-press opens picker.
const SHOW_MODE_PICKER = true;

// Default mode if AsyncStorage has nothing stored yet, OR if SHOW_MODE_PICKER
// is false. When you lock a winner, set this to the winning mode and flip
// SHOW_MODE_PICKER to false.
const DEFAULT_MODE: HomeModeKey = 'SANCTUARY';

// AsyncStorage key for the per-device chosen mode
const MODE_STORAGE_KEY = '@frost.home_mode';

// Order modes for tap-to-cycle (matches mockup viewing order)
const CYCLE_ORDER: HomeModeKey[] = ['SANCTUARY', 'A', 'B', 'C', 'E1', 'E2', 'E3', 'E4'];

// Friendly names for the picker sheet
const MODE_LABELS: Record<HomeModeKey, { title: string; sub: string }> = {
  SANCTUARY: { title: 'Sanctuary',   sub: 'Original — vintage palette, frosted greyscale photos' },
  A:         { title: 'A',           sub: 'Sanctuary, but photos in colour' },
  B:         { title: 'B',           sub: 'Whiter paper, sharper edges, colour photos' },
  C:         { title: 'C',           sub: 'PWA energy — tall photos, dark gradients, edge to edge' },
  E1:        { title: 'E1 — Mosaic dark, colour',  sub: 'Borderless dark mosaic, colour photos' },
  E2:        { title: 'E2 — Mosaic dark, B&W',     sub: 'Borderless dark mosaic, B&W photos' },
  E3:        { title: 'E3 — Mosaic light, colour', sub: 'Borderless light mosaic, colour photos' },
  E4:        { title: 'E4 — Mosaic light, B&W',    sub: 'Borderless light mosaic, B&W photos' },
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
}

const MODES: Record<HomeModeKey, ModeDescriptor> = {
  SANCTUARY: {
    layout: 'classic', photoTreatment: 'frost',
    pagePaper: '#D8D3CC', cardFill: '#ECE9E4', stampFill: '#C0BCB6',
    hairline: '#B5B1AC', hairlineStrong: '#A39E97',
    ink: '#2C2823', soft: '#5A5650', brass: '#BFA04D', brassMuted: '#A8924B',
    imgBoxRadius: 18, photoFrameRadius: 12, cardRadius: 18,
    photoAspect: 1 / 1.18, statusBarStyle: 'dark-content',
  },
  A: {
    layout: 'classic', photoTreatment: 'colour',
    pagePaper: '#D8D3CC', cardFill: '#ECE9E4', stampFill: '#C0BCB6',
    hairline: '#B5B1AC', hairlineStrong: '#A39E97',
    ink: '#2C2823', soft: '#5A5650', brass: '#BFA04D', brassMuted: '#A8924B',
    imgBoxRadius: 18, photoFrameRadius: 12, cardRadius: 18,
    photoAspect: 1 / 1.18, statusBarStyle: 'dark-content',
  },
  B: {
    layout: 'classic', photoTreatment: 'colour',
    pagePaper: '#EDEAE4', cardFill: '#F4F1EB', stampFill: '#D2CEC8',
    hairline: '#C2BEB8', hairlineStrong: '#A39E97',
    ink: '#2C2823', soft: '#5A5650', brass: '#BFA04D', brassMuted: '#A8924B',
    imgBoxRadius: 8, photoFrameRadius: 6, cardRadius: 8,
    photoAspect: 1 / 1.18, statusBarStyle: 'dark-content',
  },
  C: {
    layout: 'classic', photoTreatment: 'colour',
    pagePaper: '#D8D3CC', cardFill: '#1A1612', stampFill: '#C0BCB6',
    hairline: '#B5B1AC', hairlineStrong: '#A39E97',
    ink: '#2C2823', soft: '#5A5650', brass: '#BFA04D', brassMuted: '#A8924B',
    imgBoxRadius: 0, photoFrameRadius: 0, cardRadius: 0,
    photoAspect: 1 / 1.32, statusBarStyle: 'dark-content',
    photoBottomGradient: true,
  },
  E1: {
    layout: 'mosaic', photoTreatment: 'colour',
    pagePaper: '#1B1612', cardFill: '#1B1612', stampFill: '#2D2620',
    hairline: 'rgba(191,160,77,0.18)', hairlineStrong: 'rgba(191,160,77,0.22)',
    ink: '#F5F0E8', soft: 'rgba(245,240,232,0.62)',
    brass: '#BFA04D', brassMuted: '#A8924B',
    imgBoxRadius: 0, photoFrameRadius: 0, cardRadius: 0,
    photoAspect: 1 / 1, statusBarStyle: 'light-content',
    heroGradient:    ['#1B1612', '#2A2018'],
    dreamGradient:   ['#2D2620', '#1A1612'],
    circleGradient:  ['#1F1A18', '#2C2520'],
    journeyGradient: ['#15110E', '#221C18'],
  },
  E2: {
    layout: 'mosaic', photoTreatment: 'bw',
    pagePaper: '#1B1612', cardFill: '#1B1612', stampFill: '#2D2620',
    hairline: 'rgba(191,160,77,0.18)', hairlineStrong: 'rgba(191,160,77,0.22)',
    ink: '#F5F0E8', soft: 'rgba(245,240,232,0.62)',
    brass: '#BFA04D', brassMuted: '#A8924B',
    imgBoxRadius: 0, photoFrameRadius: 0, cardRadius: 0,
    photoAspect: 1 / 1, statusBarStyle: 'light-content',
    heroGradient:    ['#1B1612', '#2A2018'],
    dreamGradient:   ['#2D2620', '#1A1612'],
    circleGradient:  ['#1F1A18', '#2C2520'],
    journeyGradient: ['#15110E', '#221C18'],
  },
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
    journeyGradient: ['#A8A29A', '#948E86'],
  },
  E4: {
    layout: 'mosaic', photoTreatment: 'bw',
    pagePaper: '#D8D3CC', cardFill: '#D8D3CC', stampFill: '#C8C2BA',
    hairline: 'rgba(44,40,35,0.12)', hairlineStrong: 'rgba(44,40,35,0.18)',
    ink: '#2C2823', soft: '#5A5650',
    brass: '#BFA04D', brassMuted: '#A8924B',
    imgBoxRadius: 0, photoFrameRadius: 0, cardRadius: 0,
    photoAspect: 1 / 1, statusBarStyle: 'dark-content',
    heroGradient:    ['#D8D3CC', '#CFC9C1'],
    dreamGradient:   ['#C8C2BA', '#BBB5AC'],
    circleGradient:  ['#BCB6AD', '#B0AAA1'],
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
function ModePickerSheet({
  visible, currentMode, onPick, onClose,
}: {
  visible: boolean;
  currentMode: HomeModeKey;
  onPick: (m: HomeModeKey) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose}>
        <Pressable style={pickerStyles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={pickerStyles.handle} />
          <Text style={pickerStyles.title}>Pick a home rendition</Text>
          <Text style={pickerStyles.sub}>Tap to switch. Long-press the date to cycle.</Text>
          <ScrollView style={{ maxHeight: 480 }}>
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
            <Text style={pickerStyles.dismissText}>Close</Text>
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
    marginTop: 10, paddingVertical: 12, alignItems: 'center',
  },
  dismissText: {
    fontFamily: FrostFonts.label, fontSize: 11, letterSpacing: 2,
    color: 'rgba(245,240,232,0.6)', textTransform: 'uppercase',
  },
});

// ─── Screen ────────────────────────────────────────────────────────────────
export default function FrostLanding() {
  const insets = useSafeAreaInsets();

  // Mode state — initial value loaded from AsyncStorage on mount.
  const [homeMode, setHomeMode] = useState<HomeModeKey>(DEFAULT_MODE);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!SHOW_MODE_PICKER) {
      setHomeMode(DEFAULT_MODE);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(MODE_STORAGE_KEY);
        if (cancelled) return;
        if (stored && CYCLE_ORDER.includes(stored as HomeModeKey)) {
          setHomeMode(stored as HomeModeKey);
        }
      } catch {
        // silent — fallback to DEFAULT_MODE
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persistMode = useCallback(async (m: HomeModeKey) => {
    setHomeMode(m);
    try { await AsyncStorage.setItem(MODE_STORAGE_KEY, m); } catch {}
  }, []);

  const cycleMode = useCallback(() => {
    if (!SHOW_MODE_PICKER) return;
    Haptics.selectionAsync?.();
    const idx = CYCLE_ORDER.indexOf(homeMode);
    const next = CYCLE_ORDER[(idx + 1) % CYCLE_ORDER.length];
    persistMode(next);
  }, [homeMode, persistMode]);

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
      (async () => {
        try {
          const r = await fetchHomeImages();
          if (cancelled || !r?.success) return;
          setMuseUrl(r.muse_image_url || null);
          setDiscoverUrl(r.discover_image_url || null);
        } catch {}
      })();
      (async () => {
        try {
          const events = await fetchCircleFeed(10);
          if (cancelled) return;
          const lines = (events || []).slice(0, 2).map(formatCircleActivity);
          setCircleLines(lines);
        } catch {}
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

  // ── MOSAIC LAYOUT (E1/E2/E3/E4) ───────────────────────────────────────
  if (mode.layout === 'mosaic') {
    return (
      <View style={[styles.root]}>
        <StatusBar barStyle={mode.statusBarStyle} backgroundColor={mode.pagePaper} />

        <View style={[styles.mosaicScreen, { paddingTop: insets.top }]}>
          {/* HERO TILE — wraps date + countdown. Tap = cycle, long-press = picker */}
          <Pressable
            onPress={cycleMode}
            onLongPress={openPicker}
            delayLongPress={500}
            style={{ flex: 4 }}
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
              {SHOW_MODE_PICKER ? (
                <Text style={styles.mosaicModeBadge}>{homeMode}</Text>
              ) : null}
            </LinearGradient>
          </Pressable>

          {/* PHOTO ROW */}
          <View style={styles.mosaicPhotoRow}>
            <Pressable
              style={[styles.mosaicPhotoTile, styles.mosaicPhotoLeft]}
              onPress={goMuse} onLongPress={goMuse}
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
              onPress={goDiscover} onLongPress={goDiscover}
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
            onPress={goDream} onLongPress={goDream}
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
            onPress={goCircle} onLongPress={goCircle}
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
        </View>

        <ModePickerSheet
          visible={pickerOpen}
          currentMode={homeMode}
          onPick={handlePick}
          onClose={() => setPickerOpen(false)}
        />
      </View>
    );
  }

  // ── CLASSIC LAYOUT (SANCTUARY/A/B/C) ──────────────────────────────────
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle={mode.statusBarStyle} backgroundColor={mode.pagePaper} />

      {/* Hero block — Pressable so tap cycles + long-press opens picker */}
      <Pressable
        onPress={cycleMode}
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
          style={styles.imgBox} onPress={goMuse} onLongPress={goMuse}
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
          style={styles.imgBox} onPress={goDiscover} onLongPress={goDiscover}
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
        style={styles.dreamCard} onPress={goDream} onLongPress={goDream}
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
        style={styles.circleCard} onPress={goCircle} onLongPress={goCircle}
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
        onPick={handlePick}
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
    mosaicPhotoRow: { flex: 4, flexDirection: 'row' },
    mosaicPhotoTile: {
      flex: 1, overflow: 'hidden', backgroundColor: m.cardFill, position: 'relative',
    },
    mosaicPhotoLeft: {
      borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: m.hairline,
    },
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
    mosaicModeBadge: {
      marginTop: 10,
      fontFamily: FrostFonts.label, fontWeight: '300',
      fontSize: 9, letterSpacing: 3.5, textTransform: 'uppercase',
      color: m.brassMuted, opacity: 0.7,
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
