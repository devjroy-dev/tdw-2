/**
 * app/(vendor)/studio/analytics.tsx
 * Exact native port of web/app/vendor/studio/analytics/page.tsx
 *
 * Endpoints:
 *   GET /api/vendor-analytics/:vendorId
 *   GET /api/v2/vendor/profile-level/:vendorId
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated, Easing,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { RAILWAY_URL } from '../../../constants/tokens';
import { getVendorSession } from '../../../utils/session';

const API    = RAILWAY_URL;
const BG     = '#F8F7F5';
const CARD   = '#FFFFFF';
const GOLD   = '#C9A84C';
const DARK   = '#111111';
const MUTED  = '#8C8480';
const BORDER = '#E2DED8';

const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
const JOST  = 'Jost_300Light';

interface DailyEntry { date: string; impressions: number; profile_views: number; saves: number; enquiries: number; }
interface Totals     { impressions: number; profile_views: number; saves: number; enquiries: number; lock_interests: number; }

function Shimmer({ height = 80, br = 8 }: { height?: number; br?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
  return <Animated.View style={{ height, borderRadius: br, backgroundColor: '#EEECE8', opacity, marginBottom: 8 }} />;
}

export default function VendorAnalyticsScreen() {
  const [vendorId,      setVendorId]      = useState<string | null>(null);
  const [daily,         setDaily]         = useState<DailyEntry[]>([]);
  const [totals,        setTotals]        = useState<Totals>({ impressions: 0, profile_views: 0, saves: 0, enquiries: 0, lock_interests: 0 });
  const [profileLevel,  setProfileLevel]  = useState<{ completion_pct: number; next_step: { label: string; href: string } | null; photo_count: number; about_word_count: number; is_live: boolean; } | null>(null);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    getVendorSession().then((s: any) => {
      if (!s) return;
      const vid = s.vendorId || s.id;
      setVendorId(vid);
      Promise.all([
        fetch(`${API}/api/vendor-analytics/${vid}`).then(r => r.json()),
        fetch(`${API}/api/v2/vendor/profile-level/${vid}`).then(r => r.json()),
      ]).then(([analyticsJson, profileJson]) => {
        if (analyticsJson.success) {
          if (Array.isArray(analyticsJson.daily)) setDaily(analyticsJson.daily);
          if (analyticsJson.totals) setTotals(analyticsJson.totals);
        }
        if (profileJson.success !== false) {
          setProfileLevel({
            completion_pct:   profileJson.completion_pct   || 0,
            next_step:        profileJson.next_step        || null,
            photo_count:      profileJson.photo_count      || 0,
            about_word_count: profileJson.about_word_count || 0,
            is_live:          !!profileJson.is_live,
          });
        }
      }).catch(() => {}).finally(() => setLoading(false));
    });
  }, []);

  // Last 7 days bar chart data
  const bars = (() => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const match = daily.find(e => e.date?.startsWith(key));
      result.push({ label: d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3), views: match?.profile_views || 0, isToday: i === 0 });
    }
    return result;
  })();
  const maxViews = Math.max(...bars.map(b => b.views), 1);
  const noData   = bars.every(b => b.views === 0);

  const strengthPct   = profileLevel?.completion_pct ?? 0;
  const strengthItems = profileLevel ? [
    { label: 'Profile active',                                           done: true },
    { label: `Photos (${profileLevel.photo_count}/4 uploaded)`,         done: profileLevel.photo_count >= 4 },
    { label: `Bio (${profileLevel.about_word_count}/80 words)`,         done: profileLevel.about_word_count >= 80 },
    { label: 'Live on couple discovery',                                 done: profileLevel.is_live },
  ] : [
    { label: 'Profile active',    done: !!vendorId },
    { label: 'Photos uploaded',   done: false },
    { label: 'Bio written',       done: false },
    { label: 'Live on discovery', done: false },
  ];

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} strokeWidth={1.5} color={DARK} />
          </TouchableOpacity>
          <Text style={styles.eyebrow}>YOUR STUDIO</Text>
          <Text style={styles.title}>Analytics</Text>
        </View>

        {loading ? (
          <View style={styles.section}>
            <View style={styles.metricGrid}>
              <Shimmer height={80} /><Shimmer height={80} /><Shimmer height={80} />
            </View>
            <Shimmer height={120} />
            <Shimmer height={140} />
          </View>
        ) : (
          <>
            {/* Metric cards */}
            <View style={styles.section}>
              <View style={styles.metricGrid}>
                {[
                  { label: 'VIEWS',     value: totals.profile_views },
                  { label: 'SAVES',     value: totals.saves         },
                  { label: 'ENQUIRIES', value: totals.enquiries     },
                ].map(card => (
                  <View key={card.label} style={styles.metricCard}>
                    <Text style={styles.metricValue}>{card.value || 0}</Text>
                    <Text style={styles.metricLabel}>{card.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Bar chart */}
            <View style={styles.section}>
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>THIS WEEK</Text>
                <View style={styles.barChart}>
                  {bars.map(bar => {
                    const h = noData ? 4 : Math.max(4, Math.round((bar.views / maxViews) * 60));
                    return (
                      <View key={bar.label} style={styles.barCol}>
                        <View style={[styles.bar, { height: h, backgroundColor: bar.isToday ? GOLD : BORDER }]} />
                        <Text style={styles.barLabel}>{bar.label}</Text>
                      </View>
                    );
                  })}
                </View>
                {noData && <Text style={styles.noData}>No activity yet</Text>}
              </View>
            </View>

            {/* Profile strength */}
            <View style={styles.section}>
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>PROFILE STRENGTH</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${strengthPct}%` as any }]} />
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressPct}>{strengthPct}% complete</Text>
                  {profileLevel?.next_step && (
                    <TouchableOpacity onPress={() => router.push('/(vendor)/studio' as any)}>
                      <Text style={styles.progressNext}>→ {profileLevel.next_step.label}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {strengthItems.map(item => (
                  <View key={item.label} style={styles.strengthRow}>
                    <Text style={[styles.strengthCheck, { color: item.done ? DARK : '#C8C4BE' }]}>{item.done ? '✓' : '–'}</Text>
                    <Text style={[styles.strengthLabel, { color: item.done ? DARK : MUTED }]}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Lock date interests */}
            <View style={styles.section}>
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>LOCK DATE INTERESTS</Text>
                <Text style={styles.lockValue}>{totals.lock_interests || 0}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  header:  { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 20 },
  backBtn: { marginBottom: 20, alignSelf: 'flex-start' },
  eyebrow: { fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  title:   { fontFamily: CG300, fontSize: 28, color: DARK },
  section: { paddingHorizontal: 20, marginBottom: 16 },

  metricGrid: { flexDirection: 'row', gap: 10 },
  metricCard: { flex: 1, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 16, alignItems: 'center' },
  metricValue: { fontFamily: CG300, fontSize: 36, color: DARK, lineHeight: 40 },
  metricLabel: { fontFamily: JOST, fontSize: 8, letterSpacing: 4, textTransform: 'uppercase', color: MUTED, marginTop: 4 },

  card:         { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 16 },
  sectionLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: MUTED, marginBottom: 16 },

  barChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 76 },
  barCol:   { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  bar:      { width: '100%', borderRadius: 2 },
  barLabel: { fontFamily: JOST, fontSize: 8, letterSpacing: 1, color: MUTED },
  noData:   { fontFamily: DM300, fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 8 },

  progressTrack:  { height: 4, backgroundColor: BORDER, borderRadius: 2, marginBottom: 6, overflow: 'hidden' },
  progressFill:   { height: '100%', backgroundColor: DARK, borderRadius: 2 },
  progressRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  progressPct:    { fontFamily: DM300, fontSize: 12, color: '#555250' },
  progressNext:   { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: GOLD },
  strengthRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  strengthCheck:  { fontFamily: DM300, fontSize: 13, minWidth: 14 },
  strengthLabel:  { fontFamily: DM300, fontSize: 13 },

  lockValue: { fontFamily: CG300, fontSize: 28, color: DARK },
});
