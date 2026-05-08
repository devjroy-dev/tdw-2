/**
 * Frost \u00B7 Journey \u00B7 Reminders (v2 \u2014 frosted)
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../constants/frost';

const PLACEHOLDER_REMINDERS = [
  { id: '1', text: 'Pick up lehenga blouse from the tailor', when: 'Monday' },
  { id: '2', text: 'Send Sophia the wedding-day brief', when: 'Wednesday' },
  { id: '3', text: 'Mom\u2019s saree fitting', when: 'Tue, 4pm' },
];

export default function JourneyReminders() {
  return (
    <FrostCanvasShell eyebrow="JOURNEY \u00B7 REMINDERS" mode="frost">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>What I remember.</Text>
        <Text style={styles.sub}>Tell me anything you want me to hold onto.</Text>

        <View style={styles.list}>
          {PLACEHOLDER_REMINDERS.map(r => (
            <FrostedSurface
              key={r.id}
              mode="button"
              onPress={() => {}}
              style={{ marginBottom: FrostSpace.s }}
            >
              <View style={styles.row}>
                <View style={styles.rowDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>{r.text}</Text>
                  <Text style={styles.rowWhen}>{r.when}</Text>
                </View>
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
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: FrostSpace.l,
    paddingHorizontal: FrostSpace.l,
    gap: FrostSpace.m,
  },
  rowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: FrostColors.goldMuted,
    marginTop: 9,
  },
  rowText: {
    ...FrostType.bodyLarge,
    color: FrostColors.ink,
  },
  rowWhen: {
    ...FrostType.eyebrowSmall,
    marginTop: 4,
    letterSpacing: 1.4,
  },
});
