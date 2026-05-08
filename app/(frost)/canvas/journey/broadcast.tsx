/**
 * Frost \u00B7 Journey \u00B7 Broadcast (v2 \u2014 frosted)
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Send } from 'lucide-react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../constants/frost';

const PLACEHOLDER_GROUPS = [
  { id: 'inner-circle', label: 'Inner circle', count: 12 },
  { id: 'family', label: 'Family', count: 38 },
  { id: 'all', label: 'Everyone', count: 124 },
];

export default function JourneyBroadcast() {
  return (
    <FrostCanvasShell eyebrow="JOURNEY \u00B7 BROADCAST" mode="frost">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Tell your people.</Text>
        <Text style={styles.sub}>Some, or all, in one quick send. Personalised with their name.</Text>

        <View style={styles.groupList}>
          {PLACEHOLDER_GROUPS.map(g => (
            <FrostedSurface
              key={g.id}
              mode="button"
              onPress={() => {}}
              style={{ marginBottom: FrostSpace.s }}
            >
              <View style={styles.group}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupLabel}>{g.label}</Text>
                  <Text style={styles.groupCount}>{g.count} people</Text>
                </View>
                <Send size={18} color={FrostColors.goldMuted} strokeWidth={1.5} />
              </View>
            </FrostedSurface>
          ))}
        </View>

        <View style={styles.helper}>
          <Text style={styles.helperText}>
            \u2728 Or tell DreamAi: \u201CSend a message to my family about the venue change.\u201D
          </Text>
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
  groupList: {},
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FrostSpace.l,
    paddingHorizontal: FrostSpace.l,
  },
  groupLabel: {
    fontFamily: FrostFonts.display,
    fontSize: 19,
    color: FrostColors.ink,
  },
  groupCount: {
    ...FrostType.eyebrowSmall,
    letterSpacing: 1.4,
    marginTop: 2,
  },
  helper: {
    paddingTop: FrostSpace.xxl,
  },
  helperText: {
    ...FrostType.displayXS,
    color: FrostColors.muted,
    textAlign: 'center',
  },
});
