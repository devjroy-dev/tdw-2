/**
 * app/(vendor)/discovery.tsx
 * Native port of web/app/vendor/discovery/dash/page.tsx
 *
 * Endpoints:
 *   GET  /api/v2/vendor/profile-level/:vendorId
 *   GET  /api/v2/vendor/today/:vendorId          (snapshot field)
 *   POST /api/vendor-discover/request-access
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Easing,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { RAILWAY_URL } from '../../constants/tokens';
import { getVendorSession } from '../../utils/session';

const API    = RAILWAY_URL;
const GOLD   = '#C9A84C';
const INK    = '#0C0A09';
const BG     = '#F8F7F5';
const CARD   = '#FFFFFF';
const BORDER = '#E2DED8';
const MUTED  = '#8C8480';
const DARK   = '#111111';
const GREEN  = '#4CAF50';
const RED    = '#E57373';

const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
const JOST  = 'Jost_300Light';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProfileLevel {
  level: 0 | 1 | 2;
  tier: string;
  completion_pct: number;
  next_step: { field: string; label: string; href: string } | null;
  is_live: boolean;
  is_submitted: boolean;
  is_approved: boolean;
  is_rejected: boolean;
  is_pending: boolean;
  rejection_reason: string | null;
  photo_count: number;
  about_word_count: number;
  level1_complete?: boolean;
  level2_complete?: boolean;
  level3_complete?: boolean;
  missing_for_level1?: string[];
  missing_for_level2?: string[];
  submitted?: boolean;
  rejected?: boolean;
}

interface Snapshot {
  views: number;
  saves: number;
  enquiries: number;
  views_delta: number;
  saves_delta: number;
  enquiries_delta: number;
}

// ── Shimmer ───────────────────────────────────────────────────────────────────
function Shimmer({ height = 60 }: { height?: number }) {
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
  return <Animated.View style={[styles.shimmer, { height, opacity }]} />;
}

// ── Profile ring (View-based, no SVG) ─────────────────────────────────────────
function ProfileRing({ percent }: { percent: number }) {
  const SIZE   = 72;
  const STROKE = 5;
  const R      = (SIZE - STROKE) / 2;
  const CIRC   = 2 * Math.PI * R;
  const filled = CIRC * (percent / 100);

  // We approximate the ring with a border-radius View since SVG isn't in RN core.
  // Use a simple percentage text in a circular container with a gold arc border trick:
  // outer border in BORDER colour, inner clip shows gold proportional to percent.
  // Simplest approach: show ring as circular container with border + percent text.
  // For accuracy, use a borderWidth ring with gold colour when complete, muted when not.
  const isComplete = percent >= 100;
  return (
    <View style={[styles.ring, { borderColor: isComplete ? GREEN : GOLD }]}>
      <Text style={styles.ringText}>{percent}%</Text>
    </View>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, delta }: { label: string; value: number; delta: number }) {
  const sign  = delta > 0 ? '+' : '';
  const color = delta > 0 ? GREEN : delta < 0 ? RED : MUTED;
  const deltaLabel = delta === 0 ? '—' : `${sign}${delta} vs last week`;
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statDelta, { color }]}>{deltaLabel}</Text>
    </View>
  );
}

// ── Status banner ─────────────────────────────────────────────────────────────
function StatusBanner({
  profile, tier, onSubmit, submitting,
}: {
  profile: ProfileLevel;
  tier: string;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const isPrestige = tier === 'prestige';

  // State: Live
  if (profile.is_live) {
    return (
      <View style={[styles.banner, { backgroundColor: 'rgba(74,124,89,0.08)', borderColor: 'rgba(76,175,80,0.3)' }]}>
        <Text style={[styles.bannerEyebrow, { color: GREEN }]}>● LIVE</Text>
        <Text style={styles.bannerTitle}>You're live. Couples are discovering you.</Text>
        <Text style={styles.bannerSub}>Keep adding photos to stay top of the feed.</Text>
      </View>
    );
  }

  // State: Pending review
  if (profile.is_pending) {
    return (
      <View style={[styles.banner, { backgroundColor: 'rgba(201,168,76,0.06)', borderColor: 'rgba(201,168,76,0.25)' }]}>
        <Text style={[styles.bannerEyebrow, { color: GOLD }]}>UNDER REVIEW</Text>
        <Text style={styles.bannerTitle}>We personally review every Maker.</Text>
        <Text style={styles.bannerSub}>We'll reach out within 48 hours on WhatsApp or Instagram.</Text>
      </View>
    );
  }

  // State: Rejected
  if (profile.is_rejected && !profile.is_live) {
    return (
      <View style={[styles.banner, { backgroundColor: 'rgba(229,115,115,0.06)', borderColor: 'rgba(229,115,115,0.25)' }]}>
        <Text style={[styles.bannerEyebrow, { color: RED }]}>PROFILE NEEDS WORK</Text>
        <Text style={styles.bannerTitle}>
          {profile.rejection_reason || 'Your profile needs some updates before going live.'}
        </Text>
        <TouchableOpacity
          onPress={onSubmit}
          disabled={submitting || profile.level < 2}
          activeOpacity={0.75}
        >
          <Text style={styles.bannerLink}>RESUBMIT →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // State: Level 2 complete — ready to submit
  if (profile.level >= 2) {
    return (
      <View style={[styles.banner, { backgroundColor: 'rgba(201,168,76,0.06)', borderColor: GOLD, borderWidth: 1.5 }]}>
        <Text style={[styles.bannerEyebrow, { color: GOLD }]}>READY TO SUBMIT</Text>
        <Text style={styles.bannerTitle}>
          {isPrestige
            ? 'Your profile is ready. As a Prestige Maker, you go live immediately.'
            : 'Your profile is ready. Submit for Discovery.'}
        </Text>
        {!isPrestige && (
          <Text style={[styles.bannerSub, { marginBottom: 14 }]}>
            We review every submission personally. Within 48 hours.
          </Text>
        )}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={onSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? 'Submitting...' : isPrestige ? 'Go Live Now →' : 'Submit for Discovery →'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // State: Level 1 complete
  if (profile.level === 1) {
    const missing = profile.missing_for_level2 || [];
    return (
      <View style={[styles.banner, { backgroundColor: '#1A1816', borderColor: BORDER }]}>
        <Text style={[styles.bannerEyebrow, { color: GOLD }]}>STEP 1 OF 2 COMPLETE ✓</Text>
        <Text style={[styles.bannerTitle, { color: CARD }]}>
          Now write your bio, add vibe tags, and complete your full profile.
        </Text>
        {missing.map((item, i) => (
          <Text key={i} style={styles.missingItem}>· {item}</Text>
        ))}
        <TouchableOpacity onPress={() => router.push('/(vendor)/studio')} activeOpacity={0.75}>
          <Text style={styles.bannerLink}>FINISH PROFILE →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // State: Level 0 — nothing done yet
  const missing = profile.missing_for_level1 || [];
  return (
    <View style={[styles.banner, { backgroundColor: '#1A1816', borderColor: BORDER }]}>
      <Text style={[styles.bannerEyebrow, { color: MUTED }]}>NOT YET DISCOVERABLE</Text>
      <Text style={[styles.bannerTitle, { color: CARD }]}>Complete your profile to get discovered.</Text>
      {missing.map((item, i) => (
        <Text key={i} style={styles.missingItem}>· {item}</Text>
      ))}
      <TouchableOpacity onPress={() => router.push('/(vendor)/studio')} activeOpacity={0.75}>
        <Text style={styles.bannerLink}>COMPLETE PROFILE →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function VendorDiscoveryScreen() {
  const [session, setSession]       = useState<any>(null);
  const [profile, setProfile]       = useState<ProfileLevel | null>(null);
  const [snapshot, setSnapshot]     = useState<Snapshot | null>(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState('');

  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string) => {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(''));
  };

  useEffect(() => {
    getVendorSession().then(async (s: any) => {
      if (!s?.id && !s?.vendorId) { router.replace('/'); return; }
      setSession(s);
      const vendorId = s.vendorId || s.id;

      try {
        const [levelData, todayData] = await Promise.all([
          fetch(`${API}/api/v2/vendor/profile-level/${vendorId}`).then(r => r.json()),
          fetch(`${API}/api/v2/vendor/today/${vendorId}`).then(r => r.json()),
        ]);
        if (levelData.success !== false) setProfile(levelData);
        if (todayData.snapshot)          setSnapshot(todayData.snapshot);
      } catch {}
      finally { setLoading(false); }
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!session || submitting) return;
    const vendorId = session.vendorId || session.id;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const r = await fetch(`${API}/api/vendor-discover/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId }),
      });
      const d = await r.json();
      if (d.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast(d.auto_approved
          ? "You're live. Couples can discover you now."
          : "Submitted. We'll be in touch within 48 hours.");
        // Refresh profile level
        const fresh = await fetch(`${API}/api/v2/vendor/profile-level/${vendorId}`).then(r => r.json());
        if (fresh.success !== false) setProfile(fresh);
      } else {
        showToast(d.error || 'Submission failed. Please try again.');
      }
    } catch {
      showToast('Could not submit — check your connection.');
    } finally {
      setSubmitting(false);
    }
  }, [session, submitting]);

  const tier = profile?.tier || session?.tier || 'essential';

  return (
    <View style={styles.root}>
      {/* Toast */}
      {!!toast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR DISCOVERY</Text>
          <Text style={styles.title}>Discover Dash</Text>
        </View>

        {/* Profile completion ring + next step */}
        <View style={styles.section}>
          {loading ? <Shimmer height={96} /> : (
            <View style={styles.ringCard}>
              <ProfileRing percent={profile?.completion_pct || 0} />
              <View style={{ flex: 1 }}>
                <Text style={styles.ringTitle}>Profile strength</Text>
                {profile?.next_step ? (
                  <TouchableOpacity
                    onPress={() => router.push('/(vendor)/studio')}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.nextStepLink}>→ {profile.next_step.label}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={[styles.nextStepLink, { color: GREEN }]}>Profile complete ✓</Text>
                )}
                <View style={styles.levelPill}>
                  <Text style={styles.levelPillText}>
                    {profile?.is_live ? 'Live' : `Level ${profile?.level || 0} of 2`}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Status banner */}
        <View style={styles.section}>
          {loading ? <Shimmer height={110} /> : profile ? (
            <StatusBanner
              profile={profile}
              tier={tier}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          ) : null}
        </View>

        {/* Weekly stats */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>THIS WEEK</Text>
          {loading ? (
            <View style={styles.statsGrid}>
              <Shimmer height={88} /><Shimmer height={88} />
              <Shimmer height={88} /><Shimmer height={88} />
            </View>
          ) : (
            <View style={styles.statsGrid}>
              <StatCard label="Profile Views" value={snapshot?.views      || 0} delta={snapshot?.views_delta    || 0} />
              <StatCard label="Saves"         value={snapshot?.saves      || 0} delta={snapshot?.saves_delta    || 0} />
              <StatCard label="Enquiries"     value={snapshot?.enquiries  || 0} delta={snapshot?.enquiries_delta|| 0} />
              <StatCard label="Photos"        value={profile?.photo_count || 0} delta={0} />
            </View>
          )}
        </View>

        {/* See your profile CTA */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.previewCard}
            onPress={() => router.push('/(vendor)/studio')}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.previewTitle}>See your profile</Text>
              <Text style={styles.previewSub}>Exactly how couples experience you</Text>
            </View>
            <Text style={styles.previewCta}>PREVIEW →</Text>
          </TouchableOpacity>
        </View>

        {/* Founding Maker badge */}
        <View style={[styles.section, { marginBottom: 0 }]}>
          <View style={styles.foundingBadge}>
            <Text style={styles.foundingEyebrow}>FOUNDING MAKER</Text>
            <Text style={styles.foundingTitle}>Signature free until 1 August 2026.</Text>
            <Text style={styles.foundingSub}>
              After that, ₹1,499/month (₹1,199/month founding rate) or Essential free.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: BG },
  scroll: { paddingBottom: 48 },

  // Toast
  toast: {
    position: 'absolute', top: 16, left: '10%', right: '10%', zIndex: 100,
    backgroundColor: DARK, borderRadius: 8, padding: 12, alignItems: 'center',
  },
  toastText: { fontFamily: DM300, fontSize: 13, color: BG },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  eyebrow: {
    fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase',
    color: MUTED, marginBottom: 6,
  },
  title: { fontFamily: CG300, fontSize: 28, color: DARK, lineHeight: 32 },

  // Section
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: {
    fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase',
    color: MUTED, marginBottom: 12,
  },

  // Shimmer
  shimmer: { backgroundColor: '#E8E5DF', borderRadius: 12, marginBottom: 4 },

  // Ring card
  ringCard: {
    backgroundColor: CARD, borderRadius: 16, padding: 20,
    borderWidth: 0.5, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'center', gap: 20,
  },
  ring: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 5, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  ringText: { fontFamily: JOST, fontSize: 14, color: INK },
  ringTitle: { fontFamily: CG300, fontSize: 18, color: INK, marginBottom: 4, lineHeight: 22 },
  nextStepLink: { fontFamily: DM300, fontSize: 13, color: GOLD, marginBottom: 8, lineHeight: 18 },
  levelPill: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(201,168,76,0.12)',
    borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3,
  },
  levelPillText: { fontFamily: JOST, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: GOLD },

  // Banner
  banner: {
    borderRadius: 14, padding: 18, borderWidth: 1,
  },
  bannerEyebrow: {
    fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 6,
  },
  bannerTitle: { fontFamily: DM300, fontSize: 14, color: INK, marginBottom: 4, lineHeight: 20 },
  bannerSub:   { fontFamily: DM300, fontSize: 12, color: MUTED },
  bannerLink:  { fontFamily: JOST,  fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, marginTop: 10 },
  missingItem: { fontFamily: DM300, fontSize: 12, color: MUTED, marginBottom: 3, lineHeight: 18 },

  // Submit button
  submitBtn: {
    height: 44, paddingHorizontal: 24, backgroundColor: GOLD,
    borderRadius: 100, alignSelf: 'flex-start', justifyContent: 'center',
    alignItems: 'center', marginTop: 14,
  },
  submitBtnDisabled: { backgroundColor: '#2A2825' },
  submitBtnText: {
    fontFamily: JOST, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: INK,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: BG, borderRadius: 12,
    padding: 16, borderWidth: 0.5, borderColor: BORDER,
  },
  statValue: { fontFamily: CG300, fontSize: 28, color: INK, marginBottom: 4, lineHeight: 32 },
  statLabel: {
    fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase',
    color: MUTED, marginBottom: 6,
  },
  statDelta: { fontFamily: DM300, fontSize: 11 },

  // Preview CTA
  previewCard: {
    backgroundColor: CARD, borderRadius: 16, padding: 18,
    borderWidth: 0.5, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  previewTitle: { fontFamily: CG300, fontSize: 16, color: INK, marginBottom: 4 },
  previewSub:   { fontFamily: DM300, fontSize: 13, color: MUTED },
  previewCta:   {
    fontFamily: JOST, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
    color: GOLD, marginLeft: 16,
  },

  // Founding badge
  foundingBadge: {
    backgroundColor: 'rgba(201,168,76,0.07)',
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.2)',
    borderRadius: 12, padding: 14,
  },
  foundingEyebrow: {
    fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase',
    color: GOLD, marginBottom: 4,
  },
  foundingTitle: { fontFamily: DM300, fontSize: 13, color: INK, marginBottom: 2, lineHeight: 18 },
  foundingSub:   { fontFamily: DM300, fontSize: 12, color: MUTED },
});
