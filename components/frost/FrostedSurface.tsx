/**
 * FrostedSurface — universal frosted material for buttons, rows, panels.
 *
 * THE TOTAL FROST DOCTRINE:
 *   White cards are gone from Frost. Every button, row, tile, and panel uses
 *   this component. Frost breaks ONLY in:
 *     - Muse/Discover full-bleed image canvases (real colour)
 *     - Discover hero carousel BEFORE More is tapped (real colour)
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
import { MUSE_LOOKS } from '../../constants/museTokens';
import { useMuseLook } from '../../hooks/useMuseLook';

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

export default function FrostedSurface({
  children,
  mode = 'button',
  onPress,
  onLongPress,
  radius = FrostRadius.box,
  style,
  disabled = false,
}: FrostedSurfaceProps) {
  const look = useMuseLook();
  const isPressable = Boolean(onPress || onLongPress) && !disabled;
  const isComposer = mode === 'composer';

  const renderFrost = () => {
    if (Platform.OS === 'ios') {
      return (
        <BlurView
          intensity={isComposer ? FrostMaterial.composerBlurIOS : FrostMaterial.buttonBlurIOS}
          tint={isComposer ? 'default' : look === 'E1' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
      );
    }
    if (Platform.OS === 'web') {
      return (
        <View
          style={[
            StyleSheet.absoluteFill,
            // @ts-ignore — web-only style
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
    // Android — translucent tint, mode-aware
    // E1 dark: near-transparent lift so tiles read as subtle surfaces, not silver slabs
    // E3 light: original warm-white tint
    const androidTint = isComposer
      ? FrostMaterial.androidComposerTint
      : look === 'E1'
        ? 'rgba(255,253,248,0.09)'
        : FrostMaterial.androidButtonTint;
    return (
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: androidTint }]}
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
