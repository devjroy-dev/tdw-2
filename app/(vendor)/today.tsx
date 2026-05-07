import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Easing,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RAILWAY_URL } from '../../constants/tokens';
import { getVendorSession, clearVendorSession } from '../../utils/session';

const API    = RAILWAY_URL;
const GOLD   = '#C9A84C';
const INK    = '#0C0A09';
const BG     = '#F8F7F5';
const CARD   = '#FFFFFF';
const BORDER = '#E2DED8';
const MUTED  = '#8C8480';
const DARK   = '#111111';
const CREAM  = '#F8F7F5';

const CG300  = 'CormorantGaramond_300Light';
const DM300  = 'DMSans_300Light';
const DM400  = 'DMSans_400Regular';
const JOST   = 'Jost_300Light';

// ── Types ──────────────────────────────────────────────────────────────────
interface AttentionItem {
  id: string;
  type: 'invoice' | 'enquiry' | 'shoot' | 'hot_date';
  title: string;
  subtitle: string;
  amount?: number;
  cta: string;
  intensity?: string;
}
interface ScheduleItem {
  id: string;
  time: string;
  event_name: string;
  client_name?: string;
}
interface Snapshot {
  views: number; saves: number; enquiries: number;
  views_delta: number; saves_delta: number; enquiries_delta: number;
}
interface TodayData {
  needs_attention: AttentionItem[];
  todays_schedule: ScheduleItem[];
  this_week_summary: string;
  snapshot: Snapshot;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function fmtINR(n: number) { return 'Rs ' + n.toLocaleString('en-IN'); }
function attentionCount(n: number) {
  if (n === 0) return 'All clear for today.';
  if (n === 1) return 'One moment for today.';
  if (n === 2) return 'Two moments for today.';
  return 'Three moments for today.';
}
function deltaLabel(d: number) {
  if (d === 0) return '—';
  return (d > 0 ? '+' : '') + d + ' vs last week';
}

// ── Shimmer skeleton ───────────────────────────────────────────────────────
function Shimmer({ h, w = '100%', br = 8, mt = 0 }: { h: number; w?: any; br?: number; mt?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
  return (
    <Animated.View style={{ height: h, width: w, borderRadius: br, marginTop: mt, backgroundColor: '#E8E5DF', opacity }} />
  );
}

// ── Section header ─────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

// ── Attention card ─────────────────────────────────────────────────────────
function AttentionCard({ item, onPress }: { item: AttentionItem; onPress?: () => void }) {
  const isOverdue = item.type === 'invoice';
  const isHotDate = item.type === 'hot_date';
  const hotColour = item.intensity === 'peak' ? '#FF6B35' : GOLD;
  const borderLeftColor = isHotDate ? hotColour : BORDER;
  const borderLeftWidth = isHotDate ? 3 : 0.5;
  const bgColor = isHotDate
    ? (item.intensity === 'peak' ? 'rgba(255,107,53,0.06)' : 'rgba(201,168,76,0.06)')
    : CARD;

  return (
    <TouchableOpacity
      style={[styles.attentionCard, { backgroundColor: bgColor, borderLeftColor, borderLeftWidth }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={styles.attentionTitle} numberOfLines={2}>{item.title}</Text>
        {isOverdue && item.amount ? (
          <Text style={styles.attentionAmount}>{fmtINR(item.amount)}</Text>
        ) : null}
      </View>
      <Text style={styles.attentionSubtitle}>{item.subtitle}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        {isOverdue && (
          <View style={styles.overdueTag}>
            <Text style={styles.overdueTagText}>OVERDUE</Text>
          </View>
        )}
        <Text style={[styles.attentionCta, { color: isHotDate ? hotColour : MUTED, marginLeft: isOverdue ? 0 : 'auto' as any }]}>
          {item.cta} →
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Snapshot number ────────────────────────────────────────────────────────
function SnapNum({ label, value, delta }: { label: string; value: number; delta: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.snapValue}>{value}</Text>
      <Text style={styles.snapLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.snapDelta}>{deltaLabel(delta)}</Text>
    </View>
  );
}

// ── Quick actions ──────────────────────────────────────────────────────────
function QuickActions({ category, onDreamAi }: { category?: string; onDreamAi: () => void }) {
  const universal = [
    { label: 'New Client',  icon: '+', onTap: () => router.push('/(vendor)/clients') },
    { label: 'New Invoice', icon: 'Rs', onTap: () => router.push('/(vendor)/money') },
    { label: 'Block Date',  icon: '◻', onTap: () => router.push('/(vendor)/studio') },
    { label: 'Ask DreamAi', icon: '❖', onTap: onDreamAi },
    { label: 'Leads',       icon: '↗', onTap: () => router.push('/(vendor)/studio') },
  ];

  const catAction = ({
    photographer:  { label: 'Add Shoot',    icon: '◈', onTap: () => router.push('/(vendor)/studio') },
    videographer:  { label: 'Add Shoot',    icon: '◈', onTap: () => router.push('/(vendor)/studio') },
    mua:           { label: 'Add Trial',    icon: '◎', onTap: () => router.push('/(vendor)/clients') },
    decorator:     { label: 'Site Visit',   icon: '⬡', onTap: () => router.push('/(vendor)/studio') },
    venue:         { label: 'Book Tour',    icon: '⬡', onTap: () => router.push('/(vendor)/clients') },
    designer:      { label: 'Book Fitting', icon: '◎', onTap: () => router.push('/(vendor)/clients') },
    jeweller:      { label: 'Book Viewing', icon: '◎', onTap: () => router.push('/(vendor)/clients') },
  } as Record<string, { label: string; icon: string; onTap: () => void }>)[category?.toLowerCase() || '']
    || { label: 'Add Task', icon: '◐', onTap: () => router.push('/(vendor)/studio') };

  const actions = [...universal, catAction];

  return (
    <View style={{ marginBottom: 28 }}>
      <Text style={[styles.sectionLabel, { paddingHorizontal: 20, marginBottom: 12 }]}>QUICK ACTIONS</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingRight: 32 }}
      >
        {actions.map((a, i) => (
          <TouchableOpacity
            key={i}
            style={styles.quickAction}
            activeOpacity={0.75}
            onPress={() => { Haptics.selectionAsync(); a.onTap(); }}
          >
            <Text style={styles.qaIcon}>{a.icon}</Text>
            <Text style={styles.qaLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

// ── Onboarding card ────────────────────────────────────────────────────────
function OnboardingCard({ num, title, subtitle, ctaLabel, onCta, onDone }: {
  num: string; title: string; subtitle: string; ctaLabel: string; onCta: () => void; onDone: () => void;
}) {
  return (
    <View style={styles.onboardingCard}>
      <Text style={styles.onboardingTitle}>{num}. {title}</Text>
      <Text style={styles.onboardingSub}>{subtitle}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <TouchableOpacity onPress={onCta}>
          <Text style={styles.onboardingCta}>{ctaLabel} →</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDone}>
          <Text style={styles.onboardingDone}>Mark done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function VendorTodayScreen() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [session,     setSession]     = useState<any>(null);
  const [data,        setData]        = useState<TodayData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [nudge,       setNudge]       = useState<{ text: string; query: string } | null>(null);
  const [clientCount, setClientCount] = useState(-1);
  const [createdAt,   setCreatedAt]   = useState<string | null>(null);

  // Onboarding card state — persisted
  const [card1Done, setCard1Done] = useState(false);
  const [card2Done, setCard2Done] = useState(false);
  const [card3Done, setCard3Done] = useState(false);
  const [waDismissed, setWaDismissed] = useState(false);

  // First-login intro modal
  const [showIntro,     setShowIntro]     = useState(false);
  const [introDismissed, setIntroDismissed] = useState(false);

  const fetchAll = useCallback(async (s: any) => {
    if (!s?.vendorId && !s?.id) return;
    const vid = s.vendorId || s.id;
    setLoading(true);

    try {
      const [todayRes, contextRes, vendorRes, clientsRes] = await Promise.allSettled([
        fetch(`${API}/api/v2/vendor/today/${vid}`).then(r => r.json()),
        fetch(`${API}/api/v2/dreamai/vendor-context/${vid}`).then(r => r.json()),
        fetch(`${API}/api/vendors/${vid}`).then(r => r.json()),
        fetch(`${API}/api/v2/vendor/clients/${vid}`).then(r => r.json()),
      ]);

      if (todayRes.status === 'fulfilled') setData(todayRes.value);

      if (contextRes.status === 'fulfilled') {
        const ctx = contextRes.value;
        if (ctx.overdue_invoices?.length > 0) {
          const total = ctx.overdue_invoices.reduce((s: number, i: any) => s + (i.amount || 0), 0);
          const n = ctx.overdue_invoices.length;
          setNudge({ text: `Rs ${total.toLocaleString('en-IN')} outstanding from ${n} client${n > 1 ? 's' : ''}.`, query: "Who owes me money?" });
        } else if (ctx.enquiries?.length > 0) {
          const n = ctx.enquiries.length;
          setNudge({ text: `${n} new enquir${n > 1 ? 'ies' : 'y'} need your attention.`, query: "Draft a reply to my latest enquiry" });
        } else {
          setNudge({ text: 'Your calendar looks clear for the next 30 days.', query: "What does my schedule look like?" });
        }
      }

      if (vendorRes.status === 'fulfilled') {
        const vd = vendorRes.value;
        if (vd.data?.created_at) setCreatedAt(vd.data.created_at);
      }

      if (clientsRes.status === 'fulfilled') {
        setClientCount((clientsRes.value.data || []).length);
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function init() {
        const s = await getVendorSession();
        if (cancelled || !s) { router.replace('/'); return; }
        setSession(s);

        // Load persisted onboarding state
        const [c1, c2, c3, wa] = await Promise.all([
          AsyncStorage.getItem('vendor_card1_done'),
          AsyncStorage.getItem('vendor_card2_done'),
          AsyncStorage.getItem('vendor_card3_done'),
          AsyncStorage.getItem('vendor_wa_dismissed'),
        ]);
        if (!cancelled) {
          setCard1Done(c1 === 'true');
          setCard2Done(c2 === 'true');
          setCard3Done(c3 === 'true');
          setWaDismissed(wa === 'true');
        }

        // First login intro
        const seen = await AsyncStorage.getItem('vendor_intro_seen');
        if (!seen && !cancelled) {
          setShowIntro(true);
          await AsyncStorage.setItem('vendor_intro_seen', 'true');
        }

        if (!cancelled) await fetchAll(s);

        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
      init();
      return () => { cancelled = true; };
    }, [])
  );

  const firstName = (session?.vendorName || session?.name || 'Maker').split(' ')[0];
  const attention = data?.needs_attention || [];
  const schedule  = data?.todays_schedule || [];
  const summary   = data?.this_week_summary || '';
  const snap      = data?.snapshot || { views: 0, saves: 0, enquiries: 0, views_delta: 0, saves_delta: 0, enquiries_delta: 0 };

  const daysSinceSignup = createdAt ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000) : null;
  const isNewVendor = daysSinceSignup !== null && daysSinceSignup < 14 && clientCount === 0;
  const showOnboarding = isNewVendor && !(card1Done && card2Done && card3Done);
  const showUrgency = daysSinceSignup !== null && daysSinceSignup >= 8 && daysSinceSignup <= 10;
  const showGentleNudge = daysSinceSignup !== null && daysSinceSignup > 10;

  const TIPS = [
    { title: 'DreamAi on WhatsApp', desc: 'Run your entire business from WhatsApp.' },
    { title: 'Payment Shield',      desc: 'Secure your final payment before the wedding day.' },
    { title: 'WhatsApp Broadcast',  desc: 'Message all your clients at once with one tap.' },
    { title: 'How Couples See You', desc: 'Your photos do the selling — names come later.' },
    { title: 'Client Progress Ring', desc: 'Watch each client move from enquiry to final payment.' },
    { title: 'GST Invoicing',       desc: 'Every invoice auto-calculates CGST and SGST.' },
    { title: 'Block Your Calendar', desc: 'Block dates the moment you confirm a booking.' },
    { title: 'Referral Discounts',  desc: 'Refer couples and earn subscription discounts.' },
    { title: 'Collab Hub',          desc: 'Post when you need a vendor or find work from others.' },
    { title: 'Image Hub',           desc: 'Make your photos catalogue-worthy before submitting.' },
  ];
  const showTip = daysSinceSignup !== null && daysSinceSignup < 30;
  const todaysTip = showTip && daysSinceSignup !== null ? TIPS[daysSinceSignup % TIPS.length] : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── First-login intro modal ────────────────────────────────────── */}
      {showIntro && !introDismissed && (
        <View style={styles.introOverlay}>
          <View style={styles.introSheet}>
            <View style={styles.introHandle} />
            <Text style={styles.introWordmark}>THE DREAM WEDDING</Text>
            <Text style={styles.introHeading}>Welcome, {firstName}.</Text>
            <Text style={styles.introTagline}>Your CRM is live. Discovery works differently here.</Text>
            <View style={styles.introDivider} />
            {[
              { num: '1', text: 'Basic info & 4 photos', sub: 'Unlocks your Discovery profile' },
              { num: '2', text: 'Complete bio & vibe tags', sub: 'Unlocks your Submit button' },
              { num: '3', text: 'Our team reviews and lists you', sub: 'You go live on couple discovery' },
            ].map(step => (
              <View key={step.num} style={styles.introStep}>
                <Text style={styles.introStepNum}>{step.num}</Text>
                <View>
                  <Text style={styles.introStepText}>{step.text}</Text>
                  <Text style={styles.introStepSub}>{step.sub.toUpperCase()}</Text>
                </View>
              </View>
            ))}
            <View style={styles.introDivider} />
            <Text style={styles.introFooter}>The CRM is yours from Day 1. Discovery is earned.</Text>
            <TouchableOpacity
              style={styles.introCta}
              activeOpacity={0.85}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setIntroDismissed(true); }}
            >
              <Text style={styles.introCtaText}>GOT IT — LET'S START →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero greeting ────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <Text style={styles.heroGreeting}>{getGreeting()}, {firstName}.</Text>
          {loading
            ? <Shimmer h={14} w={180} br={4} mt={4} />
            : <Text style={styles.heroSub}>{attentionCount(attention.length)}</Text>
          }
        </View>

        {/* ── Quick actions ────────────────────────────────────────────── */}
        <QuickActions
          category={session?.category}
          onDreamAi={() => router.push('/(vendor)/dreamai')}
        />

        {/* ── DreamAi nudge card ───────────────────────────────────────── */}
        {nudge && (
          <TouchableOpacity
            style={styles.nudgeCard}
            activeOpacity={0.85}
            onPress={() => router.push('/(vendor)/dreamai')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Text style={styles.nudgeStar}>❖</Text>
              <Text style={styles.nudgeText}>{nudge.text}</Text>
            </View>
            <Text style={styles.nudgeCta}>ASK →</Text>
          </TouchableOpacity>
        )}

        {/* ── 10-day urgency banner ────────────────────────────────────── */}
        {showUrgency && (
          <View style={[styles.card, styles.urgencyCard]}>
            <Text style={styles.urgencyLabel}>DISCOVERY WINDOW</Text>
            <Text style={styles.urgencyTitle}>
              Your profile window closes in {10 - (daysSinceSignup || 0)} day{10 - (daysSinceSignup || 0) !== 1 ? 's' : ''}.
            </Text>
            <Text style={styles.urgencySub}>Complete your bio and submit for Discovery.</Text>
            <TouchableOpacity onPress={() => router.push('/(vendor)/studio')}>
              <Text style={styles.urgencyCta}>COMPLETE NOW →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Post-10-day gentle nudge ─────────────────────────────────── */}
        {showGentleNudge && !showUrgency && (
          <View style={[styles.card, styles.gentleNudge]}>
            <Text style={styles.gentleNudgeText}>Ready to go live? Your Discovery profile is waiting.</Text>
            <TouchableOpacity onPress={() => router.push('/(vendor)/studio')}>
              <Text style={styles.gentleNudgeCta}>SUBMIT →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── WhatsApp DreamAi card ────────────────────────────────────── */}
        {!waDismissed && (
          <View style={styles.waCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Text style={styles.waTitle}>DreamAi on WhatsApp</Text>
              <View style={styles.waBetaBadge}><Text style={styles.waBetaText}>BETA</Text></View>
            </View>
            <Text style={styles.waNumber}>+1 478 778 8550</Text>
            <Text style={styles.waHint}>Send: "What can you do?"</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity style={styles.waBtn}>
                <Text style={styles.waBtnText}>OPEN WHATSAPP →</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={async () => { await AsyncStorage.setItem('vendor_wa_dismissed', 'true'); setWaDismissed(true); }}>
                <Text style={styles.waDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── New vendor onboarding banner ─────────────────────────────── */}
        {showOnboarding && (
          <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
            <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>THREE THINGS TO DO RIGHT NOW</Text>
            {!card1Done && (
              <OnboardingCard
                num="1" title="Add your first client"
                subtitle="Start tracking your bookings and revenue."
                ctaLabel="GO TO CLIENTS"
                onCta={() => router.push('/(vendor)/clients')}
                onDone={async () => { await AsyncStorage.setItem('vendor_card1_done', 'true'); setCard1Done(true); }}
              />
            )}
            {!card2Done && (
              <OnboardingCard
                num="2" title="Block your booked dates"
                subtitle="Keep your calendar accurate. Never double-book."
                ctaLabel="OPEN CALENDAR"
                onCta={() => router.push('/(vendor)/studio')}
                onDone={async () => { await AsyncStorage.setItem('vendor_card2_done', 'true'); setCard2Done(true); }}
              />
            )}
            {!card3Done && (
              <OnboardingCard
                num="3" title="Control TDW through WhatsApp"
                subtitle="Add clients, create invoices, check revenue — all by text."
                ctaLabel="OPEN WHATSAPP"
                onCta={() => {}}
                onDone={async () => { await AsyncStorage.setItem('vendor_card3_done', 'true'); setCard3Done(true); }}
              />
            )}
          </View>
        )}

        {/* ── Needs Your Attention ──────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          <SectionLabel label="NEEDS YOUR ATTENTION" />
          {loading ? (
            <><Shimmer h={90} br={8} mt={14} /><Shimmer h={90} br={8} mt={10} /><Shimmer h={90} br={8} mt={10} /></>
          ) : attention.length === 0 ? (
            <Text style={styles.emptyItalic}>All clear for now.</Text>
          ) : (
            attention.slice(0, 3).map(item => (
              <AttentionCard
                key={item.id}
                item={item}
                onPress={() => {
                  Haptics.selectionAsync();
                  if (item.type === 'invoice') router.push('/(vendor)/money');
                  else if (item.type === 'enquiry') router.push('/(vendor)/clients');
                  else router.push('/(vendor)/studio');
                }}
              />
            ))
          )}
        </View>

        {/* ── Today's Schedule ─────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          <SectionLabel label="TODAY'S SCHEDULE" />
          {loading ? (
            <><Shimmer h={48} br={4} mt={14} /><Shimmer h={48} br={4} mt={2} /></>
          ) : schedule.length === 0 ? (
            <Text style={styles.emptyItalic}>Nothing scheduled today.</Text>
          ) : (
            schedule.map((item, i) => (
              <View key={item.id} style={[
                styles.scheduleRow,
                i < schedule.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: BORDER },
              ]}>
                <Text style={styles.scheduleTime}>{item.time}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleEvent}>{item.event_name}</Text>
                  {item.client_name ? <Text style={styles.scheduleClient}>{item.client_name}</Text> : null}
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── This Week ────────────────────────────────────────────────── */}
        {(loading || !!summary) && (
          <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
            <SectionLabel label="THIS WEEK" />
            {loading
              ? <Shimmer h={16} w="75%" br={4} mt={10} />
              : <Text style={styles.summaryText}>{summary}</Text>
            }
          </View>
        )}

        {/* ── Discovery Snapshot ───────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <SectionLabel label="DISCOVERY SNAPSHOT" />
          {loading ? (
            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              {[0,1,2].map(i => (
                <View key={i} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
                  <Shimmer h={32} w={48} br={4} />
                  <Shimmer h={8}  w={40} br={4} />
                  <Shimmer h={10} w={64} br={4} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.snapshotCard}>
              <SnapNum label="Views"     value={snap.views}     delta={snap.views_delta} />
              <View style={styles.snapDivider} />
              <SnapNum label="Saves"     value={snap.saves}     delta={snap.saves_delta} />
              <View style={styles.snapDivider} />
              <SnapNum label="Enquiries" value={snap.enquiries} delta={snap.enquiries_delta} />
            </View>
          )}
        </View>

        {/* ── Tip of the Day ───────────────────────────────────────────── */}
        {todaysTip && (
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
            <View style={styles.tipDivider} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.tipLabel}>❖ TIP</Text>
              <Text style={styles.tipText} numberOfLines={2}>
                <Text style={styles.tipTitle}>{todaysTip.title}</Text>
                {' — '}{todaysTip.desc.length > 55 ? todaysTip.desc.slice(0, 55) + '...' : todaysTip.desc}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(vendor)/studio')}>
                <Text style={styles.tipMore}>More →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── DreamAi bar ──────────────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.dreamaiBar}
          activeOpacity={0.85}
          onPress={() => router.push('/(vendor)/dreamai')}
        >
          <Text style={styles.dreamaiStar}>❖</Text>
          <Text style={styles.dreamaiLabel}>DreamAi</Text>
          <Text style={styles.dreamaiPlaceholder}>Ask anything about your business...</Text>
        </TouchableOpacity>

        {/* DEV SIGN OUT */}
        <TouchableOpacity
          style={{ alignItems: 'center', marginTop: 32 }}
          onPress={async () => { await clearVendorSession(); router.replace('/'); }}
        >
          <Text style={{ fontFamily: DM300, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: GOLD, opacity: 0.4 }}>
            SIGN OUT
          </Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Intro modal
  introOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 400, backgroundColor: 'rgba(12,10,9,0.85)',
    justifyContent: 'flex-end',
  },
  introSheet: {
    backgroundColor: '#0C0A09', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 32, borderWidth: 1, borderColor: '#2A2825',
  },
  introHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#2A2825', alignSelf: 'center', marginBottom: 24 },
  introWordmark: { fontFamily: JOST, fontSize: 9, letterSpacing: 5, textTransform: 'uppercase', color: '#555250', textAlign: 'center', marginBottom: 16 },
  introHeading: { fontFamily: CG300, fontSize: 28, color: '#F8F7F5', textAlign: 'center', marginBottom: 6 },
  introTagline: { fontFamily: DM300, fontSize: 13, color: '#555250', textAlign: 'center', marginBottom: 24 },
  introDivider: { height: 0.5, backgroundColor: '#2A2825', marginBottom: 20 },
  introStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  introStepNum: { fontFamily: CG300, fontSize: 22, color: GOLD, flexShrink: 0 },
  introStepText: { fontFamily: DM300, fontSize: 14, color: '#F8F7F5', marginBottom: 2 },
  introStepSub: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, color: GOLD },
  introFooter: { fontFamily: CG300, fontSize: 15, fontStyle: 'italic', color: '#555250', textAlign: 'center', marginBottom: 24 },
  introCta: { height: 52, backgroundColor: GOLD, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  introCtaText: { fontFamily: JOST, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: INK },

  // Hero
  hero: { paddingHorizontal: 20, paddingTop: 24, marginBottom: 32 },
  heroGreeting: { fontFamily: CG300, fontSize: 32, color: DARK, marginBottom: 6, lineHeight: 38 },
  heroSub: { fontFamily: DM300, fontSize: 13, color: MUTED },

  // Section label
  sectionLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: MUTED, marginBottom: 14 },

  // Quick actions
  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    height: 38, paddingHorizontal: 14,
    backgroundColor: DARK, borderWidth: 1, borderColor: GOLD,
    borderRadius: 100,
  },
  qaIcon: { fontSize: 12, color: GOLD },
  qaLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: CREAM },

  // Nudge card
  nudgeCard: {
    marginHorizontal: 20, marginBottom: 24,
    backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER,
    borderLeftWidth: 3, borderLeftColor: GOLD,
    borderRadius: 8, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  nudgeStar: { fontSize: 13, color: GOLD, flexShrink: 0 },
  nudgeText: { fontFamily: DM300, fontSize: 14, color: DARK, flex: 1, lineHeight: 20 },
  nudgeCta: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, color: GOLD, flexShrink: 0 },

  // Card base
  card: { marginHorizontal: 20, marginBottom: 20, borderRadius: 12, padding: 16 },

  // Urgency
  urgencyCard: { backgroundColor: CARD, borderWidth: 1.5, borderColor: GOLD },
  urgencyLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, marginBottom: 6 },
  urgencyTitle: { fontFamily: DM300, fontSize: 14, color: DARK, marginBottom: 4, lineHeight: 21 },
  urgencySub: { fontFamily: DM300, fontSize: 13, color: MUTED, marginBottom: 14 },
  urgencyCta: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD },

  // Gentle nudge
  gentleNudge: {
    backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  gentleNudgeText: { fontFamily: DM300, fontSize: 13, color: '#555250', flex: 1 },
  gentleNudgeCta: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: GOLD, flexShrink: 0, marginLeft: 12 },

  // WhatsApp card
  waCard: {
    marginHorizontal: 20, marginBottom: 4,
    backgroundColor: DARK, borderRadius: 12, padding: 16,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)',
  },
  waTitle: { fontFamily: DM300, fontSize: 13, color: '#F8F7F5' },
  waBetaBadge: { backgroundColor: 'rgba(201,168,76,0.1)', borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 },
  waBetaText: { fontFamily: JOST, fontSize: 7, letterSpacing: 2, color: GOLD },
  waNumber: { fontFamily: CG300, fontSize: 20, color: GOLD, marginTop: 10, marginBottom: 2, letterSpacing: 1 },
  waHint: { fontFamily: DM300, fontSize: 11, color: 'rgba(248,247,245,0.45)' },
  waBtn: { borderWidth: 0.5, borderColor: GOLD, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8 },
  waBtnText: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: GOLD },
  waDismiss: { fontFamily: JOST, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(248,247,245,0.25)', paddingVertical: 8 },

  // Onboarding card
  onboardingCard: {
    backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER,
    borderLeftWidth: 3, borderLeftColor: GOLD,
    borderRadius: 8, padding: 16, marginBottom: 10,
  },
  onboardingTitle: { fontFamily: CG300, fontSize: 18, color: DARK, marginBottom: 4 },
  onboardingSub: { fontFamily: DM300, fontSize: 13, color: MUTED },
  onboardingCta: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD },
  onboardingDone: { fontFamily: JOST, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: '#C8C4BE' },

  // Attention card
  attentionCard: {
    borderWidth: 0.5, borderColor: BORDER,
    borderRadius: 8, padding: 16, marginBottom: 10,
  },
  attentionTitle: { fontFamily: CG300, fontSize: 17, color: DARK, flex: 1, lineHeight: 22, paddingRight: 12 },
  attentionAmount: { fontFamily: JOST, fontSize: 12, color: GOLD, flexShrink: 0 },
  attentionSubtitle: { fontFamily: DM300, fontSize: 13, color: MUTED, lineHeight: 19 },
  attentionCta: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase' },
  overdueTag: { backgroundColor: 'rgba(201,168,76,0.08)', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  overdueTagText: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, color: GOLD },

  // Schedule
  scheduleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 16, paddingVertical: 12 },
  scheduleTime: { fontFamily: JOST, fontSize: 11, color: MUTED, flexShrink: 0, minWidth: 44 },
  scheduleEvent: { fontFamily: CG300, fontSize: 17, color: DARK, marginBottom: 2 },
  scheduleClient: { fontFamily: DM300, fontSize: 12, color: MUTED },

  // This week
  summaryText: { fontFamily: DM300, fontSize: 14, color: '#555250', marginTop: 10, lineHeight: 21 },

  // Snapshot
  snapshotCard: {
    backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER,
    borderRadius: 8, paddingVertical: 20, flexDirection: 'row', marginTop: 14,
  },
  snapValue: { fontFamily: CG300, fontSize: 32, color: DARK, lineHeight: 34, textAlign: 'center' },
  snapLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, color: MUTED, textAlign: 'center', marginVertical: 2 },
  snapDelta: { fontFamily: DM300, fontSize: 11, color: MUTED, textAlign: 'center' },
  snapDivider: { width: 0.5, backgroundColor: BORDER, alignSelf: 'stretch' },

  // Tip
  tipDivider: { height: 0.5, backgroundColor: BORDER, marginBottom: 12 },
  tipLabel: { fontFamily: JOST, fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: GOLD },
  tipText: { fontFamily: DM300, fontSize: 12, color: MUTED, flex: 1, lineHeight: 17 },
  tipTitle: { fontFamily: DM400, fontSize: 12, color: '#555250' },
  tipMore: { fontFamily: JOST, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: GOLD, flexShrink: 0 },

  // DreamAi bar
  dreamaiBar: {
    marginHorizontal: 20, marginTop: 16,
    backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER,
    borderRadius: 12, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  dreamaiStar: { fontSize: 13, color: GOLD },
  dreamaiLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: MUTED, marginRight: 4 },
  dreamaiPlaceholder: { fontFamily: DM300, fontSize: 13, color: '#C8C4BE', fontStyle: 'italic' },

  // Empty
  emptyItalic: { fontFamily: DM300, fontSize: 14, fontStyle: 'italic', color: MUTED, marginTop: 14 },
});
