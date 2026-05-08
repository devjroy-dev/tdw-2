/**
 * FrostedSurface — universal frosted material for buttons, rows, panels.
 *
 * THE TOTAL FROST DOCTRINE:
 *   White cards are gone from Frost. Every button, row, tile, and panel uses
 *   this component. Frost breaks ONLY in:
 *     - Muse/Discover full-bleed image canvases (real colour)
 *     - Discover hero carousel BEFORE More is tapped (real colour)
 *
 * ZIP 6 — Android frost fix:
 *   Android historically rendered as flat translucent rectangles (no blur of
 *   the material below). expo-blur 12.9+ ships an experimental BlurView for
 *   Android API 31+ via the "dimezisBlurView" method, which actually samples
 *   and blurs what's behind the view. We feature-detect API level — devices
 *   below 31 keep the translucent solid fallback.
 *
 * Modes:
 *   - 'button'   — default. Light frosted, slightly brighter than page.
 *                  Use for Journey tiles, list rows, action buttons.
 *   - 'composer' — darker frost. Use for Dream chat compose bar.
 *   - 'panel'    — same as button but no press state (passive surfaces).
 *
 * Wraps children. Apply your own padding inside children.
 */

import React from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { FrostColors, FrostMaterial, FrostRadius } from '../../constants/frost';

type SurfaceMode = 'button' | 'composer' | 'panel';

interface FrostedSurfaceProps {
  children: React.ReactNode;
  mode?: SurfaceMode;
  /** When provided, surface is pressable. */
  onPress?: () => void;
  onLongPress?: () => void;
  /** Border radius override (default: FrostRadius.box). */
  radius?: number;
  /** Container style. */
  style?: any;
  /** Disabled = no press, slightly muted appearance. */
  disabled?: boolean;
}

// Android API 31+ supports the experimental dimezis blur view. Below that,
// we fall back to a translucent solid which still reads as frosted-ish.
const ANDROID_BLUR_SUPPORTED =
  Platform.OS === 'android' &&
  typeof Platform.Version === 'number' &&
  (Platform.Version as number) >= FrostMaterial.androidMinApi;

export default function FrostedSurface({
  children,
  mode = 'button',
  onPress,
  onLongPress,
  radius = FrostRadius.box,
  style,
  disabled = false,
}: FrostedSurfaceProps) {
  const isPressable = Boolean(onPress || onLongPress) && !disabled;
  const isComposer = mode === 'composer';

  const renderFrost = () => {
    if (Platform.OS === 'ios') {
      return (
        <BlurView
          intensity={isComposer ? FrostMaterial.composerBlurIOS : FrostMaterial.buttonBlurIOS}
          tint={isComposer ? 'default' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      );
    }
    if (Platform.OS === 'web') {
      return (
        <View
          style={[
            StyleSheet.absoluteFill,
            // @ts-expect-error — web-only style
            {
              backdropFilter: isComposer ? FrostMaterial.composerBlurWeb : FrostMaterial.buttonBlurWeb,
              WebkitBackdropFilter: isComposer ? FrostMaterial.composerBlurWeb : FrostMaterial.buttonBlurWeb,
              backgroundColor: isComposer ? FrostColors.composerFrostTint : FrostColors.buttonFrostTint,
            },
          ]}
          pointerEvents="none"
        />
      );
    }
    // Android — true blur on API 31+, translucent fallback otherwise
    if (ANDROID_BLUR_SUPPORTED) {
      return (
        <BlurView
          intensity={isComposer ? FrostMaterial.composerBlurAndroid : FrostMaterial.buttonBlurAndroid}
          tint={isComposer ? 'default' : 'light'}
          experimentalBlurMethod={FrostMaterial.androidExperimentalMethod}
          style={StyleSheet.absoluteFill}
        />
      );
    }
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isComposer
              ? FrostMaterial.androidComposerTint
              : FrostMaterial.androidButtonTint,
          },
        ]}
        pointerEvents="none"
      />
    );
  };

  const borderColor = isComposer ? FrostColors.composerHairline : FrostColors.buttonFrostBorder;

  const Inner = (
    <>
      {renderFrost()}
      {/* Hairline border with subtle gold tint */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: radius,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor,
          },
        ]}
      />
      <View style={styles.contentLayer}>{children}</View>
    </>
  );

  if (isPressable) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          styles.outer,
          { borderRadius: radius },
          pressed && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
      >
        {Inner}
      </Pressable>
    );
  }

  return (
    <View style={[styles.outer, { borderRadius: radius }, disabled && styles.disabled, style]}>
      {Inner}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    position: 'relative',
  },
  contentLayer: {
    position: 'relative',
    zIndex: 2,
  },
  pressed: {
    opacity: 0.86,
  },
  disabled: {
    opacity: 0.5,
  },
});
