/**
 * FrostPane — the layered greyscale-frosted material.
 *
 * Stacks: colour image → greyscale filter → frost blur.
 * Sits beneath UI in `(frost)/landing.tsx`. Children render on top.
 *
 * Per platform:
 *   - Web:     CSS filter: grayscale + backdrop-filter: blur (real frost)
 *   - iOS:     desaturating overlay + BlurView (real blur, approximated greyscale)
 *   - Android: flat warm-grey tint (perf-safe fallback, no real blur)
 *
 * Use this OR roll the layers inline (as `landing.tsx` currently does for
 * fine-grained control over the 1.5 layer for box images). For canvases that
 * want the same material as a static backdrop, prefer this component.
 */

import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { FrostColors, FrostMaterial } from '../../constants/frost';

interface FrostPaneProps {
  /** Optional override for the underlying colour image. */
  imageUri?: string;
  /** Render children on top of the frost material. */
  children?: React.ReactNode;
  /** When true, content area touches are passed through. */
  passthrough?: boolean;
}

const DEFAULT_IMAGE =
  'https://res.cloudinary.com/dccso5ljv/image/upload/v1778266065/IMG_2565.PNG_vua5o3.jpg';

export default function FrostPane({
  imageUri = DEFAULT_IMAGE,
  children,
  passthrough = false,
}: FrostPaneProps) {
  return (
    <View
      style={styles.root}
      pointerEvents={passthrough ? 'box-none' : 'auto'}
    >
      {/* LAYER 1 — colour image */}
      <Image
        source={{ uri: imageUri }}
        style={[
          StyleSheet.absoluteFill,
          Platform.OS === 'web'
            ? // @ts-expect-error — web-only style
              {
                filter: FrostMaterial.greyscaleFilter,
                WebkitFilter: FrostMaterial.greyscaleFilter,
              }
            : null,
        ]}
        resizeMode="cover"
      />

      {/* LAYER 2 (native only) — greyscale approximation overlay */}
      {Platform.OS !== 'web' ? (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: FrostColors.desatOverlay }]}
          pointerEvents="none"
        />
      ) : null}

      {/* LAYER 3 — frost blur */}
      {Platform.OS === 'web' ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            // @ts-expect-error — web-only style
            {
              backdropFilter: FrostMaterial.pageBlurWeb,
              WebkitBackdropFilter: FrostMaterial.pageBlurWeb,
              backgroundColor: FrostColors.frostTint,
            },
          ]}
          pointerEvents="none"
        />
      ) : Platform.OS === 'ios' ? (
        <BlurView
          intensity={FrostMaterial.pageBlurIOS}
          tint="light"
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: FrostMaterial.androidPageTint }]}
          pointerEvents="none"
        />
      )}

      {/* Optional children on top of the material */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: FrostColors.pageFallback,
  },
});
