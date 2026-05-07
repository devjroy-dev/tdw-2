/**
 * Frost — Journey Canvas (v1.5 stub)
 * The working surface: vendor manager, reminders, OCR receipts, settings.
 * v1.5 will build the full tile grid and sub-routes.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function JourneyCanvas() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={[styles.closeBtn, { top: insets.top + 16 }]}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
      <View style={styles.center}>
        <Text style={styles.eyebrow}>CHAPTER ONE</Text>
        <Text style={styles.title}>Journey</Text>
        <Text style={styles.sub}>Vendor manager · Reminders · Receipts · Settings</Text>
        <Text style={styles.coming}>Coming in v1.5</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8E5E0' },
  closeBtn: {
    position: 'absolute', right: 20, zIndex: 50,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(26,24,21,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { fontFamily: 'DMSans_300Light', fontSize: 14, color: '#3A3733' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  eyebrow: {
    fontFamily: 'Jost_300Light', fontSize: 8, letterSpacing: 3.5,
    textTransform: 'uppercase', color: '#8C8480', marginBottom: 16,
  },
  title: {
    fontFamily: 'CormorantGaramond_300Light', fontSize: 48,
    color: '#1A1815', fontStyle: 'italic', textAlign: 'center',
    lineHeight: 56, marginBottom: 16,
  },
  sub: {
    fontFamily: 'DMSans_300Light', fontSize: 12, color: '#8C8480',
    textAlign: 'center', lineHeight: 20, letterSpacing: 0.5, marginBottom: 12,
  },
  coming: { fontFamily: 'DMSans_300Light', fontSize: 11, color: '#C8C3BC', letterSpacing: 1 },
});
