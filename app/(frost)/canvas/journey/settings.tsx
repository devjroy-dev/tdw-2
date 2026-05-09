/**
 * Frost · Journey · Settings (v2 — frosted)
 */

import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { LogOut } from 'lucide-react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../constants/frost';

const FIELDS = [
  { label: 'YOUR NAME',           value: 'Set your name' },
  { label: 'PARTNER\u2019S NAME', value: 'Set partner\u2019s name' },
  { label: 'WEDDING DATE',        value: '25 September 2026' },
  { label: 'WEDDING CITY',        value: 'Set city' },
  { label: 'WHATSAPP',            value: '+91 – –––––––––' },
];

export default function JourneySettings() {
  return (
    <FrostCanvasShell eyebrow="JOURNEY · SETTINGS" mode="frost">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Yours.</Text>
        <Text style={styles.sub}>Six things. Set them once.</Text>

        <View style={styles.list}>
          {FIELDS.map(f => (
            <FrostedSurface
              key={f.label}
              mode="button"
              onPress={() => {}}
              style={{ marginBottom: FrostSpace.xs + 2 }}
            >
              <View style={styles.row}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <Text style={styles.fieldValue}>{f.value}</Text>
              </View>
            </FrostedSurface>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.92 }]}
        >
          <LogOut size={16} color={FrostColors.muted} strokeWidth={1.5} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
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
    paddingVertical: FrostSpace.l,
    paddingHorizontal: FrostSpace.l,
  },
  fieldLabel: {
    ...FrostType.eyebrowSmall,
    letterSpacing: 1.6,
  },
  fieldValue: {
    fontFamily: FrostFonts.body,
    fontSize: 17,
    color: FrostColors.ink,
    marginTop: 6,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FrostSpace.s,
    paddingVertical: FrostSpace.xl,
    marginTop: FrostSpace.xxl,
  },
  signOutText: {
    ...FrostType.bodyMedium,
    color: FrostColors.muted,
  },
});
