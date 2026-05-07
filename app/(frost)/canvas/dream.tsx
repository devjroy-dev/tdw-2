/**
 * Frost — Dream Canvas (v1.4 stub)
 * DreamAi thread + Circle merged into one conversational stream.
 * v1.4 will wire /api/v2/dreamai/chat + /api/circle/messages + /api/co-planner/list
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DreamCanvas() {
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
        <Text style={styles.eyebrow}>✦ DREAM</Text>
        <Text style={styles.title}>Your DreamAi{'\n'}and your circle.</Text>
        <Text style={styles.dreamLine}>
          "Not just happily married.{'\n'}Getting married happily."
        </Text>
        <Text style={styles.sub}>Coming in v1.4</Text>
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
    marginBottom: 24,
  },
  dreamLine: {
    fontFamily: 'CormorantGaramond_300Light', fontSize: 15,
    color: '#3A3733', fontStyle: 'italic', textAlign: 'center',
    lineHeight: 24, marginBottom: 20,
  },
  sub: { fontFamily: 'DMSans_300Light', fontSize: 12, color: '#8C8480', letterSpacing: 1 },
});
