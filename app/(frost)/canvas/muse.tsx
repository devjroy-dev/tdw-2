/**
 * Frost — Muse Canvas (v1.2 stub)
 * Full-bleed gallery of saved bridal inspiration.
 * v1.2 will wire real /api/couple/muse/:userId
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MuseCanvas() {
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
        <Text style={styles.eyebrow}>MUSE</Text>
        <Text style={styles.title}>Your vision board{'\n'}lives here.</Text>
        <Text style={styles.sub}>Coming in v1.2</Text>
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
    fontFamily: 'CormorantGaramond_300Light', fontSize: 32,
    color: '#1A1815', fontStyle: 'italic', textAlign: 'center', lineHeight: 40,
    marginBottom: 16,
  },
  sub: { fontFamily: 'DMSans_300Light', fontSize: 12, color: '#8C8480', letterSpacing: 1 },
});
