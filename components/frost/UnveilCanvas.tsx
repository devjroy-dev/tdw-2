/**
 * UnveilCanvas — Frost v1.1
 *
 * A TRANSPARENT SHELL with a hairline border.
 * The boxes do NOT have their own background or images.
 * Their visual "content" is the Layer 1.5 image bleeding through from beneath the frost.
 *
 * Long-press (~420ms) → reveal animation → push to canvas route.
 * Tap = no-op (reserved for v1.1+ image cycling).
 *
 * NO: overflow hidden, NO: border radius, NO: background color.
 * ONLY: hairline border #C8C3BC, eyebrow text, child content at bottom.
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Platform,
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

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}

interface UnveilCanvasProps {
  route: string;
  width?: number | string;
  height?: number;
  eyebrow?: string;
  children?: React.ReactNode;
  style?: object;
}

export default function UnveilCanvas({
  route,
  width,
  height = 160,
  eyebrow,
  children,
  style,
}: UnveilCanvasProps) {
  const isHolding  = useRef(false);
  const holdTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unveiled   = useRef(false);
  const scale      = useSharedValue(1);

  const navigate = useCallback(() => {
    router.push(route as any);
    setTimeout(() => {
      scale.value    = 1;
      unveiled.current = false;
    }, 600);
  }, [route]);

  const triggerReveal = useCallback(() => {
    if (unveiled.current) return;
    unveiled.current = true;

    if (Haptics && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    scale.value = withSequence(
      withTiming(1.03, { duration: 280, easing: Easing.out(Easing.quad) }),
      withTiming(1.0,  { duration: 120, easing: Easing.inOut(Easing.quad) }),
    );

    setTimeout(() => runOnJS(navigate)(), 320);
  }, [navigate]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => false,
      onPanResponderGrant: () => {
        isHolding.current = true;
        holdTimer.current = setTimeout(() => {
          if (isHolding.current) triggerReveal();
        }, 420);
      },
      onPanResponderRelease:   () => { isHolding.current = false; if (holdTimer.current) clearTimeout(holdTimer.current); },
      onPanResponderTerminate: () => { isHolding.current = false; if (holdTimer.current) clearTimeout(holdTimer.current); },
    })
  ).current;

  const containerAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.shell,
        { width: width ?? '100%', height },
        containerAnim,
        style,
      ]}
      {...panResponder.panHandlers}
    >
      {/* Eyebrow — top left */}
      {eyebrow ? (
        <Text style={styles.eyebrow} pointerEvents="none">{eyebrow}</Text>
      ) : null}

      {/* Children — bottom left */}
      {children ? (
        <View style={styles.childWrap} pointerEvents="none">
          {children}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    // Transparent shell — content shows through from Layer 1.5 beneath the frost
    backgroundColor: 'transparent',
    borderWidth: 0.5,
    borderColor: '#C8C3BC',
    // NO borderRadius, NO overflow hidden
    position: 'relative',
  },
  eyebrow: {
    position: 'absolute',
    top: 10,
    left: 12,
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
  },
});
