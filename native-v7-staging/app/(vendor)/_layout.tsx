/**
 * TDW Native — Vendor tab layout
 * V6: added ✦ AI tab (TODAY · CLIENTS · ✦ AI · STUDIO)
 * V7: clients/[id] hidden from tab bar (dynamic route)
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/tokens';

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
          height: 54 + insets.bottom,
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
        tabBarShowIcon: false,
      }}
    >
      <Tabs.Screen name="today" options={{ title: 'Today' }} />
      <Tabs.Screen name="clients" options={{ title: 'Clients' }} />
      <Tabs.Screen
        name="dreamai"
        options={{
          tabBarLabel: ({ focused }) => <AITabLabel focused={focused} />,
          tabBarShowIcon: false,
        }}
      />
      <Tabs.Screen name="studio" options={{ title: 'Studio' }} />
      {/* Hidden — not in tab bar */}
      <Tabs.Screen name="money" options={{ href: null }} />
      <Tabs.Screen name="pin" options={{ href: null }} />
      <Tabs.Screen name="pin-login" options={{ href: null }} />
    </Tabs>
  );
}
