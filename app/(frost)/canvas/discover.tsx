/**
 * Frost · Canvas · Discover (beta)
 *
 * Architecture:
 *   1. Default state: full-bleed carousel of 5 paid hero spots cycling through.
 *      No frost. Real colour. Magazine cover mode.
 *   2. Top-right small frosted pill button: "More" with subtle muted-gold border
 *      and gold label. Discoverable but doesn't break the picture.
 *   3. Tap More → frosted overlay covers the hero carousel → reveals 4
 *      navigation buttons (frosted) for the original Discover modes:
 *        · Blind Swipe
 *        · My Discovery
 *        · Couture
 *        · Categories
 *   4. Each button navigates to its dedicated subroute that ports the existing
 *      swipe grammar from native discover.tsx (vertical=next vendor,
 *      horizontal=next photo, double-tap=save).
 *
 * Heroes are managed via admin in production; here they're placeholders.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, Pressable, Platform, StatusBar,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Sparkles } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { Grayscale } from 'react-native-color-matrix-image-filters';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostRadius,
  FrostMotion, FrostMaterial, FrostCopy,
} from '../../../constants/frost';
import FrostedSurface from '../../../components/frost/FrostedSurface';
import { fetchDiscoverHeroes, type DiscoverHero } from '../../../services/frostApi';

const NAV_OPTIONS: Array<{ id: keyof typeof FrostCopy.discoverCanvas.options; route: string }> = [
  { id: 'blindSwipe', route: '/(frost)/canvas/discover/blind-swipe' },
  { id: 'myFeed',     route: '/(frost)/canvas/discover/feed' },
  { id: 'couture',    route: '/(frost)/canvas/discover/couture' },
  { id: 'categories', route: '/(frost)/canvas/discover/categories' },
];

// Android API 31+ supports experimental dimezis BlurView (true material).
const ANDROID_BLUR_SUPPORTED =
  Platform.OS === 'android' &&
  typeof Platform.Version === 'number' &&
  (Platform.Version as number) >= FrostMaterial.androidMinApi;

export default function CanvasDiscover() {
  const insets = useSafeAreaInsets();
  const [heroes, setHeroes] = useState<DiscoverHero[]>([]);
  const [loadingHeroes, setLoadingHeroes] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const heroFade = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Fetch heroes on mount (admin-managed via /admin/discover-heroes)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchDiscoverHeroes();
      if (cancelled) return;
      setHeroes(data);
      // Initial nextIdx wraps to second image, or 0 if there's only one
      setNextIdx(data.length > 1 ? 1 : 0);
      setLoadingHeroes(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Hero carousel cross-fade — reads live heroes.length so it works after fetch
  useEffect(() => {
    if (heroes.length <= 1) return;
    const id = setInterval(() => {
      Animated.timing(heroFade, {
        toValue: 1,
        duration: FrostMotion.heroFade,
        useNativeDriver: true,
      }).start(() => {
        setHeroIdx(nextIdx);
        setNextIdx((nextIdx + 1) % heroes.length);
        heroFade.setValue(0);
      });
    }, FrostMotion.heroInterval);
    return () => clearInterval(id);
  }, [nextIdx, heroFade, heroes.length]);

  // More overlay fade in/out
  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: moreOpen ? 1 : 0,
      duration: FrostMotion.moreOverlay,
      useNativeDriver: true,
    }).start();
  }, [moreOpen, overlayOpacity]);

  const close = () => router.back();

  // Empty / loading guards — never reach the [heroIdx] array access on an empty list
  if (loadingHeroes) {
    return (
      <View style={[styles.root, styles.statefulCenter]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator color={FrostColors.goldMuted} />
      </View>
    );
  }

  if (heroes.length === 0) {
    return (
      <View style={[styles.root, styles.statefulCenter]}>
        <StatusBar barStyle="light-content" />
        <View style={styles.emptyIconWrap}>
          <Sparkles size={28} color={FrostColors.goldMuted} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>Discover, momentarily.</Text>
        <Text style={styles.emptySub}>
          Curated covers are on the way. Check back in a little while.
        </Text>
        <Pressable onPress={close} style={styles.emptyClose} hitSlop={16}>
          <X size={22} color={FrostColors.white} strokeWidth={1.5} />
        </Pressable>
      </View>
    );
  }

  const currentHero = heroes[heroIdx % heroes.length];
  const peekHero    = heroes[nextIdx % heroes.length];

  return (
    <View style={styles.root}>
      <StatusBar barStyle={moreOpen ? 'dark-content' : 'light-content'} />

      {/* HERO CAROUSEL — sanctuary mode (greyscale). Tap → Blind Swipe (catalogue). */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => router.push('/(frost)/canvas/discover/blind-swipe' as any)}
      >
        <Grayscale amount={1}>
          <Image
            source={{ uri: currentHero.image_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        </Grayscale>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: heroFade }]}>
          <Grayscale amount={1}>
            <Image
              source={{ uri: peekHero.image_url }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          </Grayscale>
        </Animated.View>
      </Pressable>

      {/* TOP BAR — eyebrow + close X (live above the hero) */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topBarLeft}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>{FrostCopy.discoverCanvas.eyebrow}</Text>
        </View>

        <View style={styles.topBarRight}>
          {/* MORE PILL — small, frosted, gold-tinted */}
          <MorePill open={moreOpen} onPress={() => setMoreOpen(o => !o)} />

          <Pressable onPress={close} hitSlop={16} style={styles.closeBtn}>
            <X
              size={22}
              color={moreOpen ? FrostColors.ink : FrostColors.white}
              strokeWidth={1.5}
            />
          </Pressable>
        </View>
      </View>

      {/* MORE OVERLAY — frosted pane revealing nav buttons */}
      <Animated.View
        pointerEvents={moreOpen ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}
      >
        {/* Greyscale + frost over the heroes */}
        {Platform.OS === 'web' ? (
          <View
            style={([
              StyleSheet.absoluteFill,
              {
                backdropFilter: FrostMaterial.pageBlurWeb + ' grayscale(100%)',
                WebkitBackdropFilter: FrostMaterial.pageBlurWeb + ' grayscale(100%)',
                backgroundColor: FrostColors.frostTint,
              },
            ]) as any}
          />
        ) : Platform.OS === 'ios' ? (
          <BlurView intensity={FrostMaterial.pageBlurIOS} tint="light" style={StyleSheet.absoluteFill} />
        ) : ANDROID_BLUR_SUPPORTED ? (
          <BlurView
            intensity={FrostMaterial.pageBlurAndroid}
            tint="light"
            experimentalBlurMethod={FrostMaterial.androidExperimentalMethod}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: FrostMaterial.androidPageTint }]} />
        )}

        {/* Overlay UI: title + 4 buttons */}
        <View style={[styles.overlayContent, { paddingTop: insets.top + 80 }]}>
          <Text style={styles.overlayTitle}>{FrostCopy.discoverCanvas.overlayTitle}</Text>

          <View style={styles.optionList}>
            {NAV_OPTIONS.map((opt) => {
              const copy = FrostCopy.discoverCanvas.options[opt.id];
              return (
                <FrostedSurface
                  key={opt.id}
                  mode="button"
                  onPress={() => {
                    setMoreOpen(false);
                    setTimeout(() => router.push(opt.route as any), 200);
                  }}
                  style={{ marginBottom: FrostSpace.m }}
                >
                  <View style={styles.optionInner}>
                    <Text style={styles.optionTitle}>{copy.title}</Text>
                    <Text style={styles.optionSub}>{copy.sub}</Text>
                  </View>
                </FrostedSurface>
              );
            })}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── MorePill ────────────────────────────────────────────────────────────────
function MorePill({ open, onPress }: { open: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      <FrostedSurface
        mode="button"
        radius={FrostRadius.pill}
        style={styles.morePill}
      >
        <View style={styles.morePillInner}>
          <Plus
            size={12}
            color={FrostColors.goldMuted}
            strokeWidth={2}
            style={open ? { transform: [{ rotate: '45deg' }] } : undefined}
          />
          <Text style={styles.morePillLabel}>{FrostCopy.discoverCanvas.moreLabel}</Text>
        </View>
      </FrostedSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FrostColors.black },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: FrostSpace.xxl,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.s,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.m,
  },
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
  closeBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },

  // More pill
  morePill: {
    height: 32,
    paddingHorizontal: 4,
    minWidth: 78,
    borderRadius: 100,
  },
  morePillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FrostSpace.xs + 2,
    paddingHorizontal: FrostSpace.m,
    paddingVertical: 7,
  },
  morePillLabel: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: FrostColors.goldMuted,
  },

  // Overlay
  overlayContent: {
    flex: 1,
    paddingHorizontal: FrostSpace.xxl,
  },
  overlayTitle: {
    ...FrostType.displayM,
    fontStyle: 'italic',
    fontFamily: FrostFonts.display,
    color: FrostColors.ink,
    marginBottom: FrostSpace.xxl,
  },
  optionList: {
    gap: FrostSpace.s,
  },
  optionInner: {
    paddingVertical: FrostSpace.xl - 2,
    paddingHorizontal: FrostSpace.xl,
  },
  optionTitle: {
    fontFamily: FrostFonts.display,
    fontSize: 22,
    lineHeight: 28,
    color: FrostColors.ink,
    marginBottom: 4,
  },
  optionSub: {
    ...FrostType.bodySmall,
    color: FrostColors.soft,
    lineHeight: 19,
  },

  // Loading / empty states (no heroes yet)
  statefulCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: FrostSpace.xxl,
  },
  emptyIconWrap: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(168,146,75,0.14)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: FrostSpace.l,
  },
  emptyTitle: {
    fontFamily: FrostFonts.display,
    fontSize: 28,
    color: FrostColors.white,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: FrostSpace.s,
  },
  emptySub: {
    fontFamily: FrostFonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: FrostSpace.l,
  },
  emptyClose: {
    position: 'absolute',
    top: 60, right: FrostSpace.xxl,
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
});
