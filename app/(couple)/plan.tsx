import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const GOLD = '#C9A84C';
const INK = '#0C0A09';
const BG = '#F8F7F5';
const CARD = '#FFFFFF';
const BORDER = '#E2DED8';
const MUTED = '#8C8480';

// Exact tab keys and labels from PWA source (TABS constant in couple/plan/page.tsx)
type Tab = 'tasks' | 'money' | 'vendors' | 'people' | 'events' | 'muse';
const TABS: { key: Tab; label: string }[] = [
  { key: 'tasks',   label: 'Tasks' },
  { key: 'money',   label: 'Money' },
  { key: 'vendors', label: 'Vendors' },
  { key: 'people',  label: 'Guests' },
  { key: 'events',  label: 'Events' },
  { key: 'muse',    label: 'Muse' },
];

export default function CouplePlanScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('tasks');

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top pill nav */}
      <View style={styles.pillNav}>
        {['PLAN', 'AI', 'DISCOVER'].map((p, i) => (
          <TouchableOpacity key={p} style={[styles.topPill, i === 0 && styles.topPillActive]}>
            <Text style={[styles.topPillText, i === 0 && styles.topPillTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sub-tab scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <PlaceholderContent tab={activeTab} />
      </ScrollView>

      {/* Gold FAB */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 24 }]} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function PlaceholderContent({ tab }: { tab: Tab }) {
  const labels: Record<Tab, string> = {
    tasks:   'Tasks',
    money:   'Money',
    vendors: 'Vendors',
    people:  'Guests',
    events:  'Events',
    muse:    'Muse',
  };
  return (
    <View style={{ alignItems: 'center', paddingTop: 40 }}>
      <Text style={styles.emptySparkle}>✦</Text>
      <Text style={styles.emptyTitle}>{labels[tab]}</Text>
      <Text style={styles.emptySub}>Coming in V3.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Top pill nav
  pillNav: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12,
    backgroundColor: BG,
  },
  topPill: {
    borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 0.5, borderColor: BORDER, backgroundColor: CARD,
  },
  topPillActive: { backgroundColor: INK, borderColor: INK },
  topPillText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED },
  topPillTextActive: { color: '#F8F7F5' },

  // Sub-tab bar
  tabBar: {
    borderBottomWidth: 0.5, borderBottomColor: BORDER, backgroundColor: BG,
    flexGrow: 0,
  },
  tabBarContent: {
    paddingHorizontal: 20, paddingVertical: 10, gap: 6,
  },
  tab: {
    borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: BORDER, backgroundColor: 'transparent',
  },
  tabActive: { backgroundColor: INK, borderColor: INK },
  tabText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED },
  tabTextActive: { color: '#F8F7F5' },

  // FAB
  fab: {
    position: 'absolute', right: 24,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: GOLD,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 6,
    elevation: 6,
  },
  fabText: { fontFamily: 'CormorantGaramond_300Light', fontSize: 28, color: '#0C0A09', lineHeight: 32 },

  // Empty state
  emptySparkle: { fontSize: 24, color: GOLD, marginBottom: 16 },
  emptyTitle: { fontFamily: 'CormorantGaramond_300Light', fontSize: 28, color: INK, marginBottom: 8 },
  emptySub: { fontFamily: 'DMSans_300Light', fontSize: 13, color: MUTED },
});
