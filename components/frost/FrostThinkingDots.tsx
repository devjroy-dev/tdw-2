/**
 * FrostThinkingDots — three brass dots that animate in sequence while
 * Dream Ai is composing a reply.
 *
 * Phase 2. Replaces the 4-8 second dead-air freeze the bride sees while
 * `await brideChat()` is in flight. Renders as a transient stream item
 * that lives until the AI line arrives and the parent removes it.
 *
 * Voice register: ✦ glyph in `goldMuted` brass, three of them, each
 * fading in→out in a 1200ms staggered cycle. No "Dream Ai is typing"
 * text — too on-the-nose, too WhatsApp. Just the dots.
 *
 * Layout intentionally mirrors AILine — same paddingHorizontal, same
 * left-glyph-and-content rhythm — so when the real reply arrives, the
 * stream feels continuous rather than jumpy.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { FrostColors, FrostFonts, FrostSpace } from '../../constants/frost';

const DOT_COUNT = 3;
const CYCLE_MS = 1200;
const STAGGER_MS = 180;

export default function FrostThinkingDots() {
  // One Animated.Value per dot. Each cycles 0 → 1 → 0 with a stagger so the
  // three dots feel like a slow-breathing constellation, not a marquee.
  const opacities = useRef(
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0.25))
  ).current;

  useEffect(() => {
    const loops = opacities.map((opacity, idx) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(idx * STAGGER_MS),
          Animated.timing(opacity, {
            toValue: 1,
            duration: CYCLE_MS / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.25,
            duration: CYCLE_MS / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [opacities]);

  return (
    <View style={styles.row}>
      {/* Left-side spacer matches AILine's glyph column — so the dots
          appear under where the next AI reply's ✦ will sit. */}
      <View style={styles.glyphSpacer} />
      <View style={styles.dotsRow}>
        {opacities.map((opacity, i) => (
          <Animated.View key={i} style={{ opacity }}>
            <Text style={styles.dot}>✦</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const AVATAR_SIZE = 32;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: FrostSpace.xxl,
    paddingVertical: FrostSpace.m,
    gap: FrostSpace.m,
  },
  glyphSpacer: {
    width: AVATAR_SIZE,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    fontFamily: FrostFonts.body,
    fontSize: 12,
    color: FrostColors.goldMuted,
  },
});
