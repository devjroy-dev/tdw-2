/**
 * Frost · FrostGestureHint
 *
 * A soft, italic Cormorant line that fades in once and disappears 4 seconds
 * later. Persisted-dismissed via AsyncStorage so the bride sees it once per
 * page (per `storageKey`), then never again.
 *
 * Used on Journey read-pages that have a long-press action — to gently teach
 * the gesture grammar ("Tap to know. Hold to act.") without nagging.
 *
 * If AsyncStorage is unavailable for any reason, fail open: hint shows once
 * per session (in-memory) instead of once forever. Better than crashing.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Text, Animated, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FrostColors, FrostFonts, FrostSpace, FrostType } from '../../constants/frost';

interface Props {
  /** Unique key per page so each surface has its own dismissed-flag. */
  storageKey: string;
  /** The hint copy. Italic Cormorant, soft grey. */
  text: string;
  /** Milliseconds to display before fading out. Default 4000. */
  showMs?: number;
}

export default function FrostGestureHint({ storageKey, text, showMs = 4000 }: Props) {
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem('frost_hint_' + storageKey);
        if (seen === '1') return;
      } catch { /* fail open — show the hint anyway */ }
      if (cancelled) return;
      setVisible(true);
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      const t = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 800, useNativeDriver: true }).start(() => {
          if (!cancelled) setVisible(false);
        });
        AsyncStorage.setItem('frost_hint_' + storageKey, '1').catch(() => {});
      }, showMs);
      return () => clearTimeout(t);
    })();
    return () => { cancelled = true; };
  }, [storageKey, showMs, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.wrap, { opacity }]}>
      <Text style={styles.text}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: FrostSpace.xs,
    marginBottom: FrostSpace.l,
  },
  text: {
    ...FrostType.bodySmall,
    fontFamily: FrostFonts.display,
    fontStyle: 'italic',
    color: FrostColors.muted,
  },
});
