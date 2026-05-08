/**
 * Circle · Canvas · Muse
 *
 * Bride's Muse board viewed by Circle member.
 * Gold ring indicator (View with borderRadius + gold border) on saves
 * made by co-planners. No character inside — pure geometry.
 * can_contribute_muse controls whether save button is shown.
 */

import React, { useState, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Image,
  Pressable, ActivityIndicator, Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft } from 'lucide-react-native';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostRadius,
} from '../../../constants/frost';
import { RAILWAY_URL } from '../../../constants/tokens';

const API = RAILWAY_URL;
const COL_GAP = 8;
const COLS = 2;
const SCREEN_W = Dimensions.get('window').width;
const TILE_W = (SCREEN_W - FrostSpace.xxl * 2 - COL_GAP) / COLS;

interface MuseSave {
  id: string;
  image_url: string;
  function_tag: string | null;
  note: string | null;
  created_at: string;
  saved_by_co_planner_id: string | null;
}

export default function CircleMuse() {
  const [saves, setSaves] = useState<MuseSave[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useFocusEffect(useCallback(() => {
    load();
  }, []));

  const load = async () => {
    try {
      const raw = await AsyncStorage.getItem('circle_session');
      if (!raw) return;
      const s = JSON.parse(raw);
      setSession(s);
      const r = await fetch(`${API}/api/v2/circle/muse/${s.couple_id}?memberUserId=${s.user_id}`);
      const d = await r.json();
      if (d.success) setSaves(d.data || []);
    } catch {}
    setLoading(false);
  };

  const canContribute = session?.permissions?.can_contribute_muse;

  // Split into two columns
  const col1 = saves.filter((_, i) => i % 2 === 0);
  const col2 = saves.filter((_, i) => i % 2 === 1);

  const renderTile = (item: MuseSave) => (
    <View key={item.id} style={[styles.tile, { width: TILE_W }]}>
      <Image source={{ uri: item.image_url }} style={styles.tileImage} resizeMode="cover" />
      {/* Gold ring indicator — shown when saved by a co-planner */}
      {item.saved_by_co_planner_id ? (
        <View style={styles.coplannerRing} />
      ) : null}
      {item.function_tag && item.function_tag !== 'general' ? (
        <View style={styles.tagPill}>
          <Text style={styles.tagText}>{item.function_tag}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.outer}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={FrostColors.muted} strokeWidth={1.5} />
        </Pressable>
        <Text style={styles.headerTitle}>Muse</Text>
        {canContribute ? (
          <Text style={styles.headerSub}>You can save to this board</Text>
        ) : (
          <Text style={styles.headerSub}>View only</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={FrostColors.goldTrue} />
        </View>
      ) : saves.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No saves yet.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
          <View style={styles.columns}>
            <View style={styles.column}>{col1.map(renderTile)}</View>
            <View style={styles.column}>{col2.map(renderTile)}</View>
          </View>

          {/* Gold ring legend */}
          <View style={styles.legend}>
            <View style={styles.legendRing} />
            <Text style={styles.legendText}>Added by a Circle member</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer:        { flex: 1, backgroundColor: '#F4F2EE' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:       { paddingHorizontal: FrostSpace.xxl, paddingTop: 56, paddingBottom: FrostSpace.l, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: FrostColors.hairline },
  backBtn:      { marginBottom: FrostSpace.xs },
  headerTitle:  { fontFamily: FrostFonts.display, fontSize: 28, fontStyle: 'italic', color: '#1A1815', lineHeight: 34 },
  headerSub:    { fontFamily: FrostFonts.body, fontSize: 12, color: FrostColors.muted, marginTop: 2 },
  grid:         { paddingHorizontal: FrostSpace.xxl, paddingVertical: FrostSpace.xl, paddingBottom: 80 },
  columns:      { flexDirection: 'row', gap: COL_GAP },
  column:       { flex: 1, gap: COL_GAP },
  tile:         { borderRadius: FrostRadius.md, overflow: 'hidden', backgroundColor: FrostColors.hairline, position: 'relative', marginBottom: 0 },
  tileImage:    { width: '100%', aspectRatio: 0.85 },
  // Gold ring — pure View geometry, no character, no icon
  coplannerRing: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#C9A84C',
    backgroundColor: 'transparent',
  },
  tagPill:      { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: FrostRadius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:      { fontFamily: FrostFonts.label, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#FFFFFF' },
  emptyText:    { fontFamily: FrostFonts.display, fontSize: 20, fontStyle: 'italic', color: FrostColors.muted },
  legend:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: FrostSpace.xl, justifyContent: 'center' },
  legendRing:   { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: '#C9A84C', backgroundColor: 'transparent' },
  legendText:   { fontFamily: FrostFonts.body, fontSize: 12, color: FrostColors.muted },
});
