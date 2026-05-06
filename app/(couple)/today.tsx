import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator,
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
  state: 'no_date' | 'date_only' | 'event' | 'past';
  days_until: number | null;
  event_name: string | null;
  wedding_date: string | null;
}
interface Moment {
  type: string; priority: number; title: string; body: string; action: string;
  task_id?: string; enquiry_id?: string; expense_id?: string; event_id?: string;
  due_date?: string; amount?: number; event_name?: string;
}
interface MuseSave {
  id: string; vendor_id: string; created_at: string;
  image_url?: string; source_url?: string; title?: string;
  vendor: {
    id: string; name: string; category: string; city?: string;
    featured_photos?: string[]; portfolio_images?: string[];
    starting_price?: number;
  } | null;
}
interface EventItem { id: string; event_name: string; event_date: string; venue?: string; }
interface Payment { id: string; vendor_name?: string; actual_amount?: number; due_date?: string; description?: string; }
interface QuietActivity {
  type: string; text: string; at: string;
  enquiry_id?: string; vendor_id?: string; vendor_name?: string;
  vendor_category?: string; from?: string;
}
interface TodayData {
  hero: HeroData;
  three_moments: Moment[];
  muse_saves: MuseSave[];
  this_week_events: EventItem[];
  upcoming_payments: Payment[];
  budget: { total: number; committed: number; paid: number };
  next_event: EventItem | null;
  quiet_activity: QuietActivity[];
  priority_tasks: any[];
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
function smartThumb(url: string, size = 400): string {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/c_fill,g_auto,w_${size},h_${size},q_auto/`);
}
function formatMomentDue(d?: string): string {
  if (!d) return '';
  const dt = new Date(d); dt.setHours(0,0,0,0);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((dt.getTime()-today.getTime())/86400000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return 'Due ' + new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
}

// ── Components ────────────────────────────────────────────────────────────────
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

function MomentCard({ moment, onComplete }: { moment: Moment; onComplete?: () => void }) {
  const accent = moment.priority <= 1 ? GOLD : MUTED;
  const dueLabel = formatMomentDue(moment.due_date);
  const isOverdue = moment.due_date && new Date(moment.due_date) < new Date();
  return (
    <View style={[styles.momentCard, { borderLeftColor: accent }]}>
      <Text style={[styles.momentTitle, { color: accent }]}>{moment.title}</Text>
      <Text style={styles.momentBody}>{moment.body}</Text>
      {(dueLabel || moment.event_name) && (
        <View style={styles.momentMeta}>
          {dueLabel ? (
            <Text style={[styles.momentDue, isOverdue && { color: GOLD }]}>{dueLabel}</Text>
          ) : null}
          {moment.event_name && moment.event_name !== 'General' && moment.event_name !== 'general' && (
            <View style={styles.eventPill}>
              <Text style={styles.eventPillText}>{moment.event_name}</Text>
            </View>
          )}
        </View>
      )}
      <TouchableOpacity style={styles.momentBtn} onPress={onComplete} activeOpacity={0.85}>
        <Text style={styles.momentBtnText}>
          {moment.task_id ? 'VIEW TASK →' : moment.action}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CoupleTodayScreen() {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<any>(null);
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  const fetchData = useCallback(async (sess: any) => {
    if (!sess?.id) return;
    try {
      const r = await fetch(`${API}/api/v2/couple/today/${sess.id}`);
      const json = await r.json();
      setData(json);
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

  // Refresh data when tab is re-focused
  useFocusEffect(useCallback(() => {
    if (session) fetchData(session);
  }, [session]));

  async function completeTask(taskId: string) {
    setCompletedIds(p => new Set([...p, taskId]));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await fetch(`${API}/api/v2/couple/tasks/${taskId}/complete`, { method: 'PATCH' });
    } catch {}
    fetchData(session);
  }

  const moments = (data?.three_moments || []).filter(m => !m.task_id || !completedIds.has(m.task_id!));
  const budget = data?.budget;
  const budgetPct = budget?.total ? Math.min(100, Math.round((budget.committed / budget.total) * 100)) : 0;

  const quickActions = [
    { label: '+ Expense', icon: '₹', onTap: () => {} },
    { label: '+ Task',    icon: '✓', onTap: () => {} },
    { label: 'Family',   icon: '◎', onTap: () => router.push('/(couple)/circle') },
    { label: '+ Muse',   icon: '✦', onTap: () => {} },
    { label: 'Find Makers', icon: '⌕', onTap: () => {}, coming: true },
  ];

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Top pills */}
        <View style={styles.pillNav}>
          {['PLAN', 'AI', 'DISCOVER'].map((p, i) => (
            <View key={p} style={[styles.pill, i === 0 && styles.pillActive]}>
              <Text style={[styles.pillText, i === 0 && styles.pillTextActive]}>{p}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={GOLD} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.wordmark}>TDW</Text>
        <View style={styles.pillGroup}>
          <TouchableOpacity style={[styles.pill, styles.pillActive]}>
            <Text style={[styles.pillText, styles.pillTextActive]}>PLAN</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pillAi}>
            <Text style={styles.pillAiText}>✦ AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pill}>
            <Text style={styles.pillText}>DISCOVER</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.profileCircle}>
          <Text style={styles.profileInitial}>{session?.name?.[0]?.toUpperCase() || 'D'}</Text>
        </View>
      </View>

      {/* DEV ONLY — remove this block when done testing */}
      <TouchableOpacity style={{ alignItems: 'flex-end', paddingHorizontal: 20, paddingBottom: 6 }} onPress={async () => { await clearCoupleSession(); router.replace('/'); }}>
        <Text style={styles.signOutText}>SIGN OUT</Text>
      </TouchableOpacity>
      {/* END DEV ONLY */}

      {/* Toast */}
      {!!toast && (
        <View style={[styles.toast, { top: insets.top + 60 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={styles.hero}>
          {data?.hero.state === 'no_date' && (
            <>
              <Text style={styles.heroTitle}>Your wedding story starts here.</Text>
              <Text style={styles.heroSub}>Add your wedding date to unlock your personalised countdown.</Text>
              <TouchableOpacity style={styles.heroCta}>
                <Text style={styles.heroCtaText}>SET YOUR DATE →</Text>
              </TouchableOpacity>
            </>
          )}
          {data?.hero.state === 'past' && (
            <Text style={styles.heroTitle}>
              Your wedding was {Math.abs(data.hero.days_until || 0)} days ago. We hope it was everything you dreamed.
            </Text>
          )}
          {(data?.hero.state === 'date_only' || data?.hero.state === 'event') && data?.hero.days_until != null && (
            <>
              <Text style={styles.heroCountdown}>
                {numberToWords(data.hero.days_until)} days{'\n'}to your {data.hero.event_name || 'wedding'}.
              </Text>
              {data.hero.wedding_date && (
                <Text style={styles.heroDate}>
                  {formatDate(
                    data.hero.state === 'event' && data.next_event?.event_date
                      ? data.next_event.event_date
                      : data.hero.wedding_date
                  )}
                </Text>
              )}
            </>
          )}
        </View>

        {/* ── Quick Actions ────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 28 }}
          contentContainerStyle={{ gap: 8, paddingRight: 16 }}
        >
          {quickActions.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.quickAction, (a as any).coming && styles.quickActionDisabled]}
              onPress={(a as any).coming ? undefined : a.onTap}
              activeOpacity={(a as any).coming ? 1 : 0.75}
            >
              <Text style={[styles.qaIcon, (a as any).coming && { color: '#C8C4BE' }]}>{a.icon}</Text>
              <Text style={[styles.qaLabel, (a as any).coming && { color: '#C8C4BE' }]}>{a.label}</Text>
              {(a as any).coming && (
                <View style={styles.soonBadge}><Text style={styles.soonText}>SOON</Text></View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Budget Snapshot ──────────────────────────────────────────────── */}
        {budget && budget.total > 0 && (
          <View style={[styles.card, { marginBottom: 28 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={styles.sectionLabel}>BUDGET</Text>
              <Text style={styles.budgetTotal}>{fmtINR(budget.committed)} of {fmtINR(budget.total)}</Text>
            </View>
            {/* Track */}
            <View style={styles.budgetTrackBg}>
              <View style={[styles.budgetTrackCommitted, { width: `${budgetPct}%` as any }]}>
                <View style={[styles.budgetTrackPaid, {
                  width: `${budget.committed > 0 ? Math.round((budget.paid/budget.committed)*100) : 0}%` as any
                }]} />
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
        )}

        {/* ── Needs Your Attention ─────────────────────────────────────────── */}
        {moments.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <SectionHeader label="NEEDS YOUR ATTENTION" />
            {moments.map((m, i) => (
              <MomentCard
                key={i}
                moment={m}
                onComplete={() => m.task_id ? completeTask(m.task_id!) : undefined}
              />
            ))}
          </View>
        )}

        {/* ── Next Event ───────────────────────────────────────────────────── */}
        {data?.next_event && (
          <View style={[styles.nextEventCard, { marginBottom: 28 }]}>
            <Text style={styles.sectionLabel}>NEXT EVENT</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
              <View>
                <Text style={styles.nextEventName}>{data.next_event.event_name}</Text>
                <Text style={styles.nextEventDate}>{formatDate(data.next_event.event_date)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.nextEventDays}>
                  {Math.max(0, Math.round((new Date(data.next_event.event_date).getTime() - Date.now()) / 86400000))}
                </Text>
                <Text style={styles.nextEventDaysLabel}>days away</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── From Your Muse ───────────────────────────────────────────────── */}
        {data?.muse_saves && data.muse_saves.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <SectionHeader label="FROM YOUR MUSE" actionLabel="See all →" onAction={() => {}} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingRight: 16 }}
            >
              {data.muse_saves.map(save => {
                const img =
                  save.image_url ||
                  save.vendor?.featured_photos?.[0] ||
                  save.vendor?.portfolio_images?.[0] ||
                  null;
                const thumb = img ? smartThumb(img, 300) : null;
                const name = save.vendor?.name || save.title || '—';
                const sub = save.vendor?.category || '';
                return (
                  <TouchableOpacity key={save.id} style={styles.museItem} activeOpacity={0.85}>
                    <View style={styles.museThumb}>
                      {thumb
                        ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                        : <Text style={{ fontSize: 24, color: BORDER }}>✦</Text>
                      }
                    </View>
                    <Text style={styles.museName} numberOfLines={1}>{name}</Text>
                    {sub ? <Text style={styles.museSub}>{sub}</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ── Latest Message ───────────────────────────────────────────────── */}
        {data?.quiet_activity && data.quiet_activity.length > 0 && (() => {
          const latest = data.quiet_activity[0];
          const fromVendor = latest.from === 'vendor';
          return (
            <View style={{ marginBottom: 28 }}>
              <SectionHeader label="LATEST MESSAGE" actionLabel="All messages →" onAction={() => {}} />
              <TouchableOpacity style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]} activeOpacity={0.85}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {latest.vendor_name?.[0]?.toUpperCase() || '✦'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  {latest.vendor_name && (
                    <Text style={styles.msgVendorName}>
                      {latest.vendor_name}{latest.vendor_category ? ` · ${latest.vendor_category}` : ''}
                    </Text>
                  )}
                  <Text style={styles.msgPreview} numberOfLines={1}>
                    {fromVendor ? latest.text : `You: ${latest.text}`}
                  </Text>
                  <Text style={styles.msgTime}>{timeAgo(latest.at)}</Text>
                </View>
                {fromVendor && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* ── This Week Events ─────────────────────────────────────────────── */}
        {data?.this_week_events && data.this_week_events.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <SectionHeader label="THIS WEEK" />
            {data.this_week_events.map(ev => (
              <View key={ev.id} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }]}>
                <View style={styles.dateBlock}>
                  <Text style={styles.dateMonth}>
                    {new Date(ev.event_date).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}
                  </Text>
                  <Text style={styles.dateDay}>{new Date(ev.event_date).getDate()}</Text>
                </View>
                <View>
                  <Text style={styles.eventName}>{ev.event_name}</Text>
                  {ev.venue && <Text style={styles.eventVenue}>{ev.venue}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Upcoming Payments ────────────────────────────────────────────── */}
        {data?.upcoming_payments && data.upcoming_payments.length > 0 && (
          <View style={{ marginBottom: 28 }}>
            <SectionHeader label="UPCOMING PAYMENTS" />
            {data.upcoming_payments.map((p, i) => (
              <View
                key={p.id}
                style={[
                  styles.paymentRow,
                  i < data.upcoming_payments.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: BORDER },
                ]}
              >
                <View>
                  <Text style={styles.paymentVendor}>{p.vendor_name || '—'}</Text>
                  {p.description && <Text style={styles.paymentDesc}>{p.description}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.paymentAmount}>{fmtINR(p.actual_amount || 0)}</Text>
                  {p.due_date && <Text style={styles.paymentDue}>Due {formatShortDate(p.due_date)}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────── */}
        {moments.length === 0 &&
          (!data?.muse_saves || data.muse_saves.length === 0) &&
          (!data?.this_week_events || data.this_week_events.length === 0) && (
          <View style={{ marginTop: 24, alignItems: 'center' }}>
            {(data?.priority_tasks?.length ?? 0) > 0 ? (
              <Text style={styles.caughtUp}>You're all caught up.</Text>
            ) : (
              <>
                <Text style={styles.emptyTitle}>Your planning starts here.</Text>
                <Text style={styles.emptySub}>
                  We've lined up your top priorities based on your wedding date.
                </Text>
                {(data?.priority_tasks || []).slice(0, 5).map((t: any, i: number) => (
                  <TouchableOpacity key={i} style={[styles.card, { width: '100%', marginBottom: 8 }]} activeOpacity={0.85}>
                    <Text style={styles.priorityTaskTitle}>{t.title || t.text}</Text>
                    {t.due_date && <Text style={styles.priorityTaskDue}>{formatMomentDue(t.due_date)}</Text>}
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        )}

        {/* DEV SIGN OUT — remove when Today is verified working */}
        <TouchableOpacity
          style={{ alignItems: 'center', marginTop: 32 }}
          onPress={async () => { await clearCoupleSession(); router.replace('/'); }}
        >
          <Text style={{ fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: GOLD, opacity: 0.4 }}>
            SIGN OUT
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Top bar
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
  pill: {
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: 'transparent',
  },
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
  signOutText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED },

  // Toast
  toast: {
    position: 'absolute', left: '10%', right: '10%', zIndex: 100,
    backgroundColor: 'rgba(12,10,9,0.85)', borderRadius: 100,
    padding: 10, alignItems: 'center',
  },
  toastText: { fontFamily: 'DMSans_300Light', fontSize: 13, color: CREAM },

  // Hero
  hero: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 8 },
  heroTitle: {
    fontFamily: 'CormorantGaramond_300Light', fontSize: 32, fontStyle: 'italic',
    color: INK, textAlign: 'center', marginBottom: 10, lineHeight: 38,
  },
  heroSub: {
    fontFamily: 'DMSans_300Light', fontSize: 13, color: MUTED, textAlign: 'center', marginBottom: 20, lineHeight: 20,
  },
  heroCta: {
    borderRadius: 100, paddingHorizontal: 18, paddingVertical: 8,
    borderWidth: 0.5, borderColor: GOLD,
  },
  heroCtaText: { fontFamily: 'DMSans_300Light', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: GOLD },
  heroCountdown: {
    fontFamily: 'CormorantGaramond_300Light', fontSize: 38, color: INK, textAlign: 'center',
    marginBottom: 8, lineHeight: 44,
  },
  heroDate: { fontFamily: 'DMSans_300Light', fontSize: 13, color: MUTED, textAlign: 'center' },

  // Quick actions
  quickAction: {
    width: 72, height: 72, backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER,
    borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6, position: 'relative',
  },
  quickActionDisabled: { opacity: 0.6, backgroundColor: '#F0EDE8' },
  qaIcon: { fontSize: 18, color: GOLD },
  qaLabel: {
    fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 1, textTransform: 'uppercase',
    color: '#555250', textAlign: 'center', lineHeight: 12, paddingHorizontal: 4,
  },
  soonBadge: {
    position: 'absolute', top: -6, right: -6, backgroundColor: BORDER, borderRadius: 100, padding: 2,
    paddingHorizontal: 5,
  },
  soonText: { fontFamily: 'DMSans_300Light', fontSize: 6, letterSpacing: 1, textTransform: 'uppercase', color: MUTED },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionLabel: {
    fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#C8C4BE',
  },
  sectionAction: {
    fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED,
  },

  // Card
  card: {
    backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER, borderRadius: 12, padding: 16,
  },

  // Budget
  budgetTotal: { fontFamily: 'DMSans_300Light', fontSize: 12, color: MUTED },
  budgetTrackBg: { height: 6, backgroundColor: '#F0EDE8', borderRadius: 100, overflow: 'hidden' },
  budgetTrackCommitted: { height: '100%', backgroundColor: BORDER, borderRadius: 100, position: 'relative' },
  budgetTrackPaid: { position: 'absolute', top: 0, left: 0, height: '100%', backgroundColor: GOLD, borderRadius: 100 },
  budgetDot: { width: 8, height: 8, borderRadius: 4 },
  budgetLegend: { fontFamily: 'DMSans_300Light', fontSize: 11, color: MUTED },

  // Moment card
  momentCard: {
    backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER, borderLeftWidth: 3,
    borderRadius: 0, borderTopRightRadius: 12, borderBottomRightRadius: 12,
    padding: 16, marginBottom: 10,
  },
  momentTitle: {
    fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6,
  },
  momentBody: { fontFamily: 'CormorantGaramond_300Light', fontSize: 17, color: INK, marginBottom: 8, lineHeight: 22 },
  momentMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  momentDue: { fontFamily: 'DMSans_300Light', fontSize: 11, color: MUTED },
  eventPill: { backgroundColor: '#F4F1EC', borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 },
  eventPillText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: MUTED },
  momentBtn: {
    backgroundColor: INK, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 7,
    alignSelf: 'flex-start',
  },
  momentBtnText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: CREAM },

  // Next event
  nextEventCard: { backgroundColor: '#111111', borderRadius: 12, padding: 16 },
  nextEventName: { fontFamily: 'CormorantGaramond_300Light', fontSize: 22, color: CREAM, marginBottom: 4 },
  nextEventDate: { fontFamily: 'DMSans_300Light', fontSize: 12, color: MUTED },
  nextEventDays: { fontFamily: 'CormorantGaramond_300Light', fontSize: 32, color: GOLD, lineHeight: 34 },
  nextEventDaysLabel: {
    fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED,
  },

  // Muse
  museItem: { width: 120 },
  museThumb: {
    width: 120, height: 150, borderRadius: 12, backgroundColor: BORDER,
    marginBottom: 6, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  museName: { fontFamily: 'CormorantGaramond_300Light', fontSize: 14, color: INK, marginBottom: 2 },
  museSub: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', color: MUTED },

  // Message
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0EDE8', borderWidth: 0.5,
    borderColor: BORDER, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarText: { fontFamily: 'CormorantGaramond_300Light', fontSize: 13, color: MUTED },
  msgVendorName: { fontFamily: 'CormorantGaramond_300Light', fontSize: 15, color: INK, marginBottom: 2 },
  msgPreview: { fontFamily: 'DMSans_300Light', fontSize: 12, color: MUTED, marginBottom: 2 },
  msgTime: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1, color: '#C8C4BE' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: GOLD, flexShrink: 0 },

  // This week
  dateBlock: { alignItems: 'center', flexShrink: 0 },
  dateMonth: { fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: MUTED, marginBottom: 2 },
  dateDay: { fontFamily: 'CormorantGaramond_300Light', fontSize: 24, color: INK, lineHeight: 28 },
  eventName: { fontFamily: 'CormorantGaramond_300Light', fontSize: 17, color: INK, marginBottom: 2 },
  eventVenue: { fontFamily: 'DMSans_300Light', fontSize: 12, color: MUTED },

  // Payments
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  paymentVendor: { fontFamily: 'CormorantGaramond_300Light', fontSize: 16, color: INK, marginBottom: 2 },
  paymentDesc: { fontFamily: 'DMSans_300Light', fontSize: 12, color: MUTED },
  paymentAmount: { fontFamily: 'DMSans_300Light', fontSize: 15, fontWeight: '400', color: GOLD, marginBottom: 2 },
  paymentDue: { fontFamily: 'DMSans_300Light', fontSize: 11, color: MUTED },

  // Empty state
  caughtUp: { fontFamily: 'CormorantGaramond_300Light', fontSize: 18, fontStyle: 'italic', color: MUTED, textAlign: 'center' },
  emptyTitle: { fontFamily: 'CormorantGaramond_300Light', fontSize: 22, color: INK, textAlign: 'center', marginBottom: 8 },
  emptySub: { fontFamily: 'DMSans_300Light', fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  priorityTaskTitle: { fontFamily: 'CormorantGaramond_300Light', fontSize: 16, color: INK, marginBottom: 4 },
  priorityTaskDue: { fontFamily: 'DMSans_300Light', fontSize: 12, color: MUTED },
});
