/**
 * Frost · Journey · Receipts (v2 — frosted)
 */

import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Plus, FileText } from 'lucide-react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostRadius,
} from '../../../../constants/frost';

const PLACEHOLDER_RECEIPTS = [
  { id: '1', vendor: 'Swati Tomar', amount: '₹30,000', when: 'Today', label: 'Advance' },
  { id: '2', vendor: 'House of Blooms', amount: '₹5,000', when: 'Apr 28', label: 'Consultation' },
];

export default function JourneyReceipts() {
  return (
    <FrostCanvasShell eyebrow="JOURNEY · RECEIPTS" mode="frost">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Bills, invoices, contracts.</Text>
        <Text style={styles.sub}>Capture once. Find later. Filed under the right vendor.</Text>

        <Pressable
          style={({ pressed }) => [styles.captureBtn, pressed && { opacity: 0.92 }]}
          onPress={() => {}}
        >
          <Plus size={18} color={FrostColors.white} strokeWidth={1.7} />
          <Text style={styles.captureText}>Capture a receipt</Text>
        </Pressable>

        <View style={styles.list}>
          {PLACEHOLDER_RECEIPTS.map(r => (
            <FrostedSurface
              key={r.id}
              mode="button"
              onPress={() => {}}
              style={{ marginBottom: FrostSpace.s }}
            >
              <View style={styles.row}>
                <View style={styles.rowIcon}>
                  <FileText size={20} color={FrostColors.goldMuted} strokeWidth={1.5} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowVendor}>{r.vendor}</Text>
                  <View style={styles.rowMeta}>
                    <Text style={styles.rowMetaText}>{r.label}</Text>
                    <Text style={styles.dot}>·</Text>
                    <Text style={styles.rowMetaText}>{r.when}</Text>
                  </View>
                </View>
                <Text style={styles.amount}>{r.amount}</Text>
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
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FrostSpace.s,
    backgroundColor: FrostColors.ink,
    borderRadius: FrostRadius.pill,
    paddingVertical: FrostSpace.m + 2,
    paddingHorizontal: FrostSpace.xl,
    marginBottom: FrostSpace.xl,
  },
  captureText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: FrostColors.white,
  },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FrostSpace.l,
    paddingHorizontal: FrostSpace.l,
    gap: FrostSpace.m,
  },
  rowIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowVendor: {
    fontFamily: FrostFonts.bodyMedium,
    fontSize: 15,
    color: FrostColors.ink,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.s,
    marginTop: 2,
  },
  rowMetaText: {
    ...FrostType.eyebrowSmall,
    letterSpacing: 1.4,
  },
  dot: {
    ...FrostType.bodySmall,
    color: FrostColors.muted,
  },
  amount: {
    fontFamily: FrostFonts.bodyMedium,
    fontSize: 15,
    color: FrostColors.goldMuted,
  },
});
