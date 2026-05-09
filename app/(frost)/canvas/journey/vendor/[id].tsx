/**
 * Frost · Journey · Vendor Profile (v2 — frosted sections)
 *
 * Per-vendor profile. The heaviest screen in Frost. Sections all use frosted
 * panels now, no white cards.
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FrostCanvasShell from '../../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../../constants/frost';

const SECTIONS = [
  { title: 'Portfolio', sub: 'Recent work and the look you saved them for.' },
  { title: 'Pricing',   sub: 'Total, advance paid, balance, payment dates.' },
  { title: 'Messages',  sub: 'Your conversation with them. One-on-one.' },
  { title: 'Receipts',  sub: 'Bills, invoices, contracts you have shared.' },
  { title: 'Reminders', sub: 'What you have asked me to remember about them.' },
];

export default function VendorProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const vendorName = 'Vendor #' + id;
  const vendorRole = 'Category';

  return (
    <FrostCanvasShell eyebrow="JOURNEY · VENDOR" mode="frost">
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{vendorRole}</Text>
          <Text style={styles.name}>{vendorName}</Text>
        </View>

        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionSub}>{s.sub}</Text>
            <FrostedSurface mode="panel" style={styles.placeholder}>
              <View style={styles.placeholderInner}>
                <Text style={styles.placeholderText}>{`{{ ${s.title.toLowerCase()} content }}`}</Text>
              </View>
            </FrostedSurface>
          </View>
        ))}
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
  header: { marginBottom: FrostSpace.xxl },
  eyebrow: { ...FrostType.eyebrowMedium },
  name: {
    ...FrostType.displayM,
    fontStyle: 'italic',
    fontFamily: FrostFonts.display,
    marginTop: FrostSpace.s,
  },
  section: { marginBottom: FrostSpace.xl },
  sectionTitle: {
    fontFamily: FrostFonts.display,
    fontSize: 19,
    color: FrostColors.ink,
    marginBottom: FrostSpace.xs,
  },
  sectionSub: {
    ...FrostType.bodySmall,
    color: FrostColors.muted,
    marginBottom: FrostSpace.m,
  },
  placeholder: {
    minHeight: 80,
  },
  placeholderInner: {
    padding: FrostSpace.l,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontFamily: FrostFonts.body,
    fontSize: 12,
    color: FrostColors.muted,
    fontStyle: 'italic',
  },
});
