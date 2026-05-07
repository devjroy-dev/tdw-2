/**
 * app/(vendor)/today.tsx
 * Exact native port of web/app/vendor/today/page.tsx
 *
 * Colours: BG #F8F7F5, CARD #FFFFFF, WARM #F4F1EC, GOLD #C9A84C, INK #0C0A09
 * Quick actions route correctly to calendar, broadcast, leads, clients, money
 * DreamAi nudge → router.push('/(vendor)/dreamai')
 * Discovery nudges → router.push('/(vendor)/discovery')
 * Tip of day → router.push('/(vendor)/studio/settings')
 * Onboarding card 2 → router.push('/(vendor)/studio/calendar')
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Easing, Linking,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RAILWAY_URL } from '../../constants/tokens';
import { getVendorSession, clearVendorSession } from '../../utils/session';

const API   = RAILWAY_URL;
const BG    = '#F8F7F5';
const CARD  = '#FFFFFF';
const WARM  = '#F4F1EC';
const GOLD  = '#C9A84C';
const INK   = '#0C0A09';
const DARK  = '#111111';
const MUTED = '#8C8480';
const BORDER = '#E2DED8';
const PEAK  = '#FF6B35';

const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
const DM400 = 'DMSans_400Regular';
const JOST  = 'Jost_300Light';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AttentionItem {
  id: string; type: 'invoice' | 'enquiry' | 'shoot' | 'hot_date';
  title: string; subtitle: string; amount?: number; cta: string; intensity?: string;
}
interface ScheduleItem { id: string; time: string; event_name: string; client_name?: string; }
interface Snapshot { views: number; saves: number; enquiries: number; views_delta: number; saves_delta: number; enquiries_delta: number; }
interface TodayData { needs_attention: AttentionItem[]; todays_schedule: ScheduleItem[]; this_week_summary: string; snapshot: Snapshot; }
interface DreamAiContext { overdue_invoices?: { client_name: string; amount: number }[]; enquiries?: { id: string }[]; }

// ── Helpers ───────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
function fmtINR(n: number) { return '₹' + n.toLocaleString('en-IN'); }
function initials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
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

// ── Shimmer ───────────────────────────────────────────────────────────────────
function Shimmer({ height = 90, width = '100%', br = 8, mt = 0 }: { height?: number; width?: number | string; br?: number; mt?: number }) {
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
  return (
    <Animated.View style={{ height, width: width as any, borderRadius: br, marginTop: mt, backgroundColor: '#EEEBE6', opacity }} />
  );
}

// ── Attention Card ────────────────────────────────────────────────────────────
function AttentionCard({ item, onCalendar }: { item: AttentionItem; onCalendar: () => void }) {
  const isOverdue = item.type === 'invoice';
  const isHotDate = item.type === 'hot_date';
  const hotColour = item.intensity === 'peak' ? PEAK : GOLD;
  const hotBg     = item.intensity === 'peak' ? 'rgba(255,107,53,0.06)' : 'rgba(201,168,76,0.06)';
  return (
    <View style={[
      styles.attCard,
      { backgroundColor: isHotDate ? hotBg : CARD },
      isHotDate
        ? { borderLeftWidth: 3, borderLeftColor: hotColour, borderWidth: 0.5, borderColor: BORDER }
        : { borderWidth: 0.5, borderColor: BORDER },
    ]}>
      <View style={styles.attCardTop}>
        <Text style={styles.attCardTitle}>{item.title}</Text>
        {isOverdue && item.amount && (
          <Text style={styles.attCardAmount}>{fmtINR(item.amount)}</Text>
        )}
      </View>
      <Text style={styles.attCardSub}>{item.subtitle}</Text>
      <View style={styles.attCardBottom}>
        {isOverdue && (
          <View style={styles.overduePill}>
            <Text style={styles.overduePillText}>OVERDUE</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={isHotDate ? onCalendar : undefined}
          style={{ marginLeft: isOverdue ? 0 : 'auto' as any }}
          activeOpacity={isHotDate ? 0.7 : 1}
        >
          <Text style={[styles.attCardCta, { color: isHotDate ? hotColour : '#555250' }]}>
            {item.cta} →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Snapshot number ───────────────────────────────────────────────────────────
function SnapNum({ label, value, delta }: { label: string; value: number; delta: number }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.snapValue}>{value}</Text>
      <Text style={styles.snapLabel}>{label}</Text>
      <Text style={styles.snapDelta}>{deltaLabel(delta)}</Text>
    </View>
  );
}

// ── WhatsApp card ─────────────────────────────────────────────────────────────
function WhatsAppCard({ onDismiss }: { onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={styles.waCard}>
      <TouchableOpacity
        style={styles.waCardHeader}
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.8}
      >
        <View style={styles.waCardHeaderLeft}>
          <Text style={{ fontSize: 14 }}>💬</Text>
          <Text style={styles.waCardTitle}>DreamAi on WhatsApp</Text>
          <View style={styles.betaBadge}><Text style={styles.betaText}>Beta</Text></View>
        </View>
        <Text style={[styles.waChevron, expanded && { transform: [{ rotate: '180deg' }] }]}>⌄</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.waCardBody}>
          <Text style={styles.waStep}>STEP 1 — SAVE THE NUMBER</Text>
          <Text style={styles.waNumber}>+1 478 778 8550</Text>
          <Text style={styles.waStep}>STEP 2 — TRY IT</Text>
          <Text style={styles.waHint}>
            Send: <Text style={{ color: '#F8F7F5' }}>"What can you do?"</Text>
          </Text>
          <View style={styles.waActions}>
            <TouchableOpacity
              style={styles.waBtn}
              onPress={() => Linking.openURL('https://wa.me/14787788550')}
              activeOpacity={0.85}
            >
              <Text style={styles.waBtnText}>Open WhatsApp →</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onDismiss}>
              <Text style={styles.waDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ── Tips ──────────────────────────────────────────────────────────────────────
const TIPS = [
  { id: 'dreamai_whatsapp',  title: 'DreamAi on WhatsApp',  desc: 'Run your entire business from WhatsApp.' },
  { id: 'payment_shield',    title: 'Payment Shield',        desc: 'Secure your final payment before the wedding day.' },
  { id: 'broadcast',         title: 'WhatsApp Broadcast',    desc: 'Message all your clients at once with one tap.' },
  { id: 'discovery_profile', title: 'How Couples See You',   desc: 'Your photos do the selling — names come later.' },
  { id: 'progress_ring',     title: 'Client Progress Ring',  desc: 'Watch each client move from enquiry to final payment.' },
  { id: 'gst_invoice',       title: 'GST Invoicing',         desc: 'Every invoice auto-calculates CGST and SGST.' },
  { id: 'block_dates',       title: 'Block Your Calendar',   desc: 'Block dates the moment you confirm a booking.' },
  { id: 'referral',          title: 'Referral Discounts',    desc: 'Refer couples and earn subscription discounts.' },
  { id: 'collab_hub',        title: 'Collab Hub',            desc: 'Post when you need a vendor or find work from others.' },
  { id: 'image_hub',         title: 'Image Hub',             desc: 'Make your photos catalogue-worthy before submitting.' },
];

// ── Main screen ───────────────────────────────────────────────────────────────
export default function VendorTodayScreen() {
  const insets = useSafeAreaInsets();

  const [session,         setSession]         = useState<any>(null);
  const [data,            setData]            = useState<TodayData | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [aiContext,       setAiContext]        = useState<DreamAiContext | null>(null);
  const [nudge,           setNudge]           = useState<{ text: string; query: string } | null>(null);
  const [vendorCreatedAt, setVendorCreatedAt] = useState<string | null>(null);
  const [clientCount,     setClientCount]     = useState(-1);
  const [showIntro,       setShowIntro]       = useState(false);
  const [introDismissed,  setIntroDismissed]  = useState(false);
  const [showWa,          setShowWa]          = useState(false);
  const [card1Done,       setCard1Done]       = useState(false);
  const [card2Done,       setCard2Done]       = useState(false);
  const [card3Done,       setCard3Done]       = useState(false);

  const introAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    getVendorSession().then(async (s: any) => {
      if (!s?.id && !s?.vendorId) { router.replace('/'); return; }
      setSession(s);
      const vid = s.vendorId || s.id;

      // Load AsyncStorage flags
      const [waDismissed, card1, card2, card3, introSeen] = await Promise.all([
        AsyncStorage.getItem('vendor_wa_dismissed'),
        AsyncStorage.getItem('vendor_card1_done'),
        AsyncStorage.getItem('vendor_card2_done'),
        AsyncStorage.getItem('vendor_card3_done'),
        AsyncStorage.getItem('vendor_intro_seen'),
      ]);
      setShowWa(!waDismissed);
      setCard1Done(!!card1);
      setCard2Done(!!card2);
      setCard3Done(!!card3);
      if (!introSeen) {
        setShowIntro(true);
        AsyncStorage.setItem('vendor_intro_seen', 'true');
        Animated.timing(introAnim, { toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      }

      // Fetch data
      fetch(`${API}/api/v2/vendor/today/${vid}`)
        .then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));

      fetch(`${API}/api/v2/dreamai/vendor-context/${vid}`)
        .then(r => r.json()).then(json => {
          setAiContext(json);
          if (json.overdue_invoices?.length > 0) {
            const total = json.overdue_invoices.reduce((s: number, i: any) => s + (i.amount || 0), 0);
            const n = json.overdue_invoices.length;
            setNudge({ text: `₹${total.toLocaleString('en-IN')} outstanding from ${n} client${n > 1 ? 's' : ''}.`, query: "Who owes me money?" });
          } else if (json.enquiries?.length > 0) {
            const n = json.enquiries.length;
            setNudge({ text: `${n} new enquir${n > 1 ? 'ies' : 'y'} need your attention.`, query: "Draft a reply to my latest enquiry" });
          } else {
            setNudge({ text: 'Your calendar looks clear for the next 30 days.', query: "What does my schedule look like?" });
          }
        }).catch(() => {});

      fetch(`${API}/api/vendors/${vid}`)
        .then(r => r.json()).then(d => { if (d.data?.created_at) setVendorCreatedAt(d.data.created_at); }).catch(() => {});

      fetch(`${API}/api/v2/vendor/clients/${vid}`)
        .then(r => r.json()).then(d => setClientCount((d.data || []).length)).catch(() => setClientCount(0));
    });
  }, []);

  // Refresh on focus
  useFocusEffect(useCallback(() => {
    if (!session) return;
    const vid = session.vendorId || session.id;
    fetch(`${API}/api/v2/vendor/today/${vid}`)
      .then(r => r.json()).then(d => setData(d)).catch(() => {});
  }, [session]));

  if (!session) return null;

  const firstName = (session.vendorName || session.name || 'Maker').split(' ')[0];
  const attention = data?.needs_attention || [];
  const schedule  = data?.todays_schedule || [];
  const summary   = data?.this_week_summary || '';
  const snap      = data?.snapshot || { views: 0, saves: 0, enquiries: 0, views_delta: 0, saves_delta: 0, enquiries_delta: 0 };

  const daysSinceSignup = vendorCreatedAt
    ? Math.floor((Date.now() - new Date(vendorCreatedAt).getTime()) / 86400000)
    : null;
  const isNewVendor      = daysSinceSignup !== null && daysSinceSignup < 14 && clientCount === 0;
  const showOnboarding   = isNewVendor && clientCount === 0;
  const showUrgency      = daysSinceSignup !== null && daysSinceSignup >= 8 && daysSinceSignup <= 10;
  const showGentleNudge  = daysSinceSignup !== null && daysSinceSignup > 10;
  const showTip          = daysSinceSignup !== null && daysSinceSignup < 30;
  const todaysTip        = showTip ? TIPS[daysSinceSignup! % TIPS.length] : null;

  const category = (session.category || '').toLowerCase();
  const categoryAction = ({
    photographer:  { label: 'Add Shoot',    icon: '◈', onTap: () => router.push('/(vendor)/studio/calendar' as any) },
    videographer:  { label: 'Add Shoot',    icon: '◈', onTap: () => router.push('/(vendor)/studio/calendar' as any) },
    mua:           { label: 'Add Trial',    icon: '◎', onTap: () => router.push('/(vendor)/clients' as any) },
    decorator:     { label: 'Site Visit',   icon: '⬡', onTap: () => router.push('/(vendor)/studio/calendar' as any) },
    venue:         { label: 'Book Tour',    icon: '⬡', onTap: () => router.push('/(vendor)/clients' as any) },
    event_manager: { label: 'New Brief',    icon: '◐', onTap: () => router.push('/(vendor)/clients' as any) },
    choreographer: { label: 'Book Session', icon: '◉', onTap: () => router.push('/(vendor)/studio/calendar' as any) },
    mehendi:       { label: 'Add Booking',  icon: '✦', onTap: () => router.push('/(vendor)/clients' as any) },
    caterer:       { label: 'Menu Call',    icon: '◻', onTap: () => router.push('/(vendor)/clients' as any) },
    designer:      { label: 'Book Fitting', icon: '◎', onTap: () => router.push('/(vendor)/clients' as any) },
    jeweller:      { label: 'Book Viewing', icon: '◎', onTap: () => router.push('/(vendor)/clients' as any) },
  } as Record<string, any>)[category] || { label: 'Add Task', icon: '◐', onTap: () => router.push('/(vendor)/studio/calendar' as any) };

  const quickActions = [
    { label: 'New Client',  icon: '＋', onTap: () => router.push('/(vendor)/clients' as any) },
    { label: 'New Invoice', icon: '₹',  onTap: () => router.push('/(vendor)/money' as any) },
    { label: 'Block Date',  icon: '◻',  onTap: () => router.push('/(vendor)/studio/calendar' as any) },
    { label: 'Ask DreamAi', icon: '✦',  onTap: () => router.push('/(vendor)/dreamai' as any) },
    { label: 'Broadcast',   icon: '◉',  onTap: () => router.push('/(vendor)/studio/broadcast' as any) },
    { label: 'Leads',       icon: '↗',  onTap: () => router.push('/(vendor)/discovery-leads' as any) },
    categoryAction,
  ];

  return (
    <View style={[styles.root, { paddingTop: 0 }]}>

      {/* First-login intro modal */}
      {showIntro && !introDismissed && (
        <View style={styles.introOverlay}>
          <Animated.View style={[styles.introSheet, { transform: [{ translateY: introAnim }] }]}>
            <View style={styles.introHandle} />
            <Text style={styles.introWordmark}>THE DREAM WEDDING</Text>
            <Text style={styles.introHeading}>Welcome, {firstName}.</Text>
            <Text style={styles.introSub}>Your CRM is live. Discovery works differently here.</Text>
            <View style={styles.introDivider} />
            {[
              { num: '①', text: 'Basic info & 4 photos',        sub: 'Unlocks your Discovery profile' },
              { num: '②', text: 'Complete bio & vibe tags',      sub: 'Unlocks your Submit button' },
              { num: '③', text: 'Our team reviews and lists you', sub: 'You go live on couple discovery' },
            ].map(step => (
              <View key={step.num} style={styles.introStep}>
                <Text style={styles.introStepNum}>{step.num}</Text>
                <View>
                  <Text style={styles.introStepText}>{step.text}</Text>
                  <Text style={styles.introStepSub}>{step.sub}</Text>
                </View>
              </View>
            ))}
            <View style={styles.introDivider} />
            <Text style={styles.introTagline}>The CRM is yours from Day 1. Discovery is earned.</Text>
            <TouchableOpacity style={styles.introCta} onPress={() => setIntroDismissed(true)} activeOpacity={0.85}>
              <Text style={styles.introCtaText}>Got it — let's start →</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.greeting}>{getGreeting()}, {firstName}.</Text>
          {loading
            ? <Shimmer height={14} width={180} br={4} />
            : <Text style={styles.attentionLabel}>{attentionCount(attention.length)}</Text>
          }
        </View>

        {/* Quick actions */}
        <View style={styles.quickSection}>
          <Text style={styles.sectionLabel}>QUICK ACTIONS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
            {quickActions.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickPill}
                onPress={() => { Haptics.selectionAsync(); a.onTap(); }}
                activeOpacity={0.8}
              >
                <Text style={styles.quickPillIcon}>{a.icon}</Text>
                <Text style={styles.quickPillLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* DreamAi nudge */}
        {nudge && (
          <View style={styles.sectionPad}>
            <TouchableOpacity
              style={styles.nudgeCard}
              onPress={() => router.push('/(vendor)/dreamai' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.nudgeCardLeft}>
                <Text style={styles.nudgeStar}>✦</Text>
                <Text style={styles.nudgeText}>{nudge.text}</Text>
              </View>
              <Text style={styles.nudgeCta}>ASK →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Urgency banner */}
        {showUrgency && (
          <View style={styles.sectionPad}>
            <View style={[styles.bannerCard, { borderColor: GOLD, borderWidth: 1.5 }]}>
              <Text style={styles.urgencyEyebrow}>DISCOVERY WINDOW</Text>
              <Text style={styles.bannerTitle}>
                Your profile window closes in {10 - (daysSinceSignup || 0)} day{10 - (daysSinceSignup || 0) !== 1 ? 's' : ''}.
              </Text>
              <Text style={styles.bannerSub}>Complete your bio and submit for Discovery — India's first curated digital storefront.</Text>
              <TouchableOpacity onPress={() => router.push('/(vendor)/discovery' as any)}>
                <Text style={styles.bannerCta}>COMPLETE NOW →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Gentle nudge */}
        {showGentleNudge && !showUrgency && (
          <View style={styles.sectionPad}>
            <View style={[styles.bannerCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <Text style={[styles.bannerSub, { margin: 0, flex: 1 }]}>Ready to go live? Your Discovery profile is waiting.</Text>
              <TouchableOpacity onPress={() => router.push('/(vendor)/discovery' as any)} style={{ marginLeft: 12 }}>
                <Text style={styles.bannerCta}>SUBMIT →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* WhatsApp card */}
        {showWa && (
          <View style={styles.sectionPad}>
            <WhatsAppCard onDismiss={async () => {
              await AsyncStorage.setItem('vendor_wa_dismissed', 'true');
              setShowWa(false);
            }} />
          </View>
        )}

        {/* Onboarding 3 cards */}
        {showOnboarding && !(card1Done && card2Done && card3Done) && (
          <View style={styles.sectionPad}>
            <Text style={styles.sectionLabel}>THREE THINGS TO DO RIGHT NOW</Text>

            {!card1Done && (
              <View style={[styles.onboardCard, { marginBottom: 10 }]}>
                <Text style={styles.onboardTitle}>1. Add your first client</Text>
                <Text style={styles.onboardSub}>Start tracking your bookings and revenue.</Text>
                <View style={styles.onboardActions}>
                  <TouchableOpacity onPress={() => router.push('/(vendor)/clients' as any)}>
                    <Text style={styles.onboardCta}>GO TO CLIENTS →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={async () => { await AsyncStorage.setItem('vendor_card1_done', 'true'); setCard1Done(true); }}>
                    <Text style={styles.onboardDone}>Mark done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!card2Done && (
              <View style={[styles.onboardCard, { marginBottom: 10 }]}>
                <Text style={styles.onboardTitle}>2. Block your booked dates</Text>
                <Text style={styles.onboardSub}>Keep your calendar accurate. Never double-book.</Text>
                <View style={styles.onboardActions}>
                  <TouchableOpacity onPress={() => router.push('/(vendor)/studio/calendar' as any)}>
                    <Text style={styles.onboardCta}>OPEN CALENDAR →</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={async () => { await AsyncStorage.setItem('vendor_card2_done', 'true'); setCard2Done(true); }}>
                    <Text style={styles.onboardDone}>Mark done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {!card3Done && (
              <View style={[styles.waCard, { borderColor: GOLD, borderWidth: 1 }]}>
                <TouchableOpacity style={styles.waCardHeader} onPress={() => {}} activeOpacity={0.8}>
                  <View style={styles.waCardHeaderLeft}>
                    <Text style={{ color: GOLD, fontSize: 13 }}>✦</Text>
                    <Text style={styles.waCardTitle}>Control TDW through WhatsApp</Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.waCardBody}>
                  <Text style={[styles.waHint, { marginBottom: 4 }]}>
                    Add clients, create invoices, check revenue — all by text message.
                  </Text>
                  <Text style={styles.waNumber}>+1 478 778 8550</Text>
                  <View style={styles.waActions}>
                    <TouchableOpacity
                      style={[styles.waBtn, { borderWidth: 0.5, borderColor: GOLD, backgroundColor: 'transparent' }]}
                      onPress={async () => {
                        await Linking.openURL('https://wa.me/14787788550');
                        await AsyncStorage.setItem('vendor_card3_done', 'true');
                        setCard3Done(true);
                      }}
                    >
                      <Text style={[styles.waBtnText, { color: GOLD }]}>Open WhatsApp →</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={async () => { await AsyncStorage.setItem('vendor_card3_done', 'true'); setCard3Done(true); }}>
                      <Text style={styles.waDismiss}>Dismiss</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Needs Attention */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>NEEDS YOUR ATTENTION</Text>
          {loading ? (
            <><Shimmer height={90} /><Shimmer height={90} mt={10} /><Shimmer height={90} mt={10} /></>
          ) : attention.length === 0 ? (
            <Text style={styles.emptyText}>All clear for now.</Text>
          ) : (
            attention.slice(0, 3).map(item => (
              <AttentionCard
                key={item.id}
                item={item}
                onCalendar={() => router.push('/(vendor)/studio/calendar' as any)}
              />
            ))
          )}
        </View>

        {/* Today's Schedule */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>TODAY'S SCHEDULE</Text>
          {loading ? (
            <><Shimmer height={48} br={4} /><Shimmer height={48} br={4} mt={2} /></>
          ) : schedule.length === 0 ? (
            <Text style={styles.emptyText}>Nothing scheduled today.</Text>
          ) : (
            schedule.map((item, i) => (
              <View key={item.id} style={[styles.scheduleRow, i < schedule.length - 1 && styles.scheduleRowBorder]}>
                <Text style={styles.scheduleTime}>{item.time}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scheduleEvent}>{item.event_name}</Text>
                  {item.client_name && <Text style={styles.scheduleClient}>{item.client_name}</Text>}
                </View>
              </View>
            ))
          )}
        </View>

        {/* This Week */}
        {(loading || summary) && (
          <View style={styles.sectionPad}>
            <Text style={styles.sectionLabel}>THIS WEEK</Text>
            {loading
              ? <Shimmer height={16} width="75%" br={4} />
              : <Text style={styles.weekSummary}>{summary}</Text>
            }
          </View>
        )}

        {/* Discovery Snapshot */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>DISCOVERY SNAPSHOT</Text>
          {loading ? (
            <View style={{ flexDirection: 'row', gap: 0 }}>
              {[0, 1, 2].map(i => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                  <Shimmer height={32} width={48} br={4} />
                  <Shimmer height={8} width={40} br={4} mt={6} />
                  <Shimmer height={10} width={64} br={4} mt={6} />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.snapCard}>
              <SnapNum label="Views"    value={snap.views}     delta={snap.views_delta} />
              <View style={styles.snapDivider} />
              <SnapNum label="Saves"    value={snap.saves}     delta={snap.saves_delta} />
              <View style={styles.snapDivider} />
              <SnapNum label="Enquiries" value={snap.enquiries} delta={snap.enquiries_delta} />
            </View>
          )}
        </View>

        {/* Tip of the Day */}
        {todaysTip && (
          <View style={styles.sectionPad}>
            <View style={styles.tipDivider} />
            <View style={styles.tipRow}>
              <Text style={styles.tipBadge}>✦ TIP</Text>
              <Text style={styles.tipText} numberOfLines={2}>
                <Text style={styles.tipTitle}>{todaysTip.title}</Text>
                {' — '}{todaysTip.desc.length > 55 ? todaysTip.desc.slice(0, 55) + '...' : todaysTip.desc}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(vendor)/studio/settings' as any)}>
                <Text style={styles.tipMore}>More →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* DreamAi bar */}
        <View style={[styles.sectionPad, { paddingTop: 16 }]}>
          <TouchableOpacity
            style={styles.dreamAiBar}
            onPress={() => router.push('/(vendor)/dreamai' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.dreamAiStar}>✦</Text>
            <Text style={styles.dreamAiLabel}>DreamAi</Text>
            <Text style={styles.dreamAiPlaceholder}>Ask anything about your business...</Text>
          </TouchableOpacity>
        </View>

        {/* Dev sign out */}
        <TouchableOpacity
          style={{ alignItems: 'center', marginTop: 32, marginBottom: 8 }}
          onPress={async () => { await clearVendorSession(); router.replace('/'); }}
        >
          <Text style={{ fontFamily: JOST, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: GOLD, opacity: 0.35 }}>
            SIGN OUT
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Intro modal
  introOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(12,10,9,0.85)', zIndex: 400, justifyContent: 'flex-end' },
  introSheet:    { backgroundColor: INK, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 32, borderWidth: 1, borderColor: '#2A2825' },
  introHandle:   { width: 36, height: 4, borderRadius: 2, backgroundColor: '#2A2825', alignSelf: 'center', marginBottom: 24 },
  introWordmark: { fontFamily: JOST, fontSize: 9, letterSpacing: 5, textTransform: 'uppercase', color: '#555250', textAlign: 'center', marginBottom: 16 },
  introHeading:  { fontFamily: CG300, fontSize: 28, color: '#F8F7F5', textAlign: 'center', marginBottom: 6, lineHeight: 32 },
  introSub:      { fontFamily: DM300, fontSize: 13, color: '#555250', textAlign: 'center', marginBottom: 24 },
  introDivider:  { height: 0.5, backgroundColor: '#2A2825', marginBottom: 20 },
  introStep:     { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  introStepNum:  { fontFamily: CG300, fontSize: 22, color: GOLD, flexShrink: 0, lineHeight: 26 },
  introStepText: { fontFamily: DM300, fontSize: 14, color: '#F8F7F5', marginBottom: 2 },
  introStepSub:  { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: GOLD },
  introTagline:  { fontFamily: CG300, fontSize: 15, fontStyle: 'italic', color: '#555250', textAlign: 'center', marginBottom: 24 },
  introCta:      { height: 52, backgroundColor: GOLD, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  introCtaText:  { fontFamily: JOST, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: INK },

  // Hero
  hero:          { paddingHorizontal: 20, paddingTop: 24, marginBottom: 32 },
  greeting:      { fontFamily: CG300, fontSize: 32, color: DARK, marginBottom: 6, lineHeight: 36 },
  attentionLabel: { fontFamily: DM300, fontSize: 13, color: MUTED },

  // Quick actions
  quickSection:  { paddingLeft: 20, marginBottom: 28 },
  sectionLabel:  { fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: MUTED, marginBottom: 12 },
  quickPill:     { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, backgroundColor: DARK, borderWidth: 1, borderColor: GOLD, borderRadius: 100 },
  quickPillIcon: { fontSize: 12, color: GOLD, lineHeight: 16 },
  quickPillLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#F8F7F5' },

  // Section pad
  sectionPad:    { paddingHorizontal: 20, marginBottom: 32 },

  // Nudge card
  nudgeCard:     { backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER, borderLeftWidth: 3, borderLeftColor: GOLD, borderRadius: 8, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  nudgeCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  nudgeStar:     { fontSize: 13, color: GOLD, flexShrink: 0 },
  nudgeText:     { fontFamily: DM300, fontSize: 14, color: DARK, flex: 1, lineHeight: 20 },
  nudgeCta:      { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, flexShrink: 0 },

  // Banner cards
  bannerCard:    { backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER, borderRadius: 12, padding: 16 },
  urgencyEyebrow: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, marginBottom: 6 },
  bannerTitle:   { fontFamily: DM300, fontSize: 14, color: DARK, marginBottom: 4, lineHeight: 20 },
  bannerSub:     { fontFamily: DM300, fontSize: 13, color: MUTED, marginBottom: 14 },
  bannerCta:     { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD },

  // WhatsApp card
  waCard:        { backgroundColor: INK, borderRadius: 12, overflow: 'hidden', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  waCardHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, paddingHorizontal: 16 },
  waCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  waCardTitle:   { fontFamily: DM300, fontSize: 13, color: '#F8F7F5' },
  betaBadge:     { backgroundColor: 'rgba(201,168,76,0.1)', borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)', borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 },
  betaText:      { fontFamily: JOST, fontSize: 7, letterSpacing: 2, textTransform: 'uppercase', color: GOLD },
  waChevron:     { color: 'rgba(248,247,245,0.4)', fontSize: 14 },
  waCardBody:    { padding: 16, paddingTop: 0, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' },
  waStep:        { fontFamily: JOST, fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(248,247,245,0.3)', marginTop: 12, marginBottom: 4 },
  waNumber:      { fontFamily: CG300, fontSize: 20, color: GOLD, letterSpacing: 1 },
  waHint:        { fontFamily: DM300, fontSize: 12, color: 'rgba(248,247,245,0.45)' },
  waActions:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  waBtn:         { backgroundColor: GOLD, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 },
  waBtnText:     { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: INK },
  waDismiss:     { fontFamily: JOST, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(248,247,245,0.25)' },

  // Onboarding cards
  onboardCard:   { backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER, borderLeftWidth: 3, borderLeftColor: GOLD, borderRadius: 8, padding: 16 },
  onboardTitle:  { fontFamily: CG300, fontSize: 18, color: DARK, marginBottom: 4 },
  onboardSub:    { fontFamily: DM300, fontSize: 13, color: MUTED, marginBottom: 12 },
  onboardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  onboardCta:    { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD },
  onboardDone:   { fontFamily: JOST, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: '#C8C4BE' },

  // Attention card
  attCard:       { borderRadius: 8, padding: 16, marginBottom: 10 },
  attCardTop:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  attCardTitle:  { fontFamily: CG300, fontSize: 17, color: DARK, flex: 1, paddingRight: 12, lineHeight: 22 },
  attCardAmount: { fontFamily: JOST, fontSize: 12, color: GOLD },
  attCardSub:    { fontFamily: DM300, fontSize: 13, color: MUTED, marginBottom: 12, lineHeight: 18 },
  attCardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  overduePill:   { backgroundColor: 'rgba(201,168,76,0.08)', borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  overduePillText: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD },
  attCardCta:    { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase' },

  // Schedule
  scheduleRow:   { flexDirection: 'row', alignItems: 'baseline', gap: 16, paddingVertical: 12 },
  scheduleRowBorder: { borderBottomWidth: 0.5, borderBottomColor: BORDER },
  scheduleTime:  { fontFamily: JOST, fontSize: 11, color: MUTED, flexShrink: 0, minWidth: 44 },
  scheduleEvent: { fontFamily: CG300, fontSize: 17, color: DARK, marginBottom: 2 },
  scheduleClient: { fontFamily: DM300, fontSize: 12, color: MUTED },

  // Week summary
  weekSummary:   { fontFamily: DM300, fontSize: 14, color: '#555250', lineHeight: 20 },

  // Snapshot
  snapCard:      { backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER, borderRadius: 8, padding: 20, flexDirection: 'row' },
  snapDivider:   { width: 0.5, backgroundColor: BORDER, alignSelf: 'stretch' },
  snapValue:     { fontFamily: CG300, fontSize: 32, color: DARK, marginBottom: 2, lineHeight: 36 },
  snapLabel:     { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  snapDelta:     { fontFamily: DM300, fontSize: 11, color: MUTED },

  // Tip
  tipDivider:    { height: 0.5, backgroundColor: BORDER, marginBottom: 12 },
  tipRow:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipBadge:      { fontFamily: JOST, fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: GOLD },
  tipText:       { fontFamily: DM300, fontSize: 12, color: MUTED, flex: 1, lineHeight: 17 },
  tipTitle:      { color: '#555250', fontFamily: DM400 },
  tipMore:       { fontFamily: JOST, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: GOLD, flexShrink: 0 },

  // DreamAi bar
  dreamAiBar:    { backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dreamAiStar:   { fontSize: 13, color: GOLD },
  dreamAiLabel:  { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: MUTED },
  dreamAiPlaceholder: { fontFamily: DM300, fontSize: 13, color: '#C8C4BE', fontStyle: 'italic', flex: 1 },

  emptyText:     { fontFamily: DM300, fontSize: 14, fontStyle: 'italic', color: MUTED },
});
