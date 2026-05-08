/**
 * Circle · Landing (ZIP 11)
 *
 * Exact port of Frost landing for Circle members.
 *
 * Differences from bride's landing:
 *   1. Hero countdown: "X days to [bride name]'s wedding" not just "X days"
 *   2. No Journey bar at the bottom — removed entirely
 *   3. Third box: Dream (if dreamai_access_granted) or Circle (if not)
 *      Partner always gets Dream.
 *
 * Everything else — rotating images, frost pane, UnveilCanvas boxes,
 * BoxImagesLayer, greyscale, blur — identical to the bride's landing.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Platform, StatusBar, Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UnveilCanvas from '../../components/frost/UnveilCanvas';
import RotatingImage from '../../components/frost/RotatingImage';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
  FrostMotion, FrostMaterial, FrostLayout, FrostRadius,
} from '../../constants/frost';
import { RAILWAY_URL } from '../../constants/tokens';

const { width: screenW } = Dimensions.get('window');
const API = RAILWAY_URL;

// Same placeholder images as the bride landing
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=1080&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1080&q=85&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1583394293214-28a4b0843b1d?w=1080&q=85&auto=format&fit=crop',
];

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(dateStr); target.setHours(0,0,0,0);
  return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
}

function formatDateAsLetters(dateStr: string) {
  const d = new Date(dateStr);
  return {
    weekday: d.toLocaleDateString('en-IN', { weekday: 'long' }),
    month:   d.toLocaleDateString('en-IN', { month: 'long' }),
    year:    d.getFullYear().toString(),
    day:     d.getDate(),
  };
}

const ONES = ['','first','second','third','fourth','fifth','sixth','seventh','eighth','ninth',
  'tenth','eleventh','twelfth','thirteenth','fourteenth','fifteenth','sixteenth',
  'seventeenth','eighteenth','nineteenth'];
const TENS_PRE = ['','','twenty-','thirty-'];
function dayToWords(n: number): string {
  if (n < 20) return ONES[n];
  if (n % 10 === 0) return ['','','twentieth','thirtieth'][Math.floor(n/10)];
  return TENS_PRE[Math.floor(n/10)] + ONES[n%10];
}

export default function CircleMemberLanding() {
  const insets  = useSafeAreaInsets();
  const [, force] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [idleLines, setIdleLines] = useState<[string, string]>([
    'The light in October will be the colour of old letters.',
    'Ask me anything about the wedding.',
  ]);

  useFocusEffect(useCallback(() => {
    loadSession();
  }, []));

  const loadSession = async () => {
    const raw = await AsyncStorage.getItem('circle_session');
    if (!raw) { router.replace('/(circle)/join' as any); return; }
    setSession(JSON.parse(raw));
  };

  // Re-render every minute for countdown
  useEffect(() => {
    const id = setInterval(() => force(x => x + 1), FrostMotion.idleRefresh);
    return () => clearInterval(id);
  }, []);

  if (!session) return <View style={{ flex: 1, backgroundColor: FrostColors.pageFallback }} />;

  const hasDreamAi   = session?.permissions?.dreamai_access_granted || session?.role === 'Partner';
  const brideName    = session?.bride?.name || 'her';
  const weddingDate  = session?.bride?.wedding_date;

  const sidePad  = FrostLayout.pageSidePadding;
  const gap      = FrostLayout.boxGap;
  const topBoxW  = (screenW - (sidePad * 2) - gap) / 2;
  const topBoxH  = topBoxW * FrostLayout.boxAspectRatio;
  const dreamBoxW = screenW - (sidePad * 2);
  const dreamBoxH = FrostLayout.dreamBoxHeight;

  const days = weddingDate ? daysUntil(weddingDate) : null;
  const dateFormatted = weddingDate ? formatDateAsLetters(weddingDate) : null;
  const dayWord = dateFormatted ? dayToWords(dateFormatted.day) : '';

  // Third box label and route
  const thirdBoxEyebrow = hasDreamAi ? 'DREAM' : 'CIRCLE';
  const thirdBoxRoute   = hasDreamAi ? '/(circle)/canvas/dream' : '/(circle)/canvas/circle';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />

      {/* LAYER 1: full-bleed image */}
      <Image
        source={{ uri: PLACEHOLDER_IMAGES[0] }}
        style={[
          StyleSheet.absoluteFill,
          Platform.OS === 'web'
            ? // @ts-expect-error
              { filter: FrostMaterial.greyscaleFilter, WebkitFilter: FrostMaterial.greyscaleFilter }
            : null,
        ]}
        resizeMode="cover"
      />
      {Platform.OS !== 'web' ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: FrostColors.desatOverlay }]} pointerEvents="none" />
      ) : null}

      {/* LAYER 1.5: box images */}
      <BoxImagesLayer
        sidePad={sidePad} gap={gap}
        topBoxW={topBoxW} topBoxH={topBoxH}
        dreamBoxW={dreamBoxW} dreamBoxH={dreamBoxH}
        topInset={insets.top}
      />

      {/* LAYER 2: frost pane */}
      {Platform.OS === 'web' ? (
        <View
          style={[StyleSheet.absoluteFill,
            // @ts-expect-error
            { backdropFilter: FrostMaterial.pageBlurWeb, WebkitBackdropFilter: FrostMaterial.pageBlurWeb, backgroundColor: FrostColors.frostTint }
          ]}
          pointerEvents="none"
        />
      ) : Platform.OS === 'ios' ? (
        <BlurView intensity={FrostMaterial.pageBlurIOS} tint="light" style={StyleSheet.absoluteFill} pointerEvents="none" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: FrostMaterial.androidPageTint }]} pointerEvents="none" />
      )}

      {/* LAYER 3: UI */}
      <View style={[styles.contentLayer, { paddingTop: insets.top }]}>

        {/* Hero — countdown to bride's wedding */}
        <View style={styles.heroWrap}>
          <Text style={styles.heroEyebrow}>YOUR CIRCLE</Text>
          {dateFormatted ? (
            <>
              <Text style={styles.heroWeekday}>{dateFormatted.weekday}</Text>
              <Text style={styles.heroDate}>{dayWord} of {dateFormatted.month}</Text>
              <Text style={styles.heroYear}>{dateFormatted.year}</Text>
            </>
          ) : (
            <Text style={styles.heroWeekday}>{brideName}'s wedding</Text>
          )}

          <View style={styles.heroRule} />

          {days !== null && (
            <View style={styles.heroDaysWrap}>
              <Text style={styles.heroDaysNumber}>{days}</Text>
              <Text style={styles.heroDaysWord}>
                days to {brideName}'s wedding
              </Text>
            </View>
          )}
        </View>

        {/* Top row — Muse + Discover */}
        <View style={[styles.gridRow, { paddingHorizontal: sidePad, gap }]}>
          <UnveilCanvas
            width={topBoxW} height={topBoxH}
            eyebrow="MUSE"
            onUnveil={() => router.push('/(circle)/canvas/muse' as any)}
          />
          <UnveilCanvas
            width={topBoxW} height={topBoxH}
            eyebrow="DISCOVER"
            onUnveil={() => router.push('/(circle)/canvas/discover' as any)}
          />
        </View>

        {/* Third box — Dream or Circle */}
        <View style={[styles.dreamRow, { paddingHorizontal: sidePad }]}>
          <UnveilCanvas
            width={dreamBoxW} height={dreamBoxH}
            eyebrow={thirdBoxEyebrow}
            onUnveil={() => router.push(thirdBoxRoute as any)}
            textContent
          >
            <View style={styles.dreamInner}>
              {hasDreamAi ? (
                <>
                  <View style={styles.dreamLineRow}>
                    <Text style={styles.dreamGlyph}>✦</Text>
                    <Text style={styles.dreamText}>{idleLines[0]}</Text>
                  </View>
                  <View style={styles.dreamLineRow}>
                    <Text style={styles.dreamGlyph}>✦</Text>
                    <Text style={styles.dreamText}>{idleLines[1]}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.dreamLineRow}>
                    <Text style={styles.dreamGlyph}>✦</Text>
                    <Text style={styles.dreamText}>Your thread with {brideName}.</Text>
                  </View>
                  <View style={styles.dreamLineRow}>
                    <Text style={styles.dreamGlyph}>✦</Text>
                    <Text style={styles.dreamText}>Activity, messages, the full picture.</Text>
                  </View>
                </>
              )}
            </View>
          </UnveilCanvas>
        </View>

        {/* No Journey bar — Circle members don't get Journey */}
        <View style={{ flex: 1 }} />

      </View>
    </View>
  );
}

// ─── BoxImagesLayer — identical to bride's ────────────────────────────────────
function BoxImagesLayer({ sidePad, gap, topBoxW, topBoxH, dreamBoxW, dreamBoxH, topInset }: {
  sidePad: number; gap: number;
  topBoxW: number; topBoxH: number; dreamBoxW: number; dreamBoxH: number;
  topInset: number;
}) {
  const HERO_H  = FrostLayout.heroBlockHeight;
  const ROW_GAP = 16;
  const topRowY   = topInset + HERO_H;
  const dreamRowY = topRowY + topBoxH + ROW_GAP;

  const greyscaleStyle = Platform.OS === 'web'
    ? // @ts-expect-error
      { filter: FrostMaterial.greyscaleBoxFilter, WebkitFilter: FrostMaterial.greyscaleBoxFilter }
    : {};

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={{ position: 'absolute', top: topRowY, left: sidePad, right: sidePad, flexDirection: 'row', gap }}>
        <View style={[{ width: topBoxW, height: topBoxH, borderRadius: FrostRadius.box, overflow: 'hidden' }, greyscaleStyle]}>
          <RotatingImage sources={PLACEHOLDER_IMAGES} />
        </View>
        <View style={[{ width: topBoxW, height: topBoxH, borderRadius: FrostRadius.box, overflow: 'hidden' }, greyscaleStyle]}>
          <RotatingImage sources={PLACEHOLDER_IMAGES} offset />
        </View>
      </View>
      <View style={{ position: 'absolute', top: dreamRowY, left: sidePad, right: sidePad }}>
        <View style={{ width: dreamBoxW, height: dreamBoxH, borderRadius: FrostRadius.box, backgroundColor: 'rgba(232,228,221,0.85)' }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: FrostColors.pageFallback },
  contentLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
  heroWrap:     { paddingTop: FrostSpace.xxxl, paddingBottom: FrostSpace.xxl, alignItems: 'center' },
  heroEyebrow:  { ...FrostType.eyebrowLarge, marginBottom: FrostSpace.l },
  heroWeekday:  { ...FrostType.displayL, textAlign: 'center' },
  heroDate:     { fontFamily: FrostFonts.display, fontSize: 42, lineHeight: 50, color: FrostColors.goldMuted, fontStyle: 'italic', marginTop: FrostSpace.xs, textAlign: 'center', paddingHorizontal: FrostSpace.m },
  heroYear:     { fontFamily: FrostFonts.display, fontSize: 28, lineHeight: 32, color: FrostColors.ink, textAlign: 'center', marginTop: 6 },
  heroRule:     { height: StyleSheet.hairlineWidth, backgroundColor: FrostColors.hairline, width: 56, marginTop: FrostSpace.xl, marginBottom: FrostSpace.l },
  heroDaysWrap: { flexDirection: 'row', alignItems: 'baseline', gap: FrostSpace.s, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: FrostSpace.xl },
  heroDaysNumber: { fontFamily: FrostFonts.displayMedium, fontSize: 38, lineHeight: 42, color: FrostColors.goldMuted },
  heroDaysWord: { fontFamily: FrostFonts.label, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: FrostColors.muted, flexShrink: 1 },
  gridRow:      { flexDirection: 'row', marginTop: 4 },
  dreamRow:     { marginTop: FrostSpace.l },
  dreamInner:   { flex: 1, paddingHorizontal: FrostSpace.xl, paddingTop: FrostSpace.xxxl + 4, paddingBottom: FrostSpace.xl, justifyContent: 'center', gap: FrostSpace.l - 2 },
  dreamLineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: FrostSpace.m - 2 },
  dreamGlyph:   { fontFamily: FrostFonts.body, fontSize: 14, color: FrostColors.soft, marginTop: 3 },
  dreamText:    { flex: 1, fontFamily: FrostFonts.display, fontSize: 17, lineHeight: 24, color: FrostColors.soft, fontStyle: 'italic' },
});
