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
  Dimensions, ScrollView, Platform, PanResponder,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart, SlidersHorizontal, CalendarCheck2, Send } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostMaterial, FrostRadius, FrostCopy,
} from '../../../../constants/frost';
import { saveToMuse } from '../../../../services/frostApi';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

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

interface Vendor {
  id: string;
  name: string;
  city: string;
  category: string;          // matches FrostCopy.discoverCanvas.discoveryCategories ids
  categoryLabel: string;
  priceFrom: number;
  priceLabel: string;
  tagline: string;
  images: string[];
}

const SEED_VENDORS: Vendor[] = [
  {
    id: 'v1', name: 'Arjun Kartha Studio', city: 'New Delhi',
    category: 'photography', categoryLabel: 'Photography',
    priceFrom: 250000, priceLabel: '₹2.5L onwards',
    tagline: 'Light as a love language.',
    images: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=85&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1529636798458-92182e662485?w=1200&q=85&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=85&auto=format&fit=crop',
    ],
  },
  {
    id: 'v2', name: 'Sophia Laurent Artistry', city: 'Mumbai',
    category: 'mua', categoryLabel: 'Makeup & Hair',
    priceFrom: 180000, priceLabel: '₹1.8L onwards',
    tagline: 'South Asian skin is our language.',
    images: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=85&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1200&q=85&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=1200&q=85&auto=format&fit=crop',
    ],
  },
  {
    id: 'v3', name: 'House of Blooms', city: 'Bangalore',
    category: 'decor', categoryLabel: 'Decor',
    priceFrom: 150000, priceLabel: '₹1.5L onwards',
    tagline: 'Every installation, designed once — for you.',
    images: [
      'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200&q=85&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=85&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1510076857177-7470076d4098?w=1200&q=85&auto=format&fit=crop',
    ],
  },
  {
    id: 'v4', name: 'Ashford Estate', city: 'Pune',
    category: 'venue', categoryLabel: 'Venue',
    priceFrom: 300000, priceLabel: '₹3L onwards',
    tagline: 'The kind of venue photographs remember.',
    images: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=85&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=85&auto=format&fit=crop',
    ],
  },
  {
    id: 'v5', name: 'Riya Mehta Couture', city: 'New Delhi',
    category: 'designer', categoryLabel: 'Designer',
    priceFrom: 85000, priceLabel: '₹85K onwards',
    tagline: 'Hand embroidered in our Delhi atelier.',
    images: [
      'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=1200&q=85&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=1200&q=85&auto=format&fit=crop',
    ],
  },
  {
    id: 'v6', name: 'The Wedding Salad', city: 'Mumbai',
    category: 'event', categoryLabel: 'Event Mgmt',
    priceFrom: 200000, priceLabel: '₹2L onwards',
    tagline: 'Obsessive about logistics so you do not have to be.',
    images: [
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=85&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=85&auto=format&fit=crop',
    ],
  },
];

interface FilterState {
  categories: string[];   // 'all' or specific ids
  priceMin: number;
  priceMax: number;
}

const PRICE_MIN = FrostCopy.discoverCanvas.priceMin;
const PRICE_MAX = FrostCopy.discoverCanvas.priceMax;
const PRICE_STEP = FrostCopy.discoverCanvas.priceStep;

const DEFAULT_FILTERS: FilterState = {
  categories: ['all'],
  priceMin: PRICE_MIN,
  priceMax: PRICE_MAX,
};

function formatPrice(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(n % 10000000 === 0 ? 0 : 1)} Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)} L`;
  if (n >= 1000)     return `₹${Math.round(n / 1000)}K`;
  return `₹${n}`;
}

// ─── Discovery Feed screen ───────────────────────────────────────────────────

export default function DiscoveryFeed() {
  const insets = useSafeAreaInsets();

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  const [vendorIdx, setVendorIdx] = useState(0);
  const [imageIdx, setImageIdx] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const heartPop = useRef(new Animated.Value(0)).current;

  const touchStart   = useRef<{ x: number; y: number; t: number } | null>(null);
  const tapCountRef  = useRef(0);
  const lastTapTime  = useRef(0);
  const tapTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted filters on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(FILTER_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.categories)) {
            setFilters({
              categories: parsed.categories.length ? parsed.categories : ['all'],
              priceMin: typeof parsed.priceMin === 'number' ? parsed.priceMin : PRICE_MIN,
              priceMax: typeof parsed.priceMax === 'number' ? parsed.priceMax : PRICE_MAX,
            });
          }
        }
      } catch {
        // silent
      } finally {
        setFiltersLoaded(true);
      }
    })();
  }, []);

  // Filter vendors based on active filters
  const filteredVendors = useMemo(() => {
    const cats = filters.categories;
    return SEED_VENDORS.filter((v) => {
      const matchesCategory =
        cats.includes('all') || cats.includes(v.category);
      const matchesPrice =
        v.priceFrom >= filters.priceMin && v.priceFrom <= filters.priceMax;
      return matchesCategory && matchesPrice;
    });
  }, [filters]);

  const safeVendorIdx = filteredVendors.length === 0 ? 0 : vendorIdx % filteredVendors.length;
  const vendor = filteredVendors[safeVendorIdx];

  // Reset vendorIdx when filters change so the bride sees results from the start
  useEffect(() => {
    setVendorIdx(0);
    setImageIdx(0);
    setOverlayVisible(false);
  }, [filters]);

  // ────────────────────────────────────────────────────────────────────────────
  // Filter actions
  // ────────────────────────────────────────────────────────────────────────────

  const toggleCategory = (id: string) => {
    setFilters((f) => {
      let next: string[];
      if (id === 'all') {
        next = ['all'];
      } else {
        const without = f.categories.filter((c) => c !== 'all' && c !== id);
        if (f.categories.includes(id)) {
          next = without.length ? without : ['all'];
        } else {
          next = [...without, id];
        }
      }
      return { ...f, categories: next };
    });
  };

  const updatePriceMin = (v: number) => {
    setFilters((f) => ({ ...f, priceMin: Math.min(v, f.priceMax - PRICE_STEP) }));
  };
  const updatePriceMax = (v: number) => {
    setFilters((f) => ({ ...f, priceMax: Math.max(v, f.priceMin + PRICE_STEP) }));
  };

  const applyFilters = async () => {
    try {
      await AsyncStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters));
    } catch { /* silent */ }
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // ────────────────────────────────────────────────────────────────────────────
  // Gesture handlers — mirrors PWA discover.tsx exactly
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

  const goNextVendor = () => {
    if (filteredVendors.length === 0) return;
    setVendorIdx((i) => (i + 1) % filteredVendors.length);
    setImageIdx(0);
    setOverlayVisible(false);
  };
  const goPrevVendor = () => {
    if (filteredVendors.length === 0) return;
    setVendorIdx((i) => (i - 1 + filteredVendors.length) % filteredVendors.length);
    setImageIdx(0);
    setOverlayVisible(false);
  };
  const nextImage = () => {
    if (!vendor) return;
    setImageIdx((i) => Math.min(i + 1, vendor.images.length - 1));
  };
  const prevImage = () => setImageIdx((i) => Math.max(i - 1, 0));

  const handleDoubleTap = async () => {
    if (!vendor) return;
    flashHeart();
    showToast('Saved to Muse ♥');
    try {
      await saveToMuse({
        imageUrl: vendor.images[imageIdx] || vendor.images[0],
        vendorId: vendor.id,
      });
    } catch { /* silent */ }
  };
  const handleSingleTap = () => setOverlayVisible((v) => !v);

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

    // Tap detection
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

    // Dismiss overlay on down swipe
    if (overlayVisible && absY > absX && dy > 80) {
      setOverlayVisible(false);
      return;
    }

    if (absY > absX) {
      // Vertical → next/prev vendor
      if (dy < -SWIPE_THRESHOLD) goNextVendor();
      else if (dy > SWIPE_THRESHOLD) goPrevVendor();
    } else {
      // Horizontal → next/prev photo of same vendor
      if (dx < -SWIPE_THRESHOLD) nextImage();
      else if (dx > SWIPE_THRESHOLD) prevImage();
    }
  };

  // ────────────────────────────────────────────────────────────────────────────
  // CTAs — Enquire + Lock Date
  // ────────────────────────────────────────────────────────────────────────────

  const handleEnquire = () => {
    setOverlayVisible(false);
    showToast('Enquiry sent — DreamAi will follow up');
  };
  const handleLockDate = () => {
    setOverlayVisible(false);
    showToast('Date hold requested');
  };

  useEffect(() => {
    return () => { if (tapTimerRef.current) clearTimeout(tapTimerRef.current); };
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────

  if (!vendor) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>Nothing matches yet</Text>
          <Text style={styles.emptySub}>Loosen the filters to see more makers.</Text>
          <Pressable onPress={() => setFilterOpen(true)} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Adjust filters</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={[styles.emptyBtn, styles.emptyBtnGhost]}>
            <Text style={[styles.emptyBtnText, { color: FrostColors.white }]}>Close</Text>
          </Pressable>
        </View>
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
          source={{ uri: vendor.images[imageIdx] || vendor.images[0] }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />

        {/* Subtle bottom-up gradient via dark scrim — keeps top bar + overlay legible */}
        <View style={styles.scrimTop} pointerEvents="none" />
        <View style={styles.scrimBottom} pointerEvents="none" />

        {/* Image dots — stay because they're horizontal photo navigation aids (PWA-parity) */}
        {vendor.images.length > 1 ? (
          <View style={[styles.dotsRow, { top: insets.top + 86 }]}>
            {vendor.images.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === imageIdx && styles.dotActive]}
              />
            ))}
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
          <Heart
            size={140}
            color={FrostColors.white}
            fill={FrostColors.goldTrue}
            strokeWidth={1.2}
          />
        </Animated.View>
      </View>

      {/* TOP BAR — eyebrow + filter pill + close */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topBarLeft}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>{FrostCopy.discoverCanvas.discoveryFeedEyebrow}</Text>
        </View>

        <View style={styles.topBarRight}>
          <FilterPill
            count={
              (filters.categories.includes('all') ? 0 : filters.categories.length) +
              ((filters.priceMin !== PRICE_MIN || filters.priceMax !== PRICE_MAX) ? 1 : 0)
            }
            onPress={() => setFilterOpen((o) => !o)}
            active={filterOpen}
          />
          <Pressable onPress={() => router.back()} hitSlop={16} style={styles.closeBtn}>
            <X size={22} color={FrostColors.white} strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>

      {/* Hint */}
      {!overlayVisible && !filterOpen ? (
        <View style={[styles.hintWrap, { bottom: insets.bottom + 24 }]} pointerEvents="none">
          <Text style={styles.hintText}>
            Up · Down for vendors · Left · Right for photos · Double-tap saves
          </Text>
        </View>
      ) : null}

      {/* INFO CARD — single tap reveals frosted vendor essentials */}
      {overlayVisible ? (
        <Pressable
          style={[styles.infoCardWrap, { paddingBottom: insets.bottom + 20 }]}
          onPress={() => setOverlayVisible(false)}
        >
          <FrostedInfoCard>
            <View style={styles.infoHandle} />
            <Text style={styles.infoCategory}>
              {vendor.categoryLabel.toUpperCase()} · {vendor.city}
            </Text>
            <Text style={styles.infoName}>{vendor.name}</Text>
            <Text style={styles.infoTagline}>{vendor.tagline}</Text>
            <Text style={styles.infoPrice}>{vendor.priceLabel}</Text>

            <View style={styles.infoActions}>
              <Pressable style={[styles.infoBtn, styles.infoBtnPrimary]} onPress={handleEnquire}>
                <Send size={14} color={FrostColors.ink} strokeWidth={1.5} />
                <Text style={[styles.infoBtnText, { color: FrostColors.ink }]}>Enquire</Text>
              </Pressable>
              <Pressable style={[styles.infoBtn, styles.infoBtnSecondary]} onPress={handleLockDate}>
                <CalendarCheck2 size={14} color={FrostColors.ink} strokeWidth={1.5} />
                <Text style={[styles.infoBtnText, { color: FrostColors.ink }]}>Lock Date</Text>
              </Pressable>
            </View>
          </FrostedInfoCard>
        </Pressable>
      ) : null}

      {/* FILTER SHEET */}
      {filterOpen ? (
        <FilterSheet
          filters={filters}
          onToggleCategory={toggleCategory}
          onPriceMin={updatePriceMin}
          onPriceMax={updatePriceMax}
          onApply={applyFilters}
          onReset={resetFilters}
          onDismiss={() => setFilterOpen(false)}
          insetsTop={insets.top}
          insetsBottom={insets.bottom}
        />
      ) : null}
    </View>
  );
}

// ─── Filter Pill (top-right anchor) ──────────────────────────────────────────

function FilterPill({ count, onPress, active }: { count: number; onPress: () => void; active: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <View style={[pillStyles.outer, active && pillStyles.outerActive]}>
        <SlidersHorizontal size={13} color={FrostColors.white} strokeWidth={1.6} />
        <Text style={pillStyles.label}>Filters</Text>
        {count > 0 ? (
          <View style={pillStyles.badge}>
            <Text style={pillStyles.badgeText}>{count}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const pillStyles = StyleSheet.create({
  outer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 100,
  },
  outerActive: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderColor: 'rgba(201,168,76,0.6)',
  },
  label: {
    fontFamily: FrostFonts.label,
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: FrostColors.white,
  },
  badge: {
    minWidth: 16, height: 16,
    borderRadius: 8,
    backgroundColor: FrostColors.goldTrue,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: FrostFonts.bodyBold,
    fontSize: 9,
    color: FrostColors.ink,
  },
});

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

// ─── Filter Sheet ────────────────────────────────────────────────────────────

function FilterSheet({
  filters, onToggleCategory, onPriceMin, onPriceMax,
  onApply, onReset, onDismiss, insetsTop, insetsBottom,
}: {
  filters: FilterState;
  onToggleCategory: (id: string) => void;
  onPriceMin: (v: number) => void;
  onPriceMax: (v: number) => void;
  onApply: () => void;
  onReset: () => void;
  onDismiss: () => void;
  insetsTop: number;
  insetsBottom: number;
}) {
  const cats = FrostCopy.discoverCanvas.discoveryCategories;
  const fc = FrostCopy.discoverCanvas.filter;

  return (
    <Pressable style={sheetStyles.scrim} onPress={onDismiss}>
      <Pressable style={[sheetStyles.sheetOuter, { marginTop: insetsTop + 56 }]} onPress={() => {}}>
        {Platform.OS === 'web' ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              // @ts-expect-error
              {
                backdropFilter: FrostMaterial.composerBlurWeb,
                WebkitBackdropFilter: FrostMaterial.composerBlurWeb,
                backgroundColor: 'rgba(248,247,245,0.84)',
              },
            ]}
          />
        ) : Platform.OS === 'ios' ? (
          <BlurView intensity={75} tint="light" style={StyleSheet.absoluteFill} />
        ) : ANDROID_BLUR_SUPPORTED ? (
          <BlurView
            intensity={42}
            tint="light"
            experimentalBlurMethod={FrostMaterial.androidExperimentalMethod}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(248,247,245,0.94)' }]} />
        )}

        <ScrollView
          style={sheetStyles.contentScroll}
          contentContainerStyle={[sheetStyles.contentInner, { paddingBottom: insetsBottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={sheetStyles.handle} />
          <Text style={sheetStyles.title}>{fc.title}</Text>

          {/* Category — multi-select */}
          <Text style={sheetStyles.section}>{fc.categoryLabel}</Text>
          <View style={sheetStyles.catRow}>
            {cats.map((c) => {
              const active = filters.categories.includes(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => onToggleCategory(c.id)}
                  style={[sheetStyles.catChip, active && sheetStyles.catChipActive]}
                >
                  <Text style={[sheetStyles.catChipLabel, active && sheetStyles.catChipLabelActive]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Price — dual-handle slider */}
          <Text style={sheetStyles.section}>{fc.priceLabel}</Text>
          <View style={sheetStyles.priceWrap}>
            <Text style={sheetStyles.priceVal}>
              {formatPrice(filters.priceMin)} — {formatPrice(filters.priceMax)}
            </Text>
            <DualHandleSlider
              min={PRICE_MIN}
              max={PRICE_MAX}
              step={PRICE_STEP}
              valueMin={filters.priceMin}
              valueMax={filters.priceMax}
              onMinChange={onPriceMin}
              onMaxChange={onPriceMax}
            />
          </View>

          {/* Actions */}
          <View style={sheetStyles.actions}>
            <Pressable onPress={onReset} style={[sheetStyles.actionBtn, sheetStyles.actionGhost]}>
              <Text style={[sheetStyles.actionLabel, sheetStyles.actionGhostLabel]}>{fc.reset}</Text>
            </Pressable>
            <Pressable onPress={onApply} style={[sheetStyles.actionBtn, sheetStyles.actionPrimary]}>
              <Text style={[sheetStyles.actionLabel, sheetStyles.actionPrimaryLabel]}>{fc.apply}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

// ─── Dual-Handle Slider (no extra dependency — built on PanResponder) ────────

function DualHandleSlider({
  min, max, step, valueMin, valueMax, onMinChange, onMaxChange,
}: {
  min: number; max: number; step: number;
  valueMin: number; valueMax: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
}) {
  const [trackW, setTrackW] = useState(SCREEN_W - 80);
  const HANDLE = 24;

  const range = max - min;
  const minPct = ((valueMin - min) / range);
  const maxPct = ((valueMax - min) / range);

  const minLeft = Math.max(0, minPct * trackW);
  const maxLeft = Math.max(0, maxPct * trackW);

  // Latest-value refs so the stable PanResponder always reads fresh values
  const minRef       = useRef(min);
  const rangeRef     = useRef(range);
  const stepRef      = useRef(step);
  const trackWRef    = useRef(trackW);
  const valueMinRef  = useRef(valueMin);
  const valueMaxRef  = useRef(valueMax);
  const onMinRef     = useRef(onMinChange);
  const onMaxRef     = useRef(onMaxChange);
  const startLeftMin = useRef(0);
  const startLeftMax = useRef(0);

  useEffect(() => { minRef.current = min; });
  useEffect(() => { rangeRef.current = range; });
  useEffect(() => { stepRef.current = step; });
  useEffect(() => { trackWRef.current = trackW; });
  useEffect(() => { valueMinRef.current = valueMin; });
  useEffect(() => { valueMaxRef.current = valueMax; });
  useEffect(() => { onMinRef.current = onMinChange; });
  useEffect(() => { onMaxRef.current = onMaxChange; });

  const snap = (v: number) => Math.round(v / stepRef.current) * stepRef.current;

  const minResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startLeftMin.current =
          ((valueMinRef.current - minRef.current) / rangeRef.current) * trackWRef.current;
      },
      onPanResponderMove: (_, g) => {
        const next = Math.min(Math.max(0, startLeftMin.current + g.dx), trackWRef.current);
        const v = snap(minRef.current + (next / trackWRef.current) * rangeRef.current);
        onMinRef.current(v);
      },
    })
  ).current;

  const maxResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startLeftMax.current =
          ((valueMaxRef.current - minRef.current) / rangeRef.current) * trackWRef.current;
      },
      onPanResponderMove: (_, g) => {
        const next = Math.min(Math.max(0, startLeftMax.current + g.dx), trackWRef.current);
        const v = snap(minRef.current + (next / trackWRef.current) * rangeRef.current);
        onMaxRef.current(v);
      },
    })
  ).current;

  return (
    <View
      style={sliderStyles.wrap}
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
    >
      {/* Inactive track */}
      <View style={sliderStyles.trackBg} />

      {/* Active range */}
      <View
        style={[
          sliderStyles.trackActive,
          { left: minLeft, width: Math.max(0, maxLeft - minLeft) },
        ]}
      />

      {/* Min handle */}
      <View
        {...minResponder.panHandlers}
        style={[
          sliderStyles.handle,
          { left: minLeft - HANDLE / 2 },
        ]}
      >
        <View style={sliderStyles.handleInner} />
      </View>

      {/* Max handle */}
      <View
        {...maxResponder.panHandlers}
        style={[
          sliderStyles.handle,
          { left: maxLeft - HANDLE / 2 },
        ]}
      >
        <View style={sliderStyles.handleInner} />
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  wrap: {
    height: 44,
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  trackBg: {
    height: 3, borderRadius: 2,
    backgroundColor: 'rgba(168,146,75,0.18)',
  },
  trackActive: {
    position: 'absolute',
    height: 3, borderRadius: 2,
    backgroundColor: FrostColors.goldMuted,
  },
  handle: {
    position: 'absolute',
    top: 10,
    width: 24, height: 24,
    borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  handleInner: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: FrostColors.white,
    borderWidth: 2,
    borderColor: FrostColors.goldMuted,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});

const sheetStyles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.42)',
    zIndex: 50,
  },
  sheetOuter: {
    marginHorizontal: 14,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(168,146,75,0.28)',
  },
  contentScroll: {
    maxHeight: SCREEN_H * 0.7,
  },
  contentInner: {
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  handle: {
    width: 36, height: 4,
    borderRadius: 2,
    backgroundColor: FrostColors.hairline,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    ...FrostType.displayM,
    fontStyle: 'italic',
    fontFamily: FrostFonts.display,
    color: FrostColors.ink,
    marginBottom: 18,
  },
  section: {
    fontFamily: FrostFonts.label,
    fontSize: 10,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    color: FrostColors.muted,
    marginTop: 14,
    marginBottom: 12,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
    backgroundColor: 'rgba(255,253,248,0.5)',
  },
  catChipActive: {
    borderColor: FrostColors.goldMuted,
    backgroundColor: 'rgba(168,146,75,0.12)',
  },
  catChipLabel: {
    fontFamily: FrostFonts.body,
    fontSize: 12,
    color: FrostColors.soft,
  },
  catChipLabelActive: {
    fontFamily: FrostFonts.bodyBold,
    color: FrostColors.ink,
  },
  priceWrap: {
    marginTop: 4,
  },
  priceVal: {
    fontFamily: FrostFonts.display,
    fontSize: 18,
    fontStyle: 'italic',
    color: FrostColors.ink,
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionGhost: {
    backgroundColor: 'transparent',
    borderColor: FrostColors.hairline,
  },
  actionPrimary: {
    backgroundColor: FrostColors.ink,
    borderColor: FrostColors.ink,
  },
  actionLabel: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  actionGhostLabel: {
    color: FrostColors.soft,
  },
  actionPrimaryLabel: {
    color: FrostColors.white,
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
