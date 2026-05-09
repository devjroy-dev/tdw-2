/**
 * Frost · Canvas · Discover · Categories
 *
 * Grid of vendor categories. Tap a category \u2192 filtered list (v1.3 wires
 * /api/v2/discover/feed?category=...).
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet, Dimensions } from 'react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../constants/frost';

const { width: W } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'mua',          label: 'Makeup & Hair' },
  { id: 'photography',  label: 'Photography' },
  { id: 'designer',     label: 'Designers' },
  { id: 'jeweller',     label: 'Jewellery' },
  { id: 'decorator',    label: 'Decor' },
  { id: 'venue',        label: 'Venues' },
  { id: 'choreographer',label: 'Choreography' },
  { id: 'event',        label: 'Event Managers' },
];

export default function Categories() {
  const tileW = (W - FrostSpace.xxl * 2 - FrostSpace.m) / 2;

  return (
    <FrostCanvasShell eyebrow="DISCOVER · CATEGORIES" mode="frost">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Browse by craft.</Text>
        <Text style={styles.sub}>Pick what you want to discover next.</Text>

        <View style={styles.grid}>
          {CATEGORIES.map(c => (
            <FrostedSurface
              key={c.id}
              mode="button"
              onPress={() => {}}
              style={{ width: tileW, marginBottom: FrostSpace.m }}
            >
              <View style={styles.tileInner}>
                <Text style={styles.tileLabel}>{c.label}</Text>
              </View>
            </FrostedSurface>
          ))}
        </View>
      </ScrollView>
    </FrostCanvasShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: FrostSpace.xl,
    paddingBottom: FrostSpace.huge,
  },
  heading: {
    ...FrostType.displayM,
    fontStyle: 'italic',
    fontFamily: FrostFonts.display,
  },
  sub: {
    ...FrostType.bodyMedium,
    color: FrostColors.muted,
    marginTop: FrostSpace.xs,
    marginBottom: FrostSpace.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  tileInner: {
    paddingVertical: FrostSpace.xxl,
    paddingHorizontal: FrostSpace.l,
    minHeight: 100,
    justifyContent: 'flex-end',
  },
  tileLabel: {
    fontFamily: FrostFonts.display,
    fontSize: 20,
    color: FrostColors.ink,
    fontStyle: 'italic',
  },
});
