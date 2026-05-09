/**
 * Frost \u00B7 Journey \u00B7 Honeymoon (coming-soon stub)
 *
 * Destination packages and bookings. Backend doesn't exist yet; bride-facing
 * experience is shipped post-launch. This page exists so the Journey hub
 * tile doesn't 404.
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../constants/frost';

export default function JourneyHoneymoon() {
  return (
    <FrostCanvasShell eyebrow="JOURNEY \u00B7 HONEYMOON" mode="frost">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.center}>
          <Text style={styles.title}>After all this.</Text>
          <Text style={styles.body}>Destinations and slow days, coming soon.</Text>
        </View>
      </ScrollView>
    </FrostCanvasShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: FrostSpace.xl,
    paddingBottom: FrostSpace.huge,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    gap: FrostSpace.s,
  },
  title: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 28, lineHeight: 32,
    color: FrostColors.ink,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 17, lineHeight: 24,
    color: FrostColors.soft,
    textAlign: 'center',
  },
});
