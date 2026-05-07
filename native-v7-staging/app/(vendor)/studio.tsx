/**
 * TDW Native V7 — Vendor Studio
 * Exact port of web/app/vendor/studio/page.tsx
 *
 * Studio is the vendor's hub: portfolio, analytics snapshot, tools.
 * Boost UI is locked behind Razorpay — all boost actions show "Coming August 1" toast.
 *
 * Endpoint: GET /api/vendor/studio/:vendorId
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius, RAILWAY_URL } from '../../constants/tokens';

const API = RAILWAY_URL;

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  React.useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <View style={styles.toast} pointerEvents="none">
      <Text style={styles.toastText}>{msg}</Text>
    </View>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({ icon, title, subtitle, onPress, dark }: {
  icon: string; title: string; subtitle: string;
  onPress: () => void; dark?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.toolCard, dark && styles.toolCardDark]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.toolIcon, dark && { color: Colors.gold }]}>{icon}</Text>
      <Text style={[styles.toolTitle, dark && styles.toolTitleDark]}>{title}</Text>
      <Text style={[styles.toolSubtitle, dark && styles.toolSubtitleDark]}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

// ─── Stat Row ─────────────────────────────────────────────────────────────────

function StatRow({ label, value, delta }: { label: string; value: number | string; delta?: number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={styles.statValue}>{value}</Text>
        {delta !== undefined && delta !== 0 && (
          <Text style={[styles.statDelta, { color: delta > 0 ? '#4A7C59' : '#9B4545' }]}>
            {delta > 0 ? `+${delta}` : delta}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function VendorStudioScreen() {
  const insets = useSafeAreaInsets();
  const [vendorId, setVendorId] = useState('');
  const [studioData, setStudioData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('vendor_session') || await AsyncStorage.getItem('vendor_web_session') || '';
        if (!raw) return;
        const s = JSON.parse(raw);
        const vid = s.vendorId || s.id;
        if (!vid) return;
        setVendorId(vid);
        const res = await fetch(`${API}/api/vendor/studio/${vid}`);
        const json = await res.json();
        if (json.success || json.data) setStudioData(json.data || json);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const showToast = (msg: string) => setToast(msg);

  const snapshot = studioData?.snapshot || {};
  const views = snapshot.views ?? 0;
  const saves = snapshot.saves ?? 0;
  const enquiries = snapshot.enquiries ?? 0;
  const viewsDelta = snapshot.views_delta ?? 0;
  const savesDelta = snapshot.saves_delta ?? 0;
  const enquiriesDelta = snapshot.enquiries_delta ?? 0;

  const TOOLS = [
    { icon: '📅', title: 'Calendar', subtitle: 'Your shoots & events', onPress: () => showToast('Calendar — coming soon.') },
    { icon: '👥', title: 'Team', subtitle: 'Manage your team', onPress: () => showToast('Team — coming soon.') },
    { icon: '📊', title: 'Analytics', subtitle: 'Views, saves, enquiries', onPress: () => showToast('Full analytics — coming soon.') },
    { icon: '📢', title: 'Broadcast', subtitle: 'Message all clients', onPress: () => showToast('Broadcast — coming soon.') },
    { icon: '🎁', title: 'Referrals', subtitle: 'Earn from referrals', onPress: () => showToast('Referrals — coming soon.') },
    { icon: '📄', title: 'Contracts', subtitle: 'Templates & signed docs', onPress: () => showToast('Contracts — coming soon.') },
    { icon: '💡', title: 'Tips & Features', subtitle: 'What TDW can do for you', onPress: () => showToast('Tips — coming soon.') },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {toast ? <Toast msg={toast} onDone={() => setToast('')} /> : null}

      <ScrollView
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLabel}>Your Studio</Text>
          <Text style={styles.headerTitle}>Studio</Text>
        </View>

        {/* Discovery snapshot */}
        {loading ? (
          <View style={styles.snapshotCard}>
            <ActivityIndicator color={Colors.gold} />
          </View>
        ) : (
          <View style={styles.snapshotCard}>
            <Text style={styles.snapshotLabel}>Discovery · Last 7 days</Text>
            <StatRow label="Profile views" value={views} delta={viewsDelta} />
            <StatRow label="Saves to Muse" value={saves} delta={savesDelta} />
            <StatRow label="Enquiries" value={enquiries} delta={enquiriesDelta} />
          </View>
        )}

        {/* Boost card — locked until August 1 */}
        <TouchableOpacity
          style={styles.boostCard}
          onPress={() => showToast('Boosts unlock August 1, 2026.')}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.boostLabel}>Boosts</Text>
            <Text style={styles.boostTitle}>Amplify your reach</Text>
            <Text style={styles.boostSubtitle}>Priority placement in discovery. Unlocks August 1.</Text>
          </View>
          <View style={styles.lockBadge}>
            <Text style={styles.lockBadgeText}>Aug 1</Text>
          </View>
        </TouchableOpacity>

        {/* 7-card grid */}
        <View style={styles.toolGrid}>
          {TOOLS.map(t => (
            <ToolCard
              key={t.title}
              icon={t.icon}
              title={t.title}
              subtitle={t.subtitle}
              onPress={t.onPress}
            />
          ))}
        </View>

        {/* Discovery Preview — dark card */}
        <View style={styles.previewCardWrap}>
          <TouchableOpacity
            style={styles.previewCard}
            onPress={() => showToast('Discovery preview — coming soon.')}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.previewLabel}>Discovery</Text>
              <Text style={styles.previewTitle}>See your profile</Text>
              <Text style={styles.previewSubtitle}>Exactly how couples experience you.</Text>
            </View>
            <Text style={styles.previewChevron}>›</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  toast: {
    position: 'absolute', top: 60, alignSelf: 'center',
    backgroundColor: Colors.dark, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, zIndex: 999,
  },
  toastText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.background },

  header: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 },
  headerLabel: { fontFamily: Fonts.label, fontSize: 10, fontWeight: '200', letterSpacing: 2.5, textTransform: 'uppercase', color: Colors.muted, marginBottom: 8 },
  headerTitle: { fontFamily: Fonts.display, fontSize: 28, color: Colors.ink, lineHeight: 32 },

  snapshotCard: {
    marginHorizontal: 24, marginBottom: 12,
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 16, padding: 16, minHeight: 60,
  },
  snapshotLabel: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: Colors.muted, marginBottom: 12 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  statLabel: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink },
  statValue: { fontFamily: Fonts.display, fontSize: 20, color: Colors.ink },
  statDelta: { fontFamily: Fonts.body, fontSize: 11, fontWeight: '300' },

  boostCard: {
    marginHorizontal: 24, marginBottom: 20,
    backgroundColor: '#F8F4EC', borderWidth: 1, borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: 16, padding: 20,
    flexDirection: 'row', alignItems: 'center',
  },
  boostLabel: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: Colors.gold, marginBottom: 4 },
  boostTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.ink, marginBottom: 4 },
  boostSubtitle: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, lineHeight: 18 },
  lockBadge: {
    backgroundColor: 'rgba(201,168,76,0.12)', borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.4)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  lockBadgeText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.gold },

  toolGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 24, gap: 12,
    marginBottom: 24,
  },
  toolCard: {
    width: '47%', backgroundColor: '#F4F1EC',
    borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
  },
  toolCardDark: { backgroundColor: Colors.dark, borderColor: Colors.dark },
  toolIcon: { fontSize: 22, marginBottom: 16, color: Colors.ink },
  toolTitle: { fontFamily: Fonts.display, fontSize: 18, color: Colors.ink, marginBottom: 4, lineHeight: 22 },
  toolTitleDark: { color: Colors.background },
  toolSubtitle: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, lineHeight: 18 },
  toolSubtitleDark: { color: Colors.muted },

  previewCardWrap: { paddingHorizontal: 24 },
  previewCard: {
    backgroundColor: Colors.ink, borderRadius: 16, padding: 24,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  previewLabel: { fontFamily: Fonts.label, fontSize: 10, fontWeight: '200', letterSpacing: 2.5, textTransform: 'uppercase', color: Colors.muted, marginBottom: 6 },
  previewTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.background, marginBottom: 6 },
  previewSubtitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  previewChevron: { fontSize: 22, color: Colors.gold },
});
