/**
 * Frost \u00B7 Canvas \u00B7 Discover (beta)
 *
 * Architecture:
 *   1. Default state: full-bleed carousel of 5 paid hero spots cycling through.
 *      No frost. Real colour. Magazine cover mode.
 *   2. Top-right small frosted pill button: "More" with subtle muted-gold border
 *      and gold label. Discoverable but doesn't break the picture.
 *   3. Tap More \u2192 frosted overlay covers the hero carousel \u2192 reveals 4
 *      navigation buttons (frosted) for the original Discover modes:
 *        \u00B7 Blind Swipe
 *        \u00B7 My Feed
 *        \u00B7 Couture
 *        \u00B7 Categories
 *   4. Each button navigates to its dedicated subroute that ports the existing
 *      swipe grammar from native discover.tsx (vertical=next vendor,
 *      horizontal=next photo, double-tap=save).
 *
 * Heroes are managed via admin in production; here they're placeholders.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, Pressable, Platform, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostRadius,
  FrostMotion, FrostMaterial, FrostCopy, DiscoverHeroes,
} from '../../../constants/frost';
import FrostedSurface from '../../../components/frost/FrostedSurface';

const NAV_OPTIONS: Array<{ id: keyof typeof FrostCopy.discoverCanvas.options; route: string }> = [
  { id: 'blindSwipe', route: '/(frost)/canvas/discover/blind-swipe' },
  { id: 'myFeed',     route: '/(frost)/canvas/discover/feed' },
  { id: 'couture',    route: '/(frost)/canvas/discover/couture' },
  { id: 'categories', route: '/(frost)/canvas/discover/categories' },
];

export default function CanvasDiscover() {
  const insets = useSafeAreaInsets();
  const [heroIdx, setHeroIdx] = useState(0);
  const [nextIdx, setNextIdx] = useState(1 % DiscoverHeroes.length);
  const [moreOpen, setMoreOpen] = useState(false);
  const heroFade = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Hero carousel cross-fade
  useEffect(() => {
    if (DiscoverHeroes.length <= 1) return;
    const id = setInterval(() => {
      Animated.timing(heroFade, {
        toValue: 1,
        duration: FrostMotion.heroFade,
        useNativeDriver: true,
      }).start(() => {
        setHeroIdx(nextIdx);
        setNextIdx((nextIdx + 1) % DiscoverHeroes.length);
        heroFade.setValue(0);
      });
    }, FrostMotion.heroInterval);
    return () => clearInterval(id);
  }, [nextIdx, heroFade]);

  // More overlay fade in/out
  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: moreOpen ? 1 : 0,
      duration: FrostMotion.moreOverlay,
      useNativeDriver: true,
    }).start();
  }, [moreOpen, overlayOpacity]);

  const close = () => router.back();

  return (
    <View style={styles.root}>
      <StatusBar barStyle={moreOpen ? 'dark-content' : 'light-content'} />

      {/* HERO CAROUSEL — full-bleed, real colour */}
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={{ uri: DiscoverHeroes[heroIdx].uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: heroFade }]}>
          <Image
            source={{ uri: DiscoverHeroes[nextIdx].uri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        </Animated.View>
      </View>

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
            style={[
              StyleSheet.absoluteFill,
              // @ts-expect-error
              {
                backdropFilter: FrostMaterial.pageBlurWeb + ' grayscale(100%)',
                WebkitBackdropFilter: FrostMaterial.pageBlurWeb + ' grayscale(100%)',
                backgroundColor: FrostColors.frostTint,
              },
            ]}
          />
        ) : Platform.OS === 'ios' ? (
          <BlurView intensity={FrostMaterial.pageBlurIOS} tint="light" style={StyleSheet.absoluteFill} />
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
});
