/**
 * Frost · Journey · Couture (coming-soon stub)
 *
 * Atelier-only by-appointment pieces. Backend is admin-managed via
 * /admin/couture today; bride-facing experience is shipped in a later session.
 * This page exists so the Journey hub tile doesn't 404.
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../constants/frost';
import { MUSE_LOOKS } from '../../../../constants/museTokens';
import { useMuseLook } from '../../../../hooks/useMuseLook';

export default function JourneyCouture() {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  return (
    <FrostCanvasShell eyebrow="JOURNEY · COUTURE" mode="frost">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.center}>
          <Text style={[styles.title, { color: tokens.ink }]}>By appointment.</Text>
          <Text style={[styles.body, { color: tokens.soft }]}>Atelier-only pieces, opening soon.</Text>
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
