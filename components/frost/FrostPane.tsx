/**
 * FrostPane — sanctuary backdrop for Frost canvases (vintage rewrite).
 *
 * Was: colour image → greyscale → frost blur. The image was a wedding mandap
 * Cloudinary URL bleeding into Journey, Dream, etc. Per Dev's brief: the
 * sanctuary surfaces (Journey hub, Dream chat) should be calming greyscale —
 * NO image bleed.
 *
 * Now: flat `pageFallback` (deep warm grey) only. Children render on top.
 * Same component contract — every consumer keeps working without changes.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FrostColors } from '../../constants/frost';

interface FrostPaneProps {
  /** Render children on top of the panel. */
  children?: React.ReactNode;
  /** When true, content area touches are passed through. */
  passthrough?: boolean;
  /**
   * Legacy prop — accepted but ignored. Was used to override the underlying
   * image. Kept in the signature so existing callers don't error during
   * migration; safe to remove once no callers reference it.
   */
  imageUri?: string;
}

export default function FrostPane({
  children,
  passthrough = false,
}: FrostPaneProps) {
  return (
    <View
      style={styles.root}
      pointerEvents={passthrough ? 'box-none' : 'auto'}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: FrostColors.pageFallback, // #9A958E — vintage carbon
  },
});
