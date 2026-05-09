/**
 * FrostPane — sanctuary backdrop for Frost canvases.
 *
 * Phase 1.5.2 update — paper is the default.
 *   The deep-grey #9A958E was the SANCTUARY-mode background, designed to
 *   pair with greyscaled photos. As Frost moves to colour photo modes
 *   (E1/E3) and the bride opens these surfaces 10-20×/day, deep grey
 *   reads dim and bored. Bright warm paper (#D8D3CC, the same colour as
 *   home page paper) is now the default — readable, alive, continuous
 *   with home.
 *
 *   The Journey hub keeps the deep-grey doorway look by passing `dim`.
 *   Every other Frost canvas inherits paper.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { FrostColors } from '../../constants/frost';

const PAPER = '#D8D3CC';   // home page paper — bright reading surface
const DIM   = '#9A958E';   // legacy deep grey — kept for the doorway (Journey hub)

interface FrostPaneProps {
  /** Render children on top of the panel. */
  children?: React.ReactNode;
  /** When true, content area touches are passed through. */
  passthrough?: boolean;
  /** When true, render the legacy deep-grey background. Default: false (paper). */
  dim?: boolean;
  /** Legacy prop — accepted but ignored. */
  imageUri?: string;
}

export default function FrostPane({
  children,
  passthrough = false,
  dim = false,
}: FrostPaneProps) {
  return (
    <View
      style={[styles.root, { backgroundColor: dim ? DIM : PAPER }]}
      pointerEvents={passthrough ? 'box-none' : 'auto'}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
});
