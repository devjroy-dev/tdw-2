/**
 * Frost · Canvas · Muse
 *
 * Full-bleed gallery of the bride's saved moments. v1 shell shows the hero
 * image at full saturation — this is the colour-from-frost moment. The
 * full grid + per-photo detail wires in v1.2 (uses /api/couple/muse/:id).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FrostCanvasShell from '../../../components/frost/FrostCanvasShell';
import { FrostColors, FrostType, FrostSpace, FrostCopy } from '../../../constants/frost';

const HERO =
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=90&auto=format&fit=crop';

export default function CanvasMuse() {
  return (
    <FrostCanvasShell
      eyebrow={FrostCopy.museCanvas.eyebrow}
      imageUri={HERO}
    >
      <View style={styles.bottom}>
        <Text style={styles.caption}>{FrostCopy.museCanvas.emptyCaption}</Text>
      </View>
    </FrostCanvasShell>
  );
}

const styles = StyleSheet.create({
  bottom: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: FrostSpace.xxl,
    paddingBottom: FrostSpace.huge,
  },
  caption: {
    ...FrostType.displayXS,
    color: 'rgba(255,255,255,0.92)',
  },
});
