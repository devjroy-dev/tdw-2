/**
 * Frost \u00B7 Canvas \u00B7 Discover \u00B7 Couture
 *
 * Atelier-only invitation pieces. Bookable by appointment (Rs.2-5K fee, 80/20 split).
 * v1 stub. Wiring to existing Couture endpoints later.
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../constants/frost';

const PLACEHOLDER_COUTURE = [
  { id: 'c1', name: 'Atelier Mehra', specialty: 'Heirloom embroidery', city: 'New Delhi' },
  { id: 'c2', name: 'Saanvi Couture', specialty: 'Hand-painted lehengas', city: 'Mumbai' },
  { id: 'c3', name: 'House of Vihaan', specialty: 'Bespoke menswear', city: 'Jaipur' },
];

export default function Couture() {
  return (
    <FrostCanvasShell eyebrow="DISCOVER \u00B7 COUTURE" mode="frost">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>By appointment.</Text>
        <Text style={styles.sub}>The ateliers we know personally. Reservations open here.</Text>

        <View style={styles.list}>
          {PLACEHOLDER_COUTURE.map(c => (
            <FrostedSurface key={c.id} mode="button" onPress={() => {}}>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Text style={styles.specialty}>{c.specialty}</Text>
                  <Text style={styles.city}>{c.city}</Text>
                </View>
                <Text style={styles.cta}>RESERVE</Text>
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
  list: { gap: FrostSpace.m },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FrostSpace.l,
    paddingHorizontal: FrostSpace.l,
    gap: FrostSpace.l,
  },
  name: {
    fontFamily: FrostFonts.display,
    fontSize: 20,
    color: FrostColors.ink,
    fontStyle: 'italic',
  },
  specialty: {
    ...FrostType.bodySmall,
    color: FrostColors.soft,
    marginTop: 2,
  },
  city: {
    ...FrostType.eyebrowSmall,
    letterSpacing: 1.4,
    marginTop: 4,
  },
  cta: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 10,
    letterSpacing: 1.8,
    color: FrostColors.goldMuted,
  },
});
