/**
 * UnveilCanvas — Frost's signature box primitive.
 *
 * A hairline-bordered tap region with an eyebrow label. Long-press fires
 * onUnveil. The box itself is a transparent shell — its visual content (e.g.
 * Muse rotating images) is rendered at the same z-level as the underlying
 * page material, beneath the frost pane, so the pane blurs them together
 * with the background. This produces the seamless newspaper-under-glass
 * surface.
 *
 * Children render naturally inside the box border on web (where CSS filter
 * can desaturate). On native, children render normally and the desaturating
 * overlay is applied by the parent screen.
 *
 * For the reveal animation (frost-lifts + colour-returns + scale-to-fullscreen),
 * see UnveilTransition.tsx — UnveilCanvas only handles the rest state and the
 * gesture trigger.
 */

import React, { useRef } from 'react';
import {
  View, Pressable, StyleSheet, Animated, Easing, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { FrostColors, FrostMotion, FrostRadius, FrostType, FrostSpace } from '../../constants/frost';

interface UnveilCanvasProps {
  children?: React.ReactNode;
  eyebrow?: string;
  onUnveil: () => void;
  width?: number;
  height?: number;
  /** Set true if this canvas wraps a Dream box (text content stays sharp, not greyscaled). */
  textContent?: boolean;
}

export default function UnveilCanvas({
  children,
  eyebrow,
  onUnveil,
  width,
  height,
  textContent = false,
}: UnveilCanvasProps) {
  const pressScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(pressScale, {
      toValue: 0.98,
      duration: FrostMotion.pressDuration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(pressScale, {
      toValue: 1,
      duration: FrostMotion.pressOutDuration,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handleLongPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onUnveil();
  };

  // Wrap children in greyscale filter on web — but ONLY for image content.
  // Text content (Dream box) should stay sharp.
  const renderContent = () => {
    if (Platform.OS === 'web' && !textContent) {
      return (
        <View
          style={[
            styles.contentLayer,
            // @ts-expect-error — web-only style
            {
              filter: 'grayscale(100%) contrast(0.95) brightness(1.04)',
              WebkitFilter: 'grayscale(100%) contrast(0.95) brightness(1.04)',
            },
          ]}
        >
          {children}
        </View>
      );
    }
    return <View style={styles.contentLayer}>{children}</View>;
  };

  return (
    <Animated.View
      style={[
        styles.outer,
        { width, height, transform: [{ scale: pressScale }] },
      ]}
    >
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={FrostMotion.longPressDelay}
        style={styles.pressable}
      >
        {renderContent()}

        {eyebrow ? (
          <View style={styles.eyebrowWrap} pointerEvents="none">
            <View style={styles.eyebrowDot} />
            <Animated.Text style={styles.eyebrowText}>{eyebrow}</Animated.Text>
          </View>
        ) : null}

        <View style={styles.border} pointerEvents="none" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: FrostRadius.box,
    overflow: 'hidden',
  },
  pressable: { flex: 1, position: 'relative' },
  contentLayer: { ...StyleSheet.absoluteFillObject },
  eyebrowWrap: {
    position: 'absolute',
    top: FrostSpace.l,
    left: FrostSpace.l,
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.s,
    zIndex: 10,
  },
  eyebrowDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: FrostColors.muted,
    opacity: 0.85,
  },
  eyebrowText: {
    ...FrostType.eyebrowSmall,
    color: FrostColors.hint,
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: FrostRadius.box,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
  },
});
