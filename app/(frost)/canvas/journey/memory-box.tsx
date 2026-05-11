/**
 * Frost · Journey · Memory Box (coming-soon stub)
 *
 * Saved moments, captions, voice notes — a place for the bride to hold
 * what mattered. Backend not yet built; this stub exists so the Journey
 * hub tile doesn't 404.
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import {
  FrostColors, FrostSpace,
} from '../../../../constants/frost';
import { MUSE_LOOKS } from '../../../../constants/museTokens';
import { useMuseLook } from '../../../../hooks/useMuseLook';

export default function JourneyMemoryBox() {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  return (
    <FrostCanvasShell eyebrow="JOURNEY · MEMORY BOX" mode="frost">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.center}>
          <Text style={[styles.title, { color: tokens.ink }]}>For keeping.</Text>
          <Text style={[styles.body, { color: tokens.soft }]}>
            Captions, voice notes, weighted moments — coming soon.
          </Text>
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
