/**
 * Frost · Journey · Broadcast (My people — coming-soon stub)
 *
 * The bride's personal address book for sending broadcast messages to
 * friends/bridesmaids/sisters via WhatsApp deep-link. Distinct from Circle
 * (wedding-collaborators workspace).
 *
 * Full build deferred to a separate session: needs new backend table
 * (bride_broadcast_contacts), POST/GET endpoints, contact-add sheet,
 * compose sheet, and platform-specific WhatsApp intent handling.
 *
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

export default function JourneyBroadcast() {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  return (
    <FrostCanvasShell eyebrow="JOURNEY · MY PEOPLE" mode="frost">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.center}>
          <Text style={[styles.title, { color: tokens.ink }]}>My people.</Text>
          <Text style={[styles.body, { color: tokens.soft }]}>Send a single message to many.{'\n'}Coming soon.</Text>
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
