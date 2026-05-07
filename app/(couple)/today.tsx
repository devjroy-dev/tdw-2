import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, Animated,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { RAILWAY_URL } from '../../constants/tokens';
import { getCoupleSession, clearCoupleSession } from '../../utils/session';

const API = RAILWAY_URL;
const GOLD = '#C9A84C';
const INK = '#0C0A09';
const BG = '#F8F7F5';
const CREAM = '#F8F7F5';
const CARD = '#FFFFFF';
const BORDER = '#E2DED8';
const MUTED = '#8C8480';

// ── Interfaces ──────────────────────────────────────────────────────────────
interface HeroData {
  state: 'upcoming' | 'today' | 'past' | 'no_date';
  days_until: number | null;
  wedding_date: string | null;
}
interface Moment {
  id: string;
  title: string;
  event: string;
  due_date: string | null;
  priority: string;
  cta?: string;
}
interface MuseSave {
  id: string;
  thumbnail_url: string | null;
  source_url: string | null;
  tag: string | null;
}
interface EventItem {
  id: string;
  event_name: string;
  event_date: string;
  event_city?: string | null;
}
interface Payment {
  id: string;
  vendor_name: string;
  amount: number;
  due_date: string;
  status: string;
}
interface QuietActivity {
  id: string;
  text: string;
  timestamp: string;
}
interface TodayData {
  hero: HeroData;
  three_moments: Moment[];
  priority_tasks: Moment[];
  budget: { total: number; committed: number; paid: number };
  next_event: EventItem | null;
  muse_saves: MuseSave[];
  quiet_activity: QuietActivity[];
  upcoming_payments: Payment[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function numberToWords(n: number): string {
  if (n <= 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
    'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' '+ones[n%10] : '');
  if (n < 1000) return ones[Math.floor(n/100)]+' Hundred'+(n%100 ? ' '+numberToWords(n%100) : '');
  return ones[Math.floor(n/1000)]+' Thousand'+(n%1000 ? ' '+numberToWords(n%1000) : '');
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
function formatShortDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function fmtINR(n: number) { return '₹' + n.toLocaleString('en-IN'); }
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff/3600000);
  const d = Math.floor(diff/86400000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return formatShortDate(dateStr);
}
function formatMomentDue(d?: string | null): string {
  if (!d) return '';
  const dt = new Date(d); dt.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((dt.getTime()-today.getTime())/86400000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return 'Due ' + new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ label, actionLabel, onAction }: {
  label: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Moment Card ───────────────────────────────────────────────────────────────
function MomentCard({ moment, onTap }: { moment: Moment; onTap?: () => void }) {
  const dueLabel = formatMomentDue(moment.due_date);
  const isOverdue = moment.due_date && new Date(moment.due_date) < new Date();
  const accentColor = isOverdue ? GOLD : INK;

  return (
    <TouchableOpacity
      style={[styles.momentCard, { borderLeftColor: accentColor }]}
      onPress={onTap}
      activeOpacity={0.85}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <Text style={styles.momentTitle} numberOfLines={2}>{moment.title}</Text>
        {dueLabel ? (
          <Text style={[styles.momentDue, isOverdue && { color: GOLD }]}>{dueLabel}</Text>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {moment.event && moment.event !== 'general' && (
          <View style={styles.eventPill}>
            <Text style={styles.eventPillText}>{moment.event.toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.momentCta}>VIEW →</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CoupleTodayScreen() {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<any>(null);
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const fetchData = useCallback(async (sess: any) => {
    if (!sess?.id) return;
    try {
      const r = await fetch(`${API}/api/v2/couple/today/${sess.id}`);
      const json = await r.json() as TodayData;
      setData(json);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch { showToast('Could not load your dashboard.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    getCoupleSession().then(s => {
      if (!s?.id && !s?.userId) { router.replace('/'); return; }
      setSession(s);
      fetchData(s);
    });
  }, []);

  useFocusEffect(useCallback(() => {
    if (session) fetchData(session);
  }, [session]));

  const budget = data?.budget;
  const budgetPaidPct = budget && budget.committed > 0
    ? Math.min(100, Math.round((budget.paid / budget.committed) * 100))
    : 0;
  const budgetCommittedPct = budget && budget.total > 0
    ? Math.min(100, Math.round((budget.committed / budget.total) * 100))
    : 0;

  const quickActions = [
    { label: '+ Expense', icon: '₹', onTap: () => router.push({ pathname: '/(couple)/plan', params: { tab: 'money' } } as any) },
    { label: '+ Task',    icon: '✓', onTap: () => router.push({ pathname: '/(couple)/plan', params: { tab: 'tasks' } } as any) },
    { label: 'Family',   icon: '◎', onTap: () => router.push('/(couple)/circle') },
    { label: '+ Muse',   icon: '✦', onTap: () => router.push({ pathname: '/(couple)/plan', params: { tab: 'muse' } } as any) },
  ];

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Text style={styles.wordmark}>TDW</Text>
          <View style={styles.pillGroup}>
            <View style={[styles.pill, styles.pillActive]}><Text style={[styles.pillText, styles.pillTextActive]}>PLAN</Text></View>
            <View style={styles.pillAi}><Text style={styles.pillAiText}>✦ AI</Text></View>
            <TouchableOpacity style={styles.pill} onPress={() => router.push('/(couple)/discover')}><Text style={styles.pillText}>DISCOVER</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.profileCircle} onPress={() => router.push('/(couple)/profile')}>
            <Text style={styles.profileInitial}>{session?.name?.[0]?.toUpperCase() || 'D'}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={GOLD} />
        </View>
      </View>
    );
  }

  const hero = data?.hero;
  const moments = data?.three_moments || [];
  const muse = data?.muse_saves || [];
  const activity = data?.quiet_activity || [];
  const payments = data?.upcoming_payments || [];
  const nextEvent = data?.next_event;

  // Days until next event (could differ from wedding date)
  const nextEventDays = nextEvent
    ? Math.max(0, Math.ceil((new Date(nextEvent.event_date).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.wordmark}>TDW</Text>
        <View style={styles.pillGroup}>
          <TouchableOpacity style={[styles.pill, styles.pillActive]} onPress={() => router.replace('/(couple)/plan')}>
            <Text style={[styles.pillText, styles.pillTextActive]}>PLAN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillAi} onPress={() => router.replace('/(couple)/dreamai')}>
            <Text style={styles.pillAiText}>✦ AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pill} onPress={() => router.push('/(couple)/discover')}>
            <Text style={styles.pillText}>DISCOVER</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.profileCircle} onPress={() => router.push('/(couple)/profile')}>
          <Text style={styles.profileInitial}>{session?.name?.[0]?.toUpperCase() || 'D'}</Text>
        </TouchableOpacity>
      </View>

      {/* Toast */}
      {!!toast && (
        <View style={[styles.toast, { top: insets.top + 60 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim }}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero countdown ─────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {(!hero || hero.state === 'no_date') && (
            <>
              <Text style={styles.heroTitle}>Your wedding story{'\n'}starts here.</Text>
              <Text style={styles.heroSub}>Add your wedding date to unlock your countdown.</Text>
              <TouchableOpacity style={styles.heroCta} onPress={() => router.push('/(couple)/profile')}>
                <Text style={styles.heroCtaText}>SET YOUR DATE →</Text>
              </TouchableOpacity>
            </>
          )}
          {hero?.state === 'today' && (
            <Text style={styles.heroCountdown}>Today is{'\n'}your wedding day.</Text>
          )}
          {hero?.state === 'past' && (
            <Text style={styles.heroTitle}>
              {Math.abs(hero.days_until || 0)} days since{'\n'}your wedding.
            </Text>
          )}
          {hero?.state === 'upcoming' && hero.days_until != null && (
            <>
              {/* Greeting */}
              <Text style={styles.heroGreeting}>{getGreeting()}.</Text>

              {/* Big countdown — INK black as directed */}
              <Text style={styles.heroCountdown}>
                {numberToWords(hero.days_until)}
              </Text>
              <Text style={styles.heroCountdownSub}>
                days to your wedding.
              </Text>

              {/* Wedding date */}
              {hero.wedding_date && (
                <Text style={styles.heroDate}>{formatDate(hero.wedding_date)}</Text>
              )}

              {/* Next event chip — if different from wedding */}
              {nextEvent && nextEvent.event_date !== hero.wedding_date && nextEventDays !== null && (
                <View style={styles.nextEventChip}>
                  <Text style={styles.nextEventChipText}>
                    {nextEvent.event_name} · {nextEventDays === 0 ? 'Today' : `${nextEventDays}d`}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* ── Quick Actions ─────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 28 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingRight: 32 }}
        >
          {quickActions.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={styles.quickAction}
              onPress={a.onTap}
              activeOpacity={0.75}
            >
              <Text style={styles.qaIcon}>{a.icon}</Text>
              <Text style={styles.qaLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Budget bar ────────────────────────────────────────────────── */}
        {budget && budget.committed > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
            <View style={[styles.card]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={styles.sectionLabel}>BUDGET</Text>
                <Text style={styles.budgetTotal}>{fmtINR(budget.paid)} paid of {fmtINR(budget.committed)}</Text>
              </View>
              <View style={styles.budgetTrackBg}>
                <View style={[styles.budgetTrackCommitted, { width: `${budgetCommittedPct}%` as any }]}>
                  <View style={[styles.budgetTrackPaid, { width: `${budgetPaidPct}%` as any }]} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={[styles.budgetDot, { backgroundColor: GOLD }]} />
                  <Text style={styles.budgetLegend}>{fmtINR(budget.paid)} paid</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={[styles.budgetDot, { backgroundColor: BORDER }]} />
                  <Text style={styles.budgetLegend}>{fmtINR(budget.committed - budget.paid)} pending</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ── Three Moments ─────────────────────────────────────────────── */}
        {moments.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
            <SectionHeader label="NEEDS YOUR ATTENTION" />
            {moments.map((m) => (
              <MomentCard
                key={m.id}
                moment={m}
                onTap={() => {
                  Haptics.selectionAsync();
                  router.push({ pathname: '/(couple)/plan', params: { tab: 'tasks' } } as any);
                }}
              />
            ))}
          </View>
        )}

        {/* ── Muse Rail ─────────────────────────────────────────────────── */}
        {muse.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <View style={{ paddingHorizontal: 20 }}>
              <SectionHeader
                label="FROM YOUR MUSE"
                actionLabel="See all →"
                onAction={() => router.push({ pathname: '/(couple)/plan', params: { tab: 'muse' } } as any)}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingRight: 32 }}
            >
              {muse.map(save => (
                <TouchableOpacity
                  key={save.id}
                  style={styles.museItem}
                  activeOpacity={0.85}
                  onPress={() => router.push({ pathname: '/(couple)/plan', params: { tab: 'muse' } } as any)}
                >
                  <View style={styles.museThumb}>
                    {save.thumbnail_url ? (
                      <Image
                        source={{ uri: save.thumbnail_url }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={{ fontSize: 24, color: BORDER }}>✦</Text>
                    )}
                  </View>
                  {save.tag && (
                    <Text style={styles.museTag} numberOfLines={1}>{save.tag}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Upcoming Payments ─────────────────────────────────────────── */}
        {payments.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
            <SectionHeader label="UPCOMING PAYMENTS" />
            <View style={styles.card}>
              {payments.map((p, i) => (
                <View
                  key={p.id}
                  style={[
                    styles.paymentRow,
                    i < payments.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: BORDER },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentVendor}>{p.vendor_name}</Text>
                    {p.due_date && <Text style={styles.paymentDue}>Due {formatShortDate(p.due_date)}</Text>}
                  </View>
                  <Text style={styles.paymentAmount}>{fmtINR(p.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Recent Activity ───────────────────────────────────────────── */}
        {activity.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
            <SectionHeader label="RECENTLY DONE" />
            {activity.slice(0, 3).map((a) => (
              <View key={a.id} style={styles.activityRow}>
                <View style={styles.activityDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityText}>{a.text}</Text>
                  <Text style={styles.activityTime}>{timeAgo(a.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {moments.length === 0 && muse.length === 0 && activity.length === 0 && (
          <View style={{ paddingHorizontal: 20, alignItems: 'center', marginTop: 16 }}>
            <Text style={styles.emptyTitle}>All clear for now.</Text>
            <Text style={styles.emptySub}>
              Your planning is on track. Check your tasks for what's coming up.
            </Text>
            <TouchableOpacity
              style={styles.heroCta}
              onPress={() => router.push({ pathname: '/(couple)/plan', params: { tab: 'tasks' } } as any)}
            >
              <Text style={styles.heroCtaText}>VIEW TASKS →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* DEV SIGN OUT */}
        <TouchableOpacity
          style={{ alignItems: 'center', marginTop: 32 }}
          onPress={async () => { await clearCoupleSession(); router.replace('/'); }}
        >
          <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: GOLD, opacity: 0.4 }}>
            SIGN OUT
          </Text>
        </TouchableOpacity>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, height: 56,
    backgroundColor: BG,
    borderBottomWidth: 0.5, borderBottomColor: BORDER,
  },
  wordmark: { fontFamily: 'CormorantGaramond_300Light', fontSize: 20, color: INK, letterSpacing: 1 },
  pillGroup: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(17,17,17,0.06)', borderRadius: 20, padding: 3,
  },
  pill: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: 'transparent' },
  pillActive: { backgroundColor: INK },
  pillText: { fontFamily: 'DMSans_300Light', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: MUTED },
  pillTextActive: { color: CREAM },
  pillAi: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'transparent' },
  pillAiText: { fontFamily: 'DMSans_300Light', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: GOLD },
  profileCircle: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: INK,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInitial: { fontFamily: 'DMSans_300Light', fontSize: 12, color: CREAM },

  toast: {
    position: 'absolute', left: '10%', right: '10%', zIndex: 100,
    backgroundColor: 'rgba(12,10,9,0.85)', borderRadius: 100,
    padding: 10, alignItems: 'center',
  },
  toastText: { fontFamily: 'DMSans_300Light', fontSize: 13, color: CREAM },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  heroGreeting: {
    fontFamily: 'DMSans_300Light', fontSize: 13, color: MUTED,
    letterSpacing: 1, marginBottom: 16, textTransform: 'uppercase',
  },
  // The big number — INK black, Cormorant, large
  heroCountdown: {
    fontFamily: 'CormorantGaramond_300Light', fontSize: 56, color: INK,
    textAlign: 'center', lineHeight: 60, letterSpacing: -1,
  },
  heroCountdownSub: {
    fontFamily: 'CormorantGaramond_300Light', fontSize: 22, color: MUTED,
    fontStyle: 'italic', textAlign: 'center', marginTop: 4, marginBottom: 12,
  },
  heroDate: {
    fontFamily: 'DMSans_300Light', fontSize: 12, color: MUTED,
    letterSpacing: 1, textAlign: 'center',
  },
  heroTitle: {
    fontFamily: 'CormorantGaramond_300Light', fontSize: 32, fontStyle: 'italic',
    color: INK, textAlign: 'center', marginBottom: 10, lineHeight: 38,
  },
  heroSub: {
    fontFamily: 'DMSans_300Light', fontSize: 13, color: MUTED,
    textAlign: 'center', marginBottom: 20, lineHeight: 20,
  },
  heroCta: {
    borderRadius: 100, paddingHorizontal: 18, paddingVertical: 8,
    borderWidth: 0.5, borderColor: GOLD, marginTop: 8,
  },
  heroCtaText: { fontFamily: 'DMSans_300Light', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: GOLD },

  // Next event chip
  nextEventChip: {
    marginTop: 14, backgroundColor: INK, borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  nextEventChipText: {
    fontFamily: 'DMSans_300Light', fontSize: 10, letterSpacing: 2,
    textTransform: 'uppercase', color: CREAM,
  },

  // Quick actions
  quickAction: {
    width: 80, height: 72, backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  qaIcon: { fontSize: 18, color: GOLD },
  qaLabel: {
    fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 1, textTransform: 'uppercase',
    color: '#555250', textAlign: 'center', lineHeight: 12, paddingHorizontal: 4,
  },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLabel: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#C8C4BE' },
  sectionAction: { fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED },

  // Card
  card: { backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER, borderRadius: 12, padding: 16 },

  // Budget
  budgetTotal: { fontFamily: 'DMSans_300Light', fontSize: 12, color: MUTED },
  budgetTrackBg: { height: 5, backgroundColor: '#F0EDE8', borderRadius: 100, overflow: 'hidden' },
  budgetTrackCommitted: { height: '100%', backgroundColor: BORDER, borderRadius: 100, position: 'relative' },
  budgetTrackPaid: { position: 'absolute', top: 0, left: 0, height: '100%', backgroundColor: GOLD, borderRadius: 100 },
  budgetDot: { width: 8, height: 8, borderRadius: 4 },
  budgetLegend: { fontFamily: 'DMSans_300Light', fontSize: 11, color: MUTED },

  // Moment card
  momentCard: {
    backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER, borderLeftWidth: 3,
    borderTopRightRadius: 12, borderBottomRightRadius: 12,
    padding: 16, marginBottom: 10,
  },
  momentTitle: {
    fontFamily: 'CormorantGaramond_300Light', fontSize: 18, color: INK,
    flex: 1, lineHeight: 22, marginRight: 8,
  },
  momentDue: {
    fontFamily: 'DMSans_300Light', fontSize: 10, color: MUTED,
    letterSpacing: 0.5, flexShrink: 0,
  },
  eventPill: { backgroundColor: '#F4F1EC', borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 },
  eventPillText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: MUTED },
  momentCta: {
    fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1.5,
    textTransform: 'uppercase', color: GOLD, marginLeft: 'auto',
  },

  // Muse
  museItem: { width: 110 },
  museThumb: {
    width: 110, height: 140, borderRadius: 12, backgroundColor: BORDER,
    marginBottom: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  museTag: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: MUTED },

  // Payments
  paymentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  paymentVendor: { fontFamily: 'CormorantGaramond_300Light', fontSize: 16, color: INK, marginBottom: 2 },
  paymentDue: { fontFamily: 'DMSans_300Light', fontSize: 11, color: MUTED },
  paymentAmount: { fontFamily: 'DMSans_300Light', fontSize: 14, color: GOLD },

  // Activity
  activityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  activityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD, marginTop: 5, flexShrink: 0 },
  activityText: { fontFamily: 'DMSans_300Light', fontSize: 13, color: INK, lineHeight: 18, marginBottom: 2 },
  activityTime: { fontFamily: 'DMSans_300Light', fontSize: 10, color: MUTED, letterSpacing: 0.5 },

  // Empty state
  emptyTitle: { fontFamily: 'CormorantGaramond_300Light', fontSize: 22, color: INK, textAlign: 'center', marginBottom: 8 },
  emptySub: { fontFamily: 'DMSans_300Light', fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
});
