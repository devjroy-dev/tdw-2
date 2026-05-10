/**
 * FrostPane — sanctuary backdrop for Frost canvases.
 *
 * 3.2 mode-awareness update — background now follows the bride's home_mode
 * selection (E1 dark / E3 light). Reads useMuseLook() from AsyncStorage
 * @frost.home_mode so every canvas that renders FrostPane automatically
 * inherits the correct tonal mode without any per-canvas changes.
 *
 *   E3 (default/light): paper = #D8D3CC, dim = #9A958E
 *   E1 (dark):          paper = #1B1612, dim = #0F0C0A
 *
 * The dim prop is preserved for Journey hub (doorway surface).
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MUSE_LOOKS } from '../../constants/museTokens';
import { useMuseLook } from '../../hooks/useMuseLook';

// E1 dim stop — slightly deeper than pagePaper for the doorway feel
const DIM_E1 = '#0F0C0A';
// E3 dim stop — legacy deep grey
const DIM_E3 = '#9A958E';

interface FrostPaneProps {
  /** Render children on top of the panel. */
  children?: React.ReactNode;
  /** When true, content area touches are passed through. */
  passthrough?: boolean;
  /** When true, render the doorway (dimmed) background. Default: false. */
  dim?: boolean;
  /** Legacy prop — accepted but ignored. */
  imageUri?: string;
}

export default function FrostPane({
  children,
  passthrough = false,
  dim = false,
}: FrostPaneProps) {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  const bg = dim
    ? (look === 'E1' ? DIM_E1 : DIM_E3)
    : tokens.pagePaper;

  return (
    <View
      style={[styles.root, { backgroundColor: bg }]}
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
