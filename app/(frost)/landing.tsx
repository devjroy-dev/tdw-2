/**
 * Frost Landing — v1.1
 *
 * ARCHITECTURE (read handover section 5 before editing):
 *
 * Layer 1   – Full-bleed bridal image, CSS greyscale(100%) contrast(0.92) brightness(1.05) on web
 * Layer 1.5 – Box images (Muse, Discover) positioned absolute to sit behind where box borders are drawn
 *             These blur together with the bg image under Layer 2
 * Layer 2   – ONE frost pane: backdrop-filter blur(20px) saturate(105%) + rgba(244,242,238,0.42) tint
 * Layer 3   – UI: free-type hero (NOT in a box), transparent box shells with hairline borders,
 *             dream text, Journey bar PINNED TO FOOT
 *
 * INVARIANTS:
 * - Boxes are transparent shells. NO background, NO border radius, NO overflow hidden.
 * - The frost pane is ONE sheet over the whole screen. Boxes do NOT have their own frost.
 * - Hero text floats free — not inside any box or card.
 * - Journey bar is position:absolute at the bottom, NOT in the flex flow.
 * - Gold is muted at rest (#A8924B). Greyscale rule applies to gold too.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import UnveilCanvas from '../../components/frost/UnveilCanvas';

const { width: W, height: H } = Dimensions.get('window');

// ─── Frost colour system (exact values from handover) ─────────────────────
const FROST_TINT = 'rgba(244,242,238,0.42)';
const GOLD       = '#A8924B';
const INK        = '#1A1815';
const SOFT       = '#3A3733';
const MUTED      = '#8C8480';
const HAIRLINE   = '#C8C3BC';
const PAGE_BG    = '#E8E5E0';

// Placeholder bridal image — curated in v1.3
const BRIDAL_IMAGE = 'https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=800&q=80';

// Box images — sit at Layer 1.5, blur under frost with the main image
const MUSE_IMAGES     = [
  'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=400&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80',
];
const DISCOVER_IMAGES = [
  'https://images.unsplash.com/photo-1470290378698-263fa7f3b44d?w=400&q=80',
  'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80',
];

// ── Wedding date — wire to user profile in v1.7 ────────────────────────────
const WEDDING_DATE = new Date('2026-09-25T00:00:00');

function getDaysUntil(): number {
  const diff = WEDDING_DATE.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

const DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS       = ['January','February','March','April','May','June','July',
                      'August','September','October','November','December'];
const ORDINALS: Record<number,string> = {
  1:'first',2:'second',3:'third',4:'fourth',5:'fifth',6:'sixth',7:'seventh',
  8:'eighth',9:'ninth',10:'tenth',11:'eleventh',12:'twelfth',13:'thirteenth',
  14:'fourteenth',15:'fifteenth',16:'sixteenth',17:'seventeenth',18:'eighteenth',
  19:'nineteenth',20:'twentieth',21:'twenty-first',22:'twenty-second',
  23:'twenty-third',24:'twenty-fourth',25:'twenty-fifth',26:'twenty-sixth',
  27:'twenty-seventh',28:'twenty-eighth',29:'twenty-ninth',30:'thirtieth',31:'thirty-first',
};

// ── Dream idle lines ────────────────────────────────────────────────────────
const DREAM_LINES: [string,string][] = [
  ['It rained in Delhi. I hope wherever you are, the windows are open.',
   'There is a song you have not played in a while. I noticed.'],
  ['The light in October will be the colour of old letters.',
   'Your florist has not heard from you in eleven days.'],
  ['Something about choosing a veil feels like the last decision.',
   'Perhaps it is the first one that is entirely yours.'],
  ['Sixty-three days. The brass band has not been booked yet.',
   'Not urgent. Just noticed.'],
  ['Your mother has been quiet today.',
   'That usually means she is choosing.'],
  ['There are forty-seven things on the list.',
   'Only three of them are actually about the wedding.'],
];

function getDreamLines(): [string,string] {
  return DREAM_LINES[Math.floor(new Date().getHours() / 4) % DREAM_LINES.length];
}

// ── Box layout ──────────────────────────────────────────────────────────────
const H_PAD      = 16;   // horizontal padding each side
const BOX_GAP    = 8;
const BOX_W      = (W - H_PAD * 2 - BOX_GAP) / 2;
const BOX_H      = 160;
const DREAM_H    = 120;
const JOURNEY_H  = 56;

// Hero sits in the top half. Boxes stack in the bottom half.
// We measure where the box row starts with onLayout on the hero.

// ─── Component ────────────────────────────────────────────────────────────
export default function FrostLanding() {
  const insets = useSafeAreaInsets();
  const [days,       setDays]       = useState(getDaysUntil());
  const [dreamLines, setDreamLines] = useState<[string,string]>(getDreamLines());
  const [museIdx,    setMuseIdx]    = useState(0);
  const [discoverIdx,setDiscoverIdx]= useState(0);
  const [heroBottom, setHeroBottom] = useState(0); // used to position Layer 1.5 box images

  const d         = WEDDING_DATE;
  const dayOfWeek = DAYS_OF_WEEK[d.getDay()];
  const ordinal   = ORDINALS[d.getDate()] ?? String(d.getDate());
  const month     = MONTHS[d.getMonth()];
  const year      = String(d.getFullYear());

  useEffect(() => {
    const t = setInterval(() => setDays(getDaysUntil()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Rotate box images every 4.5s
  useEffect(() => {
    const t = setInterval(() => {
      setMuseIdx(i     => (i + 1) % MUSE_IMAGES.length);
      setDiscoverIdx(i => (i + 1) % DISCOVER_IMAGES.length);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const handleJourney = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(frost)/canvas/journey');
  };

  // Top of box row = insets.top + hero height + gap
  // We measure hero via onLayout
  const boxRowTop = insets.top + heroBottom + 16;
  // Journey bar bottom position
  const journeyBottom = insets.bottom + 0;

  return (
    <View style={[styles.root]}>

      {/* ── LAYER 1: bridal image — greyscale filtered ── */}
      <Image
        source={{ uri: BRIDAL_IMAGE }}
        style={[
          StyleSheet.absoluteFill,
          styles.backdrop,
          // Web greyscale via inline style — React Native Web passes these through
          Platform.OS === 'web'
            ? ({ filter: 'grayscale(100%) contrast(0.92) brightness(1.05)' } as any)
            : {},
        ]}
        resizeMode="cover"
      />

      {/* ── LAYER 1.5: box images — positioned absolute, sit UNDER frost ── */}
      {/* Left box = Muse, Right box = Discover */}
      {heroBottom > 0 && (
        <>
          <Image
            source={{ uri: MUSE_IMAGES[museIdx] }}
            style={[
              styles.boxImage,
              { top: boxRowTop, left: H_PAD, width: BOX_W, height: BOX_H },
              Platform.OS === 'web'
                ? ({ filter: 'grayscale(100%) contrast(0.92) brightness(1.05)' } as any)
                : {},
            ]}
            resizeMode="cover"
          />
          <Image
            source={{ uri: DISCOVER_IMAGES[discoverIdx] }}
            style={[
              styles.boxImage,
              { top: boxRowTop, left: H_PAD + BOX_W + BOX_GAP, width: BOX_W, height: BOX_H },
              Platform.OS === 'web'
                ? ({ filter: 'grayscale(100%) contrast(0.92) brightness(1.05)' } as any)
                : {},
            ]}
            resizeMode="cover"
          />
        </>
      )}

      {/* ── LAYER 2: ONE frost pane — sits between images and all UI ── */}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.frostPane,
        ]}
        pointerEvents="none"
      />

      {/* ── LAYER 3: UI — all above frost ── */}

      {/* Hero — free type, centered, NOT in any box */}
      <View
        style={[styles.hero, { paddingTop: insets.top + 24 }]}
        onLayout={e => {
          // Record bottom of hero so box images align correctly
          setHeroBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height - insets.top - 24 + 24);
        }}
      >
        <Text style={styles.yourDay}>YOUR DAY</Text>
        <Text style={styles.dayOfWeek}>{dayOfWeek}</Text>
        <Text style={styles.dateGold}>{ordinal} of</Text>
        <Text style={styles.monthGold}>{month}</Text>
        <Text style={styles.yearText}>{year}</Text>
        <View style={styles.daysRow}>
          <Text style={styles.daysNumber}>{days}</Text>
          <Text style={styles.daysUnit}> days</Text>
        </View>
      </View>

      {/* Box row — Muse + Discover transparent shells */}
      <View style={[styles.boxRow, { top: boxRowTop > 0 ? boxRowTop : insets.top + 280 }]}>
        <UnveilCanvas
          route="/(frost)/canvas/muse"
          width={BOX_W}
          height={BOX_H}
          eyebrow="MUSE"
        />
        <View style={{ width: BOX_GAP }} />
        <UnveilCanvas
          route="/(frost)/canvas/discover"
          width={BOX_W}
          height={BOX_H}
          eyebrow="DISCOVER · BETA"
        />
      </View>

      {/* Dream box — transparent shell */}
      <UnveilCanvas
        route="/(frost)/canvas/dream"
        width={W - H_PAD * 2}
        height={DREAM_H}
        eyebrow="✦ DREAM"
        style={[
          styles.dreamBox,
          {
            top: (boxRowTop > 0 ? boxRowTop : insets.top + 280) + BOX_H + BOX_GAP,
            left: H_PAD,
          },
        ]}
      >
        <View>
          <Text style={styles.dreamLine}>
            <Text style={styles.dreamStar}>✦  </Text>
            {dreamLines[0]}
          </Text>
          <Text style={[styles.dreamLine, { marginTop: 8 }]}>
            <Text style={styles.dreamStar}>✦  </Text>
            {dreamLines[1]}
          </Text>
        </View>
      </UnveilCanvas>

      {/* Journey bar — pinned to bottom of screen */}
      <TouchableOpacity
        onPress={handleJourney}
        activeOpacity={0.85}
        style={[styles.journeyBar, { bottom: journeyBottom, height: JOURNEY_H + insets.bottom }]}
      >
        <View style={styles.journeyRule} />
        <Text style={styles.journeyLabel}>Journey</Text>
      </TouchableOpacity>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },

  // Layer 1
  backdrop: {
    zIndex: 0,
  },

  // Layer 1.5 — box images
  boxImage: {
    position: 'absolute',
    zIndex: 1,
  },

  // Layer 2 — single frost sheet
  frostPane: {
    zIndex: 2,
    backgroundColor: FROST_TINT,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(20px) saturate(105%)' } as any)
      : {}),
  },

  // Layer 3 — all UI elements zIndex >= 3

  // Hero — free type, not in a box
  hero: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 3,
    alignItems: 'center',
  },
  yourDay: {
    fontFamily: 'Jost_300Light',
    fontSize: 8,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    color: MUTED,
    marginBottom: 8,
  },
  dayOfWeek: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 28,
    color: INK,
    lineHeight: 34,
  },
  dateGold: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 28,
    color: GOLD,
    fontStyle: 'italic',
    lineHeight: 34,
  },
  monthGold: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 28,
    color: GOLD,
    fontStyle: 'italic',
    lineHeight: 34,
  },
  yearText: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 18,
    color: SOFT,
    lineHeight: 26,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 10,
  },
  daysNumber: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 52,
    color: GOLD,
    lineHeight: 56,
  },
  daysUnit: {
    fontFamily: 'Jost_300Light',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: MUTED,
    marginLeft: 4,
  },

  // Box row
  boxRow: {
    position: 'absolute',
    left: H_PAD,
    flexDirection: 'row',
    zIndex: 3,
  },

  // Dream box
  dreamBox: {
    position: 'absolute',
    zIndex: 3,
  },

  // Dream content
  dreamLine: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 13,
    color: INK,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  dreamStar: {
    fontFamily: 'DMSans_300Light',
    fontSize: 9,
    color: MUTED,
    fontStyle: 'normal',
  },

  // Journey bar — absolute, pinned to bottom
  journeyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 0.5,
    borderTopColor: HAIRLINE,
    backgroundColor: 'transparent',
  },
  journeyRule: {
    width: 20,
    height: 0.5,
    backgroundColor: HAIRLINE,
    marginBottom: 8,
  },
  journeyLabel: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 24,
    color: INK,
    fontStyle: 'italic',
  },
});
