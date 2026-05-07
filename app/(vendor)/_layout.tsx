/**
 * TDW Native — Vendor tab layout
 * Matches PWA exactly:
 * Bottom nav: #0C0A09 dark · TODAY · CLIENTS · MONEY · STUDIO
 * Gold indicator line above active tab
 * Top pill nav (BUSINESS / AI / DISCOVERY) lives in vendor today screen
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GOLD  = '#C9A84C';
const MUTED = '#8C8480';
const DARK  = '#0C0A09';
const JOST  = 'Jost_300Light';
const DM300 = 'DMSans_300Light';

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      {/* Gold indicator line above active tab */}
      <View style={{
        position: 'absolute', top: -12, width: 24, height: 2,
        borderRadius: 1, backgroundColor: focused ? GOLD : 'transparent',
      }} />
      <Text style={{
        fontFamily: JOST, fontSize: 9, letterSpacing: 2,
        textTransform: 'uppercase',
        color: focused ? GOLD : MUTED,
      }}>{label}</Text>
    </View>
  );
}

function AILabel({ focused }: { focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <View style={{
        position: 'absolute', top: -12, width: 24, height: 2,
        borderRadius: 1, backgroundColor: focused ? GOLD : 'transparent',
      }} />
      <Text style={{ fontSize: 12, color: focused ? GOLD : MUTED, lineHeight: 16 }}>✦</Text>
      <Text style={{
        fontFamily: JOST, fontSize: 9, letterSpacing: 2,
        textTransform: 'uppercase', color: focused ? GOLD : MUTED,
      }}>AI</Text>
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
          backgroundColor: DARK,
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 12,
        },
        tabBarShowLabel: true,
        tabBarShowIcon: false,
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: MUTED,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="TODAY" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="CLIENTS" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="money"
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="MONEY" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="studio"
        options={{
          tabBarLabel: ({ focused }) => <TabLabel label="STUDIO" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="dreamai"
        options={{
          tabBarLabel: ({ focused }) => <AILabel focused={focused} />,
          href: null,
        }}
      />
      {/* Hidden from tab bar */}
      <Tabs.Screen name="pin"       options={{ href: null }} />
      <Tabs.Screen name="pin-login" options={{ href: null }} />
    </Tabs>
  );
}
