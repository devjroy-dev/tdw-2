/**
 * RotatingImage — cross-fades through a list of image URIs.
 * Used inside Muse and Discover box images on the Frost landing.
 * Timing comes from FrostMotion tokens.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Image, StyleSheet, Animated, View } from 'react-native';
import { FrostMotion } from '../../constants/frost';

interface RotatingImageProps {
  sources: string[];
  intervalMs?: number;
  fadeMs?: number;
  /** When true, slightly different timing — used to desync neighboring boxes. */
  offset?: boolean;
}

export default function RotatingImage({
  sources,
  intervalMs = FrostMotion.imageInterval,
  fadeMs = FrostMotion.imageFade,
  offset = false,
}: RotatingImageProps) {
  const effectiveInterval = offset ? intervalMs + 700 : intervalMs;

  const [index, setIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1 % sources.length);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (sources.length <= 1) return;

    const id = setInterval(() => {
      Animated.timing(fade, {
        toValue: 1,
        duration: fadeMs,
        useNativeDriver: true,
      }).start(() => {
        setIndex(nextIndex);
        setNextIndex((nextIndex + 1) % sources.length);
        fade.setValue(0);
      });
    }, effectiveInterval);

    return () => clearInterval(id);
  }, [nextIndex, sources.length, effectiveInterval, fadeMs, fade]);

  if (sources.length === 0) return <View style={styles.fill} />;

  return (
    <View style={styles.fill}>
      <Image source={{ uri: sources[index] }} style={styles.image} resizeMode="cover" />
      {sources.length > 1 ? (
        <Animated.View style={[styles.fill, { opacity: fade }]}>
          <Image source={{ uri: sources[nextIndex] }} style={styles.image} resizeMode="cover" />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
  image: { width: '100%', height: '100%' },
});
