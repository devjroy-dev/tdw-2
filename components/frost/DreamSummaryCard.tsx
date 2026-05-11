/**
 * DreamSummaryCard — renders the summary lines from a composite tool result.
 *
 * After a `book_vendor` (or any composite) succeeds, the backend returns:
 *   {
 *     reply: "✓ Done. Swati's locked in.",
 *     summaryLines: [
 *       "Swati Tomar — locked in as MUA",
 *       "₹1,00,000 total",
 *       "₹30,000 advance paid today",
 *       "Balance reminder set for two weeks before the wedding"
 *     ],
 *     followupPrompts: [...]
 *   }
 *
 * The Dream canvas renders:
 *   1. <AILine> with the reply
 *   2. <DreamSummaryCard> with the summaryLines
 *   3. <DreamYesNo> for each followup
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import FrostedSurface from './FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../constants/frost';
import { MUSE_LOOKS } from '../../constants/museTokens';
import { useMuseLook } from '../../hooks/useMuseLook';

interface DreamSummaryCardProps {
  lines: string[];
}

export default function DreamSummaryCard({ lines }: DreamSummaryCardProps) {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  if (!lines || lines.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <FrostedSurface mode="panel" style={styles.surface}>
        <View style={styles.inner}>
          {lines.map((line, idx) => (
            <View key={idx} style={styles.row}>
              <View style={styles.dot} />
              <Text style={[styles.text, { color: tokens.ink }]}>{line}</Text>
            </View>
          ))}
        </View>
      </FrostedSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: FrostSpace.xxl,
    paddingVertical: FrostSpace.s,
  },
  surface: {},
  inner: {
    paddingVertical: FrostSpace.l,
    paddingHorizontal: FrostSpace.l,
    gap: FrostSpace.s,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: FrostSpace.m,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: FrostColors.goldMuted,
    marginTop: 9,
  },
  text: {
    flex: 1,
    fontFamily: FrostFonts.body,
    fontSize: 14,
    lineHeight: 20,
    // color applied inline via tokens.ink
  },
});
