/**
 * Frost Landing — v1.1 (corrected composition)
 *
 * Hero: YOUR DAY eyebrow → day-of-week → date spelled in gold italic → year → small days count
 * Boxes: Muse + Discover (heavy frost, no image bleed)
 * Dream: ✦ prefix on each line, wrapping italic text
 * Journey: hairline rule + centered "Journey" italic — no arrow, no eyebrow
 *
 * Layer cake:
 *   Layer 1 – Bridal image (nearly invisible under heavy frost)
 *   Layer 2 – Single frost pane (blur(28px) + strong cream tint)
 *   Layer 3 – UI
 */

import React, { useState, useEffect } from 'react';
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

const { width: W } = Dimensions.get('window');

// ─── Frost palette ─────────────────────────────────────────────────────────
const F = {
  pageBg:    '#E8E5E0',
  frostTint: 'rgba(244,242,238,0.72)',
  gold:      '#A8924B',
  ink:       '#1A1815',
  soft:      '#3A3733',
  muted:     '#8C8480',
  hairline:  '#C8C3BC',
} as const;

const BRIDAL_IMAGE = 'https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=800&q=80';
const WEDDING_DATE = new Date('2026-09-25T00:00:00');

function getDaysUntil(): number {
  const now  = new Date();
  const diff = WEDDING_DATE.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const DAYS_OF_WEEK = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS       = ['January','February','March','April','May','June','July',
                      'August','September','October','November','December'];

// Spell ordinal numbers for date display
const ORDINALS: Record<number, string> = {
  1:'first',2:'second',3:'third',4:'fourth',5:'fifth',6:'sixth',7:'seventh',
  8:'eighth',9:'ninth',10:'tenth',11:'eleventh',12:'twelfth',13:'thirteenth',
  14:'fourteenth',15:'fifteenth',16:'sixteenth',17:'seventeenth',18:'eighteenth',
  19:'nineteenth',20:'twentieth',21:'twenty-first',22:'twenty-second',
  23:'twenty-third',24:'twenty-fourth',25:'twenty-fifth',26:'twenty-sixth',
  27:'twenty-seventh',28:'twenty-eighth',29:'twenty-ninth',30:'thirtieth',31:'thirty-first',
};

// Dream idle lines — ✦ prefix added in JSX
const DREAM_LINES: [string, string][] = [
  [
    'It rained in Delhi. I hope wherever you are, the windows are open.',
    'There is a song you have not played in a while. I noticed.',
  ],
  [
    'The light in October will be the colour of old letters.',
    'Your florist has not heard from you in eleven days.',
  ],
  [
    'Something about choosing a veil feels like the last decision.',
    'Perhaps it is the first one that is entirely yours.',
  ],
  [
    'Sixty-three days. The brass band has not been booked yet.',
    'Not urgent. Just noticed.',
  ],
  [
    'Your mother has been quiet today.',
    'That usually means she is choosing.',
  ],
  [
    'There are forty-seven things on the list.',
    'Only three of them are actually about the wedding.',
  ],
];

function getDreamLines(): [string, string] {
  const idx = Math.floor(new Date().getHours() / 4) % DREAM_LINES.length;
  return DREAM_LINES[idx];
}

// Box layout
const BOX_GAP     = 8;
const BOX_SMALL_W = (W - 32 - BOX_GAP) / 2;
const BOX_H       = 160;
const DREAM_BOX_H = 128;

// ─── Component ────────────────────────────────────────────────────────────
export default function FrostLanding() {
  const insets = useSafeAreaInsets();
  const [days,       setDays]       = useState(getDaysUntil());
  const [dreamLines, setDreamLines] = useState<[string, string]>(getDreamLines());

  const d         = WEDDING_DATE;
  const dayOfWeek = DAYS_OF_WEEK[d.getDay()];          // e.g. "Friday"
  const ordinal   = ORDINALS[d.getDate()] ?? String(d.getDate()); // e.g. "twenty-fifth"
  const month     = MONTHS[d.getMonth()];               // e.g. "September"
  const year      = String(d.getFullYear());            // e.g. "2026"

  useEffect(() => {
    const t = setInterval(() => setDays(getDaysUntil()), 60_000);
    return () => clearInterval(t);
  }, []);

  const handleJourney = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/(frost)/canvas/journey');
  };

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>

      {/* LAYER 1 — backdrop image (almost hidden by frost) */}
      <Image
        source={{ uri: BRIDAL_IMAGE }}
        style={styles.backdrop}
        resizeMode="cover"
      />

      {/* LAYER 2 — single heavy frost pane */}
      <View
        style={[StyleSheet.absoluteFill, styles.frostPane]}
        pointerEvents="none"
      />

      {/* LAYER 3 — UI */}
      <View style={[styles.uiLayer, { paddingTop: insets.top + 20 }]}>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={styles.yourDay}>YOUR DAY</Text>
          <Text style={styles.dayOfWeek}>{dayOfWeek}</Text>
          {/* Gold italic: "twenty-fifth of" on one line, "September" on the next */}
          <Text style={styles.dateGold}>{ordinal} of</Text>
          <Text style={styles.monthGold}>{month}</Text>
          <Text style={styles.yearText}>{year}</Text>
          {/* Small days count below */}
          <View style={styles.daysRow}>
            <Text style={styles.daysNumber}>{days}</Text>
            <Text style={styles.daysUnit}> days</Text>
          </View>
        </View>

        {/* ── Two boxes ── */}
        <View style={styles.boxRow}>
          <UnveilCanvas
            route="/(frost)/canvas/muse"
            width={BOX_SMALL_W}
            height={BOX_H}
            eyebrow="MUSE"
          />
          <View style={{ width: BOX_GAP }} />
          <UnveilCanvas
            route="/(frost)/canvas/discover"
            width={BOX_SMALL_W}
            height={BOX_H}
            eyebrow="DISCOVER · BETA"
          />
        </View>

        {/* ── Dream box ── */}
        <UnveilCanvas
          route="/(frost)/canvas/dream"
          width={W - 32}
          height={DREAM_BOX_H}
          eyebrow="✦ DREAM"
        >
          <View>
            <Text style={styles.dreamLine}>
              <Text style={styles.dreamStar}>✦  </Text>
              {dreamLines[0]}
            </Text>
            <Text style={[styles.dreamLine, { marginTop: 10 }]}>
              <Text style={styles.dreamStar}>✦  </Text>
              {dreamLines[1]}
            </Text>
          </View>
        </UnveilCanvas>

        {/* ── Journey bar ── */}
        <TouchableOpacity
          onPress={handleJourney}
          activeOpacity={0.85}
          style={styles.journeyBar}
        >
          <View style={styles.journeyRule} />
          <Text style={styles.journeyLabel}>Journey</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: F.pageBg,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  } as any,
  frostPane: {
    backgroundColor: F.frostTint,
    zIndex: 2,
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(28px) saturate(100%)' } as any)
      : {}),
  },

  uiLayer: {
    flex: 1,
    zIndex: 3,
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  yourDay: {
    fontFamily: 'Jost_300Light',
    fontSize: 8,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    color: F.muted,
    marginBottom: 8,
  },
  dayOfWeek: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 28,
    color: F.ink,
    lineHeight: 34,
  },
  dateGold: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 28,
    color: F.gold,
    fontStyle: 'italic',
    lineHeight: 34,
  },
  monthGold: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 28,
    color: F.gold,
    fontStyle: 'italic',
    lineHeight: 34,
  },
  yearText: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 18,
    color: F.soft,
    lineHeight: 24,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
  },
  daysNumber: {
    fontFamily: 'CormorantGaramond_400Regular',
    fontSize: 48,
    color: F.gold,
    lineHeight: 52,
  },
  daysUnit: {
    fontFamily: 'Jost_300Light',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: F.muted,
    marginLeft: 4,
  },

  // ── Boxes ──
  boxRow: {
    flexDirection: 'row',
  },

  // ── Dream ──
  dreamLine: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 13,
    color: F.ink,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  dreamStar: {
    fontFamily: 'DMSans_300Light',
    fontSize: 9,
    color: F.muted,
    fontStyle: 'normal',
  },

  // ── Journey ──
  journeyBar: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  journeyRule: {
    width: 20,
    height: 0.5,
    backgroundColor: F.hairline,
    marginBottom: 10,
  },
  journeyLabel: {
    fontFamily: 'CormorantGaramond_300Light',
    fontSize: 24,
    color: F.ink,
    fontStyle: 'italic',
  },
});
