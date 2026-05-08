/**
 * Circle · Landing
 *
 * Circle member home. Four canvases if dreamai_access_granted, three if not.
 * Nav: Muse | Discover | Dream (conditional) | Circle
 * Same Frost aesthetic — cream, gold, Cormorant.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image, Sparkles, Compass, MessageCircle, Users } from 'lucide-react-native';
import FrostCanvasShell from '../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostRadius, FrostLayout,
} from '../../constants/frost';
import { RAILWAY_URL } from '../../constants/tokens';

const API = RAILWAY_URL;

type Canvas = 'muse' | 'discover' | 'dream' | 'circle';

export default function CircleLanding() {
  const [session, setSession] = useState<any>(null);
  const [activeCanvas, setActiveCanvas] = useState<Canvas>('muse');
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    loadSession();
  }, []));

  const loadSession = async () => {
    try {
      const raw = await AsyncStorage.getItem('circle_session');
      if (!raw) { router.replace('/' as any); return; }
      const s = JSON.parse(raw);
      // Refresh session from server
      const r = await fetch(`${API}/api/v2/circle/session/${s.user_id}`);
      const d = await r.json();
      if (d.success) {
        await AsyncStorage.setItem('circle_session', JSON.stringify(d.data));
        setSession(d.data);
      } else {
        setSession(s);
      }
    } catch {
      const raw = await AsyncStorage.getItem('circle_session');
      if (raw) setSession(JSON.parse(raw));
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={FrostColors.goldTrue} />
      </View>
    );
  }

  if (!session) return null;

  const hasDreamAi = session?.permissions?.dreamai_access_granted;
  const brideName = session?.bride?.name || 'the bride';
  const daysUntil = session?.bride?.wedding_date
    ? Math.max(0, Math.round((new Date(session.bride.wedding_date).getTime() - Date.now()) / 86400000))
    : null;

  const tabs: { key: Canvas; Icon: any; label: string }[] = [
    { key: 'muse',     Icon: Image,        label: 'Muse' },
    { key: 'discover', Icon: Compass,      label: 'Discover' },
    ...(hasDreamAi ? [{ key: 'dream' as Canvas, Icon: Sparkles, label: 'Dream' }] : []),
    { key: 'circle',   Icon: Users,        label: 'Circle' },
  ];

  const navigateCanvas = (canvas: Canvas) => {
    setActiveCanvas(canvas);
    router.push(`/(circle)/canvas/${canvas}` as any);
  };

  return (
    <View style={styles.outer}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>CIRCLE</Text>
        <Text style={styles.heroTitle}>{brideName}'s wedding.</Text>
        {daysUntil !== null && (
          <View style={styles.countdown}>
            <Text style={styles.countdownNumber}>{daysUntil}</Text>
            <Text style={styles.countdownLabel}>days to go</Text>
          </View>
        )}
        <Text style={styles.heroSub}>
          You're part of her Circle{session?.role ? ` · ${session.role}` : ''}.
        </Text>
      </View>

      {/* Canvas tiles */}
      <View style={styles.tiles}>
        {tabs.map(tab => (
          <FrostedSurface
            key={tab.key}
            mode="button"
            onPress={() => navigateCanvas(tab.key)}
            radius={FrostRadius.box}
            style={styles.tile}
          >
            <View style={styles.tileInner}>
              <tab.Icon size={24} color={FrostColors.goldMuted} strokeWidth={1.5} />
              <Text style={styles.tileLabel}>{tab.label}</Text>
            </View>
          </FrostedSurface>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer:           { flex: 1, backgroundColor: '#F4F2EE' },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F2EE' },
  hero:            { paddingHorizontal: FrostSpace.xxl, paddingTop: 60, paddingBottom: FrostSpace.xxl },
  eyebrow:         { ...FrostType.eyebrowSmall, color: FrostColors.muted, marginBottom: FrostSpace.m },
  heroTitle:       { fontFamily: FrostFonts.display, fontSize: 32, fontStyle: 'italic', color: '#1A1815', lineHeight: 38, marginBottom: FrostSpace.l },
  countdown:       { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: FrostSpace.s },
  countdownNumber: { fontFamily: FrostFonts.displayMedium, fontSize: 42, color: FrostColors.goldMuted, lineHeight: 48 },
  countdownLabel:  { fontFamily: FrostFonts.label, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: FrostColors.muted },
  heroSub:         { fontFamily: FrostFonts.body, fontSize: 14, color: '#5A5650' },
  tiles:           { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: FrostSpace.xxl, gap: FrostSpace.m },
  tile:            { width: '47%' },
  tileInner:       { padding: FrostSpace.xl, alignItems: 'center', gap: FrostSpace.s, minHeight: 90, justifyContent: 'center' },
  tileLabel:       { fontFamily: FrostFonts.display, fontSize: 18, fontStyle: 'italic', color: '#1A1815' },
});
