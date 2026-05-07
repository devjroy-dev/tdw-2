/**
 * UnveilCanvas — Frost v1.1
 *
 * A frosted-glass box that:
 *   - Rests at full greyscale + blur
 *   - Long-press (~420ms): animates frost lift + colour return + scale-to-fill
 *   - On animation complete: pushes to the destination canvas route
 *
 * Used by landing.tsx for Muse, Discover, Dream boxes.
 * Journey bar uses a simpler tap — does not use UnveilCanvas.
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { router } from 'expo-router';

// Haptics — optional, no-op on web
let Haptics: any = null;
try {
  Haptics = require('expo-haptics');
} catch {}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Frost colour constants ────────────────────────────────────────────────
const FROST_TINT = 'rgba(244,242,238,0.42)';
const HAIRLINE   = '#C8C3BC';

// ─── Types ────────────────────────────────────────────────────────────────
interface UnveilCanvasProps {
  /** Destination route, e.g. '/(frost)/canvas/muse' */
  route: string;
  /** Width as a number (px) or flex proportion string */
  width?: number | string;
  height?: number;
  /** Static label shown as an eyebrow above box content */
  eyebrow?: string;
  /** Children rendered inside the box (visible through frost) */
  children?: React.ReactNode;
  /** Background image URI to show inside this box region */
  imageUri?: string;
  /** Extra styles for the outer container */
  style?: object;
}

export default function UnveilCanvas({
  route,
  width,
  height = 160,
  eyebrow,
  children,
  imageUri,
  style,
}: UnveilCanvasProps) {
  const isHolding = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unveiled  = useRef(false);

  // ── Animation shared values ──────────────────────────────────────────────
  // 0 = fully frosted/greyscale  |  1 = fully revealed/colour
  const revealProgress = useSharedValue(0);
  // Scale: 1 → slight grow as reveal starts, then route push takes over
  const scale = useSharedValue(1);
  // Opacity: fades out the frost overlay
  const frostOpacity = useSharedValue(1);

  // ── Navigate after animation ─────────────────────────────────────────────
  const navigate = useCallback(() => {
    router.push(route as any);
    // Reset values after push so back-nav looks clean
    setTimeout(() => {
      revealProgress.value = 0;
      scale.value = 1;
      frostOpacity.value = 1;
      unveiled.current = false;
    }, 600);
  }, [route]);

  // ── Trigger the reveal sequence ───────────────────────────────────────────
  const triggerReveal = useCallback(() => {
    if (unveiled.current) return;
    unveiled.current = true;

    // Haptic on native
    if (Haptics && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Phase 1 (0–300ms): frost lifts + colour returns
    frostOpacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });

    revealProgress.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.quad),
    });

    // Phase 2 (0–400ms): scale up slightly then route
    scale.value = withSequence(
      withTiming(1.04, { duration: 280, easing: Easing.out(Easing.quad) }),
      withTiming(1.0, { duration: 120, easing: Easing.inOut(Easing.quad) }),
    );

    // Navigate after frost has lifted
    setTimeout(() => runOnJS(navigate)(), 380);
  }, [navigate]);

  // ── PanResponder for long-press (cross-platform) ─────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => false,
      onPanResponderGrant: () => {
        isHolding.current = true;
        holdTimer.current = setTimeout(() => {
          if (isHolding.current) triggerReveal();
        }, 420);
      },
      onPanResponderRelease: () => {
        isHolding.current = false;
        if (holdTimer.current) clearTimeout(holdTimer.current);
      },
      onPanResponderTerminate: () => {
        isHolding.current = false;
        if (holdTimer.current) clearTimeout(holdTimer.current);
      },
    })
  ).current;

  // ── Animated styles ───────────────────────────────────────────────────────

  // Container scale
  const containerAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Greyscale image overlay — on web we can't animate CSS filter via Reanimated
  // so we overlay a greyscale-tinted View that fades out as reveal progresses.
  // On native the image renders normally (already desaturated via the landing bg).
  const greyscaleOverlayAnim = useAnimatedStyle(() => ({
    opacity: 1 - revealProgress.value,
  }));

  // Frost pane opacity
  const frostPaneAnim = useAnimatedStyle(() => ({
    opacity: frostOpacity.value,
  }));

  const containerStyle: any = {
    width: width ?? '100%',
    height,
  };

  return (
    <Animated.View
      style={[styles.outerContainer, containerStyle, containerAnim, style]}
      {...panResponder.panHandlers}
    >
      {/* Box background image (if provided) */}
      {imageUri ? (
        <View style={StyleSheet.absoluteFill}>
          <Animated.Image
            source={{ uri: imageUri }}
            style={[StyleSheet.absoluteFill, styles.boxImage]}
            resizeMode="cover"
          />
          {/* Greyscale overlay — fades out on reveal */}
          <Animated.View
            style={[StyleSheet.absoluteFill, styles.greyscaleOverlay, greyscaleOverlayAnim]}
            pointerEvents="none"
          />
        </View>
      ) : null}

      {/* Frost pane — fades out on reveal */}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.frostPane, frostPaneAnim]}
        pointerEvents="none"
      />

      {/* Content on top of frost */}
      {eyebrow ? (
        <View style={styles.eyebrowWrap} pointerEvents="none">
          <Animated.Text style={styles.eyebrowText}>{eyebrow}</Animated.Text>
        </View>
      ) : null}

      {children ? (
        <View style={styles.childWrap} pointerEvents="none">
          {children}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    borderWidth: 0.5,
    borderColor: HAIRLINE,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  boxImage: {
    width: '100%',
    height: '100%',
  },
  // Greyscale simulation overlay — semi-transparent warm grey
  // Full opacity = effectively greyscale. Zero opacity = colour shows through.
  greyscaleOverlay: {
    backgroundColor: 'rgba(232,229,224,0.72)',
  },
  frostPane: {
    backgroundColor: FROST_TINT,
    // On web: real backdrop-filter blur applied via style prop below
    // On native: expo-blur BlurView handles this in landing.tsx
  },
  eyebrowWrap: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    zIndex: 10,
  },
  eyebrowText: {
    fontFamily: 'Jost_300Light',
    fontSize: 8,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: '#8C8480',
  },
  childWrap: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    zIndex: 10,
  },
});
