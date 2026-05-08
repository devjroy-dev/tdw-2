/**
 * FrostBackdrop — Frost's whole-page material.
 *
 * Three stacked layers:
 *   1. Colorful underlying image (warm bridal scene, full saturation)
 *   2. Greyscale filter overlay (drains the image of color)
 *   3. Frost blur (full-page backdrop blur)
 *
 * The page UI sits on top of all three. Result: bride sees a soft monochrome
 * world through cool glass at rest. On long-press of a box, that region's
 * filter + blur peel back, revealing the same image at full color.
 *
 * Per platform:
 *   - Web:     CSS filter: grayscale(100%) + backdrop-filter: blur(24px)
 *   - iOS:     BlurView intensity={60} + greyscale overlay (saturation matrix)
 *   - Android: translucent grey-tinted overlay (perf-safe fallback)
 */

import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';

// Soft warm bridal scene — placeholder underlying image. Drained to greyscale
// at rest, blooms back to color on canvas reveal in v0.3.
const UNDERLYING =
  'https://res.cloudinary.com/dccso5ljv/image/upload/v1778266065/IMG_2565.PNG_vua5o3.jpg';

export default function FrostBackdrop() {
  if (Platform.OS === 'web') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Layer 1 — colorful image, immediately filtered to greyscale */}
        <Image
          source={{ uri: UNDERLYING }}
          style={[
            StyleSheet.absoluteFill,
            // @ts-expect-error — web-only style
            {
              filter: 'grayscale(100%) contrast(0.92) brightness(1.08)',
              WebkitFilter: 'grayscale(100%) contrast(0.92) brightness(1.08)',
            },
          ]}
          resizeMode="cover"
        />

        {/* Layer 2 — full-page frost over the now-greyscale image */}
        <View
          style={[
            StyleSheet.absoluteFill,
            // @ts-expect-error — web-only style
            {
              backdropFilter: 'blur(28px) saturate(105%)',
              WebkitBackdropFilter: 'blur(28px) saturate(105%)',
              backgroundColor: 'rgba(244,242,238,0.62)',
            },
          ]}
        />
      </View>
    );
  }

  if (Platform.OS === 'ios') {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image
          source={{ uri: UNDERLYING }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        {/* Greyscale approximation: warm-tinted desaturating overlay */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(58,55,51,0.45)' },
          ]}
        />
        {/* Real iOS frost */}
        <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
        {/* Final cream wash to settle the colour temperature */}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(244,242,238,0.32)' },
          ]}
        />
      </View>
    );
  }

  // Android fallback — flat warm-grey field, no blur, no image (perf-safe)
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: '#E8E5E0' },
      ]}
      pointerEvents="none"
    />
  );
}
