/**
 * TDW Native — Vendor tab layout
 * V6: added ✦ AI tab (TODAY · CLIENTS · ✦ AI · STUDIO)
 * V7: clients/[id] hidden from tab bar (dynamic route)
 * V8.1: refined editorial bottom nav icons
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import Svg, { Path, Circle, Line, Rect, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/tokens';

// ─── Tab icons ────────────────────────────────────────────────────────────

function VendorTodayIcon({ focused }: { focused: boolean }) {
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

function ClientsIcon({ focused }: { focused: boolean }) {
  const c = focused ? Colors.gold : Colors.muted;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="7" r="3" stroke={c} strokeWidth={1.5} />
      <Path d="M3 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      <Path d="M16 11l2 2 4-4" stroke={c} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function StudioIcon({ focused }: { focused: boolean }) {
  const c = focused ? Colors.gold : Colors.muted;
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="3" width="7" height="7" rx="1" stroke={c} strokeWidth={1.5} />
      <Rect x="14" y="3" width="7" height="7" rx="1" stroke={c} strokeWidth={1.5} />
      <Rect x="3" y="14" width="7" height="7" rx="1" stroke={c} strokeWidth={1.5} />
      <Path d="M14 17.5h7M17.5 14v7" stroke={c} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function AITabLabel({ focused }: { focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 14, color: focused ? Colors.gold : Colors.muted, lineHeight: 18 }}>✦</Text>
      <Text style={{
        fontFamily: Fonts.body, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase',
        color: focused ? Colors.gold : Colors.muted,
      }}>
        AI
      </Text>
    </View>
  );
}

export default function VendorLayout() {
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
      <Tabs.Screen name="today" options={{ title: 'Today', tabBarIcon: ({ focused }) => <VendorTodayIcon focused={focused} /> }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients', tabBarIcon: ({ focused }) => <ClientsIcon focused={focused} /> }} />
      <Tabs.Screen
        name="dreamai"
        options={{
          tabBarLabel: ({ focused }) => <AITabLabel focused={focused} />,
          tabBarIcon: () => null,
          tabBarShowIcon: false,
        }}
      />
      <Tabs.Screen name="studio" options={{ title: 'Studio', tabBarIcon: ({ focused }) => <StudioIcon focused={focused} /> }} />
      {/* Hidden — not in tab bar */}
      <Tabs.Screen name="money" options={{ href: null }} />
      <Tabs.Screen name="pin" options={{ href: null }} />
      <Tabs.Screen name="pin-login" options={{ href: null }} />
    </Tabs>
  );
}
