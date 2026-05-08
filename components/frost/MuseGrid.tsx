/**
 * MuseGrid — 2-column staggered grid for the bride's Muse saves.
 *
 * Each tile is hairline-bordered, small ceremony-tag chip in the corner if
 * present. Tap fires onTilePress. The grid is intentionally NOT frosted —
 * the bride wants to see her inspiration in real colour.
 *
 * Layout: alternating heights so the grid feels editorial rather than
 * spreadsheet-y. Two columns, each tile sized to 0.85 or 1.15 ratio
 * deterministically based on index.
 */

import React from 'react';
import {
  View, Image, Pressable, Text, StyleSheet, Dimensions,
} from 'react-native';
import {
  FrostColors, FrostType, FrostSpace, FrostRadius, FrostFonts,
} from '../../constants/frost';
import type { MuseSave } from '../../services/frostApi';

interface MuseGridProps {
  saves: MuseSave[];
  onTilePress?: (save: MuseSave) => void;
}

export default function MuseGrid({ saves, onTilePress }: MuseGridProps) {
  const screenW = Dimensions.get('window').width;
  const gap = FrostSpace.s;
  const sidePad = FrostSpace.xxl;
  const colW = (screenW - sidePad * 2 - gap) / 2;

  // Distribute saves into two columns — preserve order, left-then-right
  const leftCol: MuseSave[] = [];
  const rightCol: MuseSave[] = [];
  saves.forEach((save, i) => {
    if (i % 2 === 0) leftCol.push(save);
    else rightCol.push(save);
  });

  const renderTile = (save: MuseSave, idx: number) => {
    // Alternating heights for visual rhythm
    const isShort = (idx % 3 === 1);
    const aspectRatio = isShort ? 0.85 : 1.15;
    const tileH = colW * aspectRatio;

    return (
      <Pressable
        key={save.id}
        onPress={() => onTilePress?.(save)}
        style={({ pressed }) => [
          styles.tile,
          { width: colW, height: tileH, marginBottom: gap },
          pressed && styles.tilePressed,
        ]}
      >
        {save.image_url ? (
          <Image
            source={{ uri: save.image_url }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Text style={styles.fallbackText}>—</Text>
          </View>
        )}

        {save.function_tag && save.function_tag !== 'general' ? (
          <View style={styles.tagChip}>
            <Text style={styles.tagText}>{save.function_tag.toUpperCase()}</Text>
          </View>
        ) : null}

        {save.vendor?.name ? (
          <View style={styles.vendorBar} pointerEvents="none">
            <Text style={styles.vendorName} numberOfLines={1}>{save.vendor.name}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingHorizontal: sidePad }]}>
      <View style={[styles.column, { width: colW }]}>
        {leftCol.map((save, i) => renderTile(save, i * 2))}
      </View>
      <View style={[styles.column, { width: colW, marginLeft: gap }]}>
        {rightCol.map((save, i) => renderTile(save, i * 2 + 1))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    flexDirection: 'column',
  },
  tile: {
    borderRadius: FrostRadius.box,
    overflow: 'hidden',
    backgroundColor: FrostColors.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
  },
  tilePressed: {
    opacity: 0.92,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    backgroundColor: FrostColors.pageFallback,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    ...FrostType.displayM,
    color: FrostColors.muted,
  },
  tagChip: {
    position: 'absolute',
    top: FrostSpace.s,
    left: FrostSpace.s,
    paddingHorizontal: FrostSpace.s,
    paddingVertical: 3,
    borderRadius: FrostRadius.pill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  tagText: {
    fontFamily: FrostFonts.label,
    fontSize: 9,
    letterSpacing: 1.4,
    color: FrostColors.white,
  },
  vendorBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: FrostSpace.s,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  vendorName: {
    fontFamily: FrostFonts.body,
    fontSize: 11,
    color: FrostColors.white,
  },
});
