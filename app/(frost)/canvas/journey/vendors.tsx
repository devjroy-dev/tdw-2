/**
 * Frost \u00B7 Journey \u00B7 Vendors (v2 \u2014 frosted)
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../constants/frost';

interface VendorRow {
  id: string;
  name: string;
  category: string;
  status: 'booked' | 'in-talks' | 'enquired';
  priceText?: string;
}

const PLACEHOLDER_VENDORS: VendorRow[] = [
  { id: '1', name: 'Swati Tomar', category: 'MUA', status: 'booked', priceText: '\u20B91,00,000' },
  { id: '2', name: 'Arjun Kartha Studio', category: 'Photography', status: 'in-talks', priceText: '\u20B92,50,000' },
  { id: '3', name: 'House of Blooms', category: 'Decor', status: 'enquired' },
];

export default function JourneyVendors() {
  return (
    <FrostCanvasShell eyebrow="JOURNEY \u00B7 VENDORS" mode="frost">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Your team.</Text>
        <Text style={styles.sub}>The people making your wedding.</Text>

        <View style={styles.list}>
          {PLACEHOLDER_VENDORS.map(v => (
            <FrostedSurface
              key={v.id}
              mode="button"
              onPress={() => router.push(`/(frost)/canvas/journey/vendor/${v.id}` as any)}
              style={{ marginBottom: FrostSpace.s }}
            >
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{v.name}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.category}>{v.category}</Text>
                    <Text style={styles.dot}>\u00B7</Text>
                    <Text style={[styles.status, statusColor(v.status)]}>{statusLabel(v.status)}</Text>
                    {v.priceText ? (
                      <>
                        <Text style={styles.dot}>\u00B7</Text>
                        <Text style={styles.price}>{v.priceText}</Text>
                      </>
                    ) : null}
                  </View>
                </View>
                <ChevronRight size={18} color={FrostColors.muted} strokeWidth={1.5} />
              </View>
            </FrostedSurface>
          ))}
        </View>
      </ScrollView>
    </FrostCanvasShell>
  );
}

function statusLabel(s: VendorRow['status']) {
  if (s === 'booked') return 'Booked';
  if (s === 'in-talks') return 'In talks';
  return 'Enquired';
}

function statusColor(s: VendorRow['status']) {
  if (s === 'booked') return { color: FrostColors.goldMuted };
  return { color: FrostColors.muted };
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
    alignItems: 'center',
    paddingVertical: FrostSpace.l,
    paddingHorizontal: FrostSpace.l,
  },
  name: {
    fontFamily: FrostFonts.display,
    fontSize: 19,
    color: FrostColors.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.s,
    marginTop: 4,
  },
  category: {
    ...FrostType.eyebrowSmall,
    letterSpacing: 1.4,
  },
  status: {
    ...FrostType.eyebrowSmall,
    letterSpacing: 1.4,
  },
  price: {
    ...FrostType.bodySmall,
    color: FrostColors.soft,
    fontFamily: FrostFonts.bodyMedium,
  },
  dot: {
    ...FrostType.bodySmall,
    color: FrostColors.muted,
  },
});
