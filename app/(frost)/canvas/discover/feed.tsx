/**
 * Frost · Canvas · Discover · Discovery Feed (ZIP 6 — full-bleed mirror of PWA)
 *
 * Mechanics (mirrors app/(couple)/discover.tsx exactly):
 *   - Vertical swipe (up/down)   = next/previous VENDOR
 *   - Horizontal swipe (l/r)     = next/previous PHOTO of same vendor
 *   - Single tap                 = open small frosted info card (Enquire + Lock Date)
 *   - Double tap                 = save image to Muse + yellow heart animation
 *
 * Filter pill (sticky):
 *   - ALL pill first
 *   - Multi-select category pills
 *   - Dual-handle adjustable price-range slider
 *   - Apply / Reset
 *   - Position: top, frosted, doesn't break the bleed
 *   - Persist filters across sessions via AsyncStorage
 *
 * Source = all approved Discovery images (NOT what was hearted in Blind Swipe).
 * Endpoint: GET /api/v2/discover/feed?user_id=:id (already exists).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, Pressable, StatusBar,
  Dimensions, ScrollView, Platform, PanResponder, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart, SlidersHorizontal, Bookmark } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostMaterial, FrostRadius, FrostCopy,
} from '../../../../constants/frost';
import { saveToMuse } from '../../../../services/frostApi';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const API_BASE        = 'https://dream-wedding-production-89ae.up.railway.app';
const SWIPE_THRESHOLD = 45;
const SWIPE_VELOCITY  = 0.3;
const TAP_MAX_MOVE    = 10;
const TAP_MAX_TIME    = 250;
const DOUBLE_TAP_MS   = 280;

const ANDROID_BLUR_SUPPORTED =
  Platform.OS === 'android' &&
  typeof Platform.Version === 'number' &&
  (Platform.Version as number) >= FrostMaterial.androidMinApi;

const FILTER_STORAGE_KEY = 'frost.discoveryFeed.filters.v1';

// Editorial photo from exploring_photos.
// Each photo is a single-image entry — no vendor, no price.
// Horizontal swipe (next photo from same vendor) is a no-op for editorial entries.
interface EditorialPhoto {
  id: string;
  imageUrl: string;
  caption: string | null;
}

interface FilterState {
  categories: string[];
  priceMin: number;
  priceMax: number;
}

const PRICE_MIN  = FrostCopy.discoverCanvas.priceMin;
const PRICE_MAX  = FrostCopy.discoverCanvas.priceMax;
const PRICE_STEP = FrostCopy.discoverCanvas.priceStep;

const DEFAULT_FILTERS: FilterState = {
  categories: ['all'],
  priceMin: PRICE_MIN,
  priceMax: PRICE_MAX,
};

// ─── Discovery Feed screen ───────────────────────────────────────────────────

export default function DiscoveryFeed() {
  const insets = useSafeAreaInsets();

  // Editorial photos from exploring_photos (admin-curated)
  const [photos, setPhotos] = useState<EditorialPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const heartPop = useRef(new Animated.Value(0)).current;

  const touchStart   = useRef<{ x: number; y: number; t: number } | null>(null);
  const tapCountRef  = useRef(0);
  const lastTapTime  = useRef(0);
  const tapTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch editorial photos on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/v2/exploring-photos`);
        const d = await r.json();
        if (!cancelled && d.success && Array.isArray(d.photos) && d.photos.length > 0) {
          setPhotos(d.photos.map((p: any) => ({
            id: p.id,
            imageUrl: p.image_url,
            caption: p.caption ?? null,
          })));
        }
      } catch { /* silent */ }
      if (!cancelled) setLoadingPhotos(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Current photo (safe index)
  const photo = photos.length > 0 ? photos[photoIdx % photos.length] : null;

  // ────────────────────────────────────────────────────────────────────────────
  // Gesture handlers
  // ────────────────────────────────────────────────────────────────────────────

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 1600);
  };

  const flashHeart = () => {
    Animated.sequence([
      Animated.spring(heartPop, { toValue: 1, friction: 4, tension: 110, useNativeDriver: true }),
      Animated.delay(420),
      Animated.timing(heartPop, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  // Vertical swipe = next/prev photo
  const goNextPhoto = () => {
    if (photos.length === 0) return;
    setPhotoIdx((i) => (i + 1) % photos.length);
    setOverlayVisible(false);
  };
  const goPrevPhoto = () => {
    if (photos.length === 0) return;
    setPhotoIdx((i) => (i - 1 + photos.length) % photos.length);
    setOverlayVisible(false);
  };

  // Horizontal swipe on editorial photos = next photo too
  // (no multi-image vendor concept — each entry is one photo)
  const goNext = () => goNextPhoto();
  const goPrev = () => goPrevPhoto();

  const handleDoubleTap = async () => {
    if (!photo) return;
    flashHeart();
    showToast('Saved to Muse ♥');
    try {
      await saveToMuse({ imageUrl: photo.imageUrl });
    } catch { /* silent */ }
  };
  const handleSingleTap = () => setOverlayVisible((v) => !v);

  const handleSaveFromOverlay = async () => {
    setOverlayVisible(false);
    if (!photo) return;
    flashHeart();
    showToast('Saved to Muse ♥');
    try {
      await saveToMuse({ imageUrl: photo.imageUrl });
    } catch { /* silent */ }
  };

  const onTouchStart = (e: any) => {
    const t = e.nativeEvent.touches[0];
    touchStart.current = { x: t.pageX, y: t.pageY, t: Date.now() };
  };

  const onTouchEnd = (e: any) => {
    if (!touchStart.current) return;
    const start = touchStart.current;
    touchStart.current = null;
    const end = e.nativeEvent.changedTouches[0];
    const dx = end.pageX - start.x;
    const dy = end.pageY - start.y;
    const dt = Date.now() - start.t;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (absX < TAP_MAX_MOVE && absY < TAP_MAX_MOVE && dt < TAP_MAX_TIME) {
      const now = Date.now();
      const since = now - lastTapTime.current;
      if (since < DOUBLE_TAP_MS && tapCountRef.current >= 1) {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapCountRef.current = 0;
        handleDoubleTap();
      } else {
        tapCountRef.current = 1;
        lastTapTime.current = now;
        tapTimerRef.current = setTimeout(() => {
          if (tapCountRef.current === 1) handleSingleTap();
          tapCountRef.current = 0;
        }, DOUBLE_TAP_MS);
      }
      return;
    }

    const velocity = Math.max(absX, absY) / Math.max(dt, 1);
    const passed = Math.max(absX, absY) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY;
    if (!passed) return;

    if (overlayVisible && absY > absX && dy > 80) {
      setOverlayVisible(false);
      return;
    }

    // Both vertical and horizontal advance through photos
    if (absY > absX) {
      if (dy < -SWIPE_THRESHOLD) goNextPhoto();
      else if (dy > SWIPE_THRESHOLD) goPrevPhoto();
    } else {
      if (dx < -SWIPE_THRESHOLD) goNext();
      else if (dx > SWIPE_THRESHOLD) goPrev();
    }
  };

  useEffect(() => {
    return () => { if (tapTimerRef.current) clearTimeout(tapTimerRef.current); };
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Render guards
  // ────────────────────────────────────────────────────────────────────────────

  if (loadingPhotos) {
    return (
      <View style={[styles.root, styles.emptyWrap]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={FrostColors.goldMuted} size="large" />
      </View>
    );
  }

  if (!photo) {
    return (
      <View style={[styles.root, styles.emptyWrap]}>
        <StatusBar barStyle="light-content" />
        <Text style={styles.emptyTitle}>Nothing here yet.</Text>
        <Text style={styles.emptySub}>Curated work is on the way.</Text>
        <Pressable onPress={() => router.back()} style={[styles.emptyBtn, styles.emptyBtnGhost]}>
          <Text style={[styles.emptyBtnText, { color: FrostColors.white }]}>Close</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <View
        style={styles.gestureLayer}
        onStartShouldSetResponder={() => true}
        onResponderGrant={onTouchStart}
        onResponderRelease={onTouchEnd}
      >
        {/* Full-bleed photo */}
        <Image
          source={{ uri: photo.imageUrl }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />

        {/* Scrims */}
        <View style={styles.scrimTop} pointerEvents="none" />
        <View style={styles.scrimBottom} pointerEvents="none" />

        {/* Photo counter pill — bottom right */}
        {photos.length > 1 ? (
          <View style={[styles.counterPill, { bottom: insets.bottom + 28 }]} pointerEvents="none">
            <Text style={styles.counterText}>{photoIdx + 1} / {photos.length}</Text>
          </View>
        ) : null}

        {/* Save toast */}
        {toast ? (
          <View style={[styles.toast, { top: insets.top + 110 }]} pointerEvents="none">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}

        {/* Heart pop animation */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.heartPop,
            {
              opacity: heartPop,
              transform: [{
                scale: heartPop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] }),
              }],
            },
          ]}
        >
          <Heart size={140} color={FrostColors.white} fill={FrostColors.goldTrue} strokeWidth={1.2} />
        </Animated.View>
      </View>

      {/* TOP BAR */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topBarLeft}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>{FrostCopy.discoverCanvas.discoveryFeedEyebrow}</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={16} style={styles.closeBtn}>
          <X size={22} color={FrostColors.white} strokeWidth={1.5} />
        </Pressable>
      </View>

      {/* Hint */}
      {!overlayVisible ? (
        <View style={[styles.hintWrap, { bottom: insets.bottom + 60 }]} pointerEvents="none">
          <Text style={styles.hintText}>Swipe to browse · Double-tap saves · Tap for details</Text>
        </View>
      ) : null}

      {/* INFO CARD — editorial: shows caption + Save to Muse only */}
      {overlayVisible ? (
        <Pressable
          style={[styles.infoCardWrap, { paddingBottom: insets.bottom + 20 }]}
          onPress={() => setOverlayVisible(false)}
        >
          <FrostedInfoCard>
            <View style={styles.infoHandle} />
            {photo.caption ? (
              <Text style={styles.infoTagline}>{photo.caption}</Text>
            ) : (
              <Text style={[styles.infoTagline, { color: FrostColors.muted }]}>
                Curated by TDW
              </Text>
            )}
            <View style={[styles.infoActions, { marginTop: FrostSpace.m }]}>
              <Pressable
                style={[styles.infoBtn, styles.infoBtnPrimary, { flex: 1 }]}
                onPress={handleSaveFromOverlay}
              >
                <Bookmark size={14} color={FrostColors.ink} strokeWidth={1.5} />
                <Text style={[styles.infoBtnText, { color: FrostColors.ink }]}>Save to Muse</Text>
              </Pressable>
            </View>
          </FrostedInfoCard>
        </Pressable>
      ) : null}
    </View>
  );
}


// ─── Frosted Info Card (single-tap reveal) ───────────────────────────────────

function FrostedInfoCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={infoCardStyles.outer}>
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            // @ts-expect-error
            {
              backdropFilter: FrostMaterial.composerBlurWeb,
              WebkitBackdropFilter: FrostMaterial.composerBlurWeb,
              backgroundColor: 'rgba(248,247,245,0.78)',
            },
          ]}
        />
      ) : Platform.OS === 'ios' ? (
        <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFill} />
      ) : ANDROID_BLUR_SUPPORTED ? (
        <BlurView
          intensity={40}
          tint="light"
          experimentalBlurMethod={FrostMaterial.androidExperimentalMethod}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(248,247,245,0.92)' }]} />
      )}
      <View style={infoCardStyles.contentLayer}>{children}</View>
    </View>
  );
}

const infoCardStyles = StyleSheet.create({
  outer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(168,146,75,0.22)',
    borderBottomWidth: 0,
  },
  contentLayer: {
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: 12,
    paddingBottom: 0,
  },
});


// ─── Main styles ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FrostColors.black },
  gestureLayer: { flex: 1, backgroundColor: FrostColors.black },

  scrimTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 140,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  scrimBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 100,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  dotsRow: {
    position: 'absolute',
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 22, height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: FrostColors.white,
  },

  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: FrostSpace.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: FrostSpace.s, flex: 1 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: FrostSpace.m },
  eyebrowDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: FrostColors.white,
    opacity: 0.9,
  },
  eyebrow: {
    ...FrostType.eyebrowMedium,
    color: FrostColors.white,
    letterSpacing: 4,
  },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  counterPill: {
    position: 'absolute',
    right: FrostSpace.l,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  counterText: {
    fontFamily: FrostFonts.label,
    fontSize: 10,
    letterSpacing: 1.4,
    color: FrostColors.white,
  },
  hintWrap: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 8,
  },
  hintText: {
    fontFamily: FrostFonts.body,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 0.5,
  },

  toast: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 25,
  },
  toastText: {
    fontFamily: FrostFonts.body,
    fontSize: 13,
    color: FrostColors.white,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.s,
    borderRadius: 100,
    overflow: 'hidden',
  },

  heartPop: {
    position: 'absolute',
    top: '36%',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 30,
  },

  // Info card
  infoCardWrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    zIndex: 40,
  },
  infoHandle: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: FrostColors.hairline,
    alignSelf: 'center',
    marginBottom: 12,
  },
  infoCategory: {
    fontFamily: FrostFonts.label,
    fontSize: 10,
    letterSpacing: 2.4,
    color: FrostColors.muted,
    marginBottom: 6,
  },
  infoName: {
    fontFamily: FrostFonts.display,
    fontSize: 28,
    color: FrostColors.ink,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  infoTagline: {
    fontFamily: FrostFonts.display,
    fontSize: 16,
    fontStyle: 'italic',
    color: FrostColors.soft,
    lineHeight: 22,
    marginBottom: 12,
  },
  infoPrice: {
    fontFamily: FrostFonts.body,
    fontSize: 13,
    color: FrostColors.muted,
    marginBottom: 18,
  },
  infoActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  infoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  infoBtnPrimary: {
    backgroundColor: 'rgba(255,253,248,0.85)',
    borderColor: 'rgba(168,146,75,0.4)',
  },
  infoBtnSecondary: {
    backgroundColor: 'rgba(255,253,248,0.55)',
    borderColor: FrostColors.hairline,
  },
  infoBtnText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },

  // Empty state
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: FrostColors.black,
  },
  emptyTitle: {
    fontFamily: FrostFonts.display,
    fontSize: 28,
    color: FrostColors.white,
    fontStyle: 'italic',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: FrostFonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 28,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: FrostColors.white,
    marginBottom: 10,
  },
  emptyBtnGhost: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  emptyBtnText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: FrostColors.ink,
  },
});
