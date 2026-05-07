/**
 * TDW Native — Couple tab layout
 * V8: added settings screen (hidden from tab bar)
 * V8.1: refined editorial bottom nav icons
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import Svg, { Path, Circle, Line, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/tokens';

// ─── Tab icons — minimal, editorial, ink/gold ─────────────────────────────

function TodayIcon({ focused }: { focused: boolean }) {
  const c = focused ? Colors.gold : Colors.muted;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="17" rx="2" stroke={c} strokeWidth={1.5} />
      <Line x1="3" y1="9" x2="21" y2="9" stroke={c} strokeWidth={1.5} />
      <Line x1="8" y1="2" x2="8" y2="6" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1="16" y1="2" x2="16" y2="6" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      <Rect x="7" y="13" width="3" height="3" rx="0.5" fill={c} />
    </Svg>
  );
}

function PlanIcon({ focused }: { focused: boolean }) {
  const c = focused ? Colors.gold : Colors.muted;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke={c} strokeWidth={1.5} />
      <Rect x="9" y="3" width="6" height="4" rx="1" stroke={c} strokeWidth={1.5} />
      <Line x1="9" y1="12" x2="15" y2="12" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1="9" y1="16" x2="13" y2="16" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function CircleIcon({ focused }: { focused: boolean }) {
  const c = focused ? Colors.gold : Colors.muted;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="3" stroke={c} strokeWidth={1.5} />
      <Circle cx="5" cy="16" r="2.5" stroke={c} strokeWidth={1.5} />
      <Circle cx="19" cy="16" r="2.5" stroke={c} strokeWidth={1.5} />
      <Path d="M8.5 14.5C9.5 13 10.7 12.5 12 12.5s2.5.5 3.5 2" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

export default function CoupleLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          height: 58 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: Fonts.body,
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        },
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.muted,
        tabBarShowIcon: true,
        tabBarIconStyle: { marginBottom: -2 },
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: ({ focused }) => <TodayIcon focused={focused} /> }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: ({ focused }) => <PlanIcon focused={focused} /> }} />
      <Tabs.Screen name="circle" options={{ title: 'Circle', tabBarIcon: ({ focused }) => <CircleIcon focused={focused} /> }} />
      {/* Hidden screens — not shown in tab bar */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="dreamai" options={{ href: null }} />
      <Tabs.Screen name="discover" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
