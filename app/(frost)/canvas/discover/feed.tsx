/**
 * Frost \u00B7 Canvas \u00B7 Discover \u00B7 My Feed
 *
 * Vertical scroll through curated vendors, each with a photo carousel.
 * Tap a vendor row to open detail / save to Muse.
 *
 * v1 stub. Real wiring uses /api/v2/discover/feed.
 */

import React from 'react';
import { ScrollView, View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostRadius,
} from '../../../../constants/frost';

const { width: W } = Dimensions.get('window');

const PLACEHOLDER_FEED = [
  { id: 'v1', name: 'Arjun Kartha Studio', city: 'New Delhi', category: 'Photography',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=85&auto=format&fit=crop' },
  { id: 'v2', name: 'Sophia Laurent Artistry', city: 'Mumbai', category: 'Makeup',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=85&auto=format&fit=crop' },
  { id: 'v3', name: 'House of Blooms', city: 'Bangalore', category: 'Decor',
    image: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200&q=85&auto=format&fit=crop' },
];

export default function MyFeed() {
  return (
    <FrostCanvasShell eyebrow="DISCOVER \u00B7 MY FEED" mode="frost">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {PLACEHOLDER_FEED.map(v => (
          <View key={v.id} style={styles.card}>
            <Image source={{ uri: v.image }} style={styles.image} resizeMode="cover" />
            <View style={styles.meta}>
              <Text style={styles.category}>{v.category.toUpperCase()}</Text>
              <Text style={styles.name}>{v.name}</Text>
              <Text style={styles.city}>{v.city}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </FrostCanvasShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: FrostSpace.xl,
    paddingBottom: FrostSpace.huge,
    gap: FrostSpace.xl,
  },
  card: {
    marginHorizontal: FrostSpace.xxl,
    borderRadius: FrostRadius.box,
    overflow: 'hidden',
  },
  image: {
    width: W - FrostSpace.xxl * 2,
    height: (W - FrostSpace.xxl * 2) * 1.2,
  },
  meta: {
    paddingTop: FrostSpace.m,
  },
  category: {
    ...FrostType.eyebrowSmall,
    letterSpacing: 2.4,
  },
  name: {
    fontFamily: FrostFonts.display,
    fontSize: 24,
    fontStyle: 'italic',
    color: FrostColors.ink,
    marginTop: FrostSpace.xs,
  },
  city: {
    ...FrostType.bodySmall,
    color: FrostColors.muted,
    marginTop: 2,
  },
});
