/**
 * app/(vendor)/studio/calendar.tsx
 * Exact native port of web/app/vendor/studio/calendar/page.tsx
 *
 * Endpoints:
 *   GET  /api/vendor-clients/:vendorId                        — bookings
 *   GET  /api/vendor-discover/availability/:vendorId          — blocked dates
 *   GET  /api/v2/hot-dates?from=&to=                          — hot dates
 *   POST /api/todos/:vendorId                                 — task / todo
 *   POST /api/vendor-clients                                  — booking
 *   POST /api/v2/dreamai/vendor-action/block-date             — block date
 *   GET  /api/v2/vendor/calendar.ics/:vendorId                — export ICS (opens in browser)
 *   POST /api/v2/vendor/calendar/import/:vendorId             — import ICS
 *
 * Native-specific:
 *   Export → Linking.openURL (opens browser)
 *   Import → expo-document-picker → read file → POST ics_content
 *   Date pickers → @react-native-community/datetimepicker
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Pressable, TextInput, Animated, Easing, Platform,
  KeyboardAvoidingView, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus,
  CheckSquare, ListTodo, CalendarPlus, Ban,
} from 'lucide-react-native';
import { RAILWAY_URL } from '../../../constants/tokens';
import { getVendorSession } from '../../../utils/session';

const API    = RAILWAY_URL;
const BG     = '#F8F7F5';
const CARD   = '#FFFFFF';
const GOLD   = '#C9A84C';
const INK    = '#0C0A09';
const DARK   = '#111111';
const MUTED  = '#8C8480';
const BORDER = '#E2DED8';
const WARM   = '#F4F1EC';
const RED_BG = '#9B4545';
const PEAK   = '#FF6B35';

const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
const DM400 = 'DMSans_400Regular';
const JOST  = 'Jost_300Light';

type CreationType = 'task' | 'todo' | 'booking' | 'block' | null;

interface Booking {
  id: string; name: string; event_date: string;
  event_type: string; venue: string; status: string;
  phone?: string; notes?: string;
}
interface AvailBlock {
  id: string; blocked_date: string; reason: string | null;
}
interface HotDate { label: string; intensity: string; }

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
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });
  return <Animated.View style={[styles.shimmer, { height, opacity }]} />;
}

// ── Native date picker wrapper ────────────────────────────────────────────────
function NativeDateInput({
  label, value, onChange, placeholder,
}: {
  label: string; value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const date = value ? new Date(value + 'T00:00:00') : new Date();
  const display = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : placeholder || 'Select date';

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        onPress={() => setShow(true)}
        style={styles.dateInput}
        activeOpacity={0.7}
      >
        <Text style={[styles.dateInputText, !value && { color: '#C8C4BE' }]}>{display}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selected) => {
            setShow(Platform.OS === 'ios');
            if (selected) {
              const y = selected.getFullYear();
              const m = String(selected.getMonth() + 1).padStart(2, '0');
              const d = String(selected.getDate()).padStart(2, '0');
              onChange(`${y}-${m}-${d}`);
            }
          }}
        />
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function VendorCalendarScreen() {
  const insets = useSafeAreaInsets();

  const [vendorId,      setVendorId]      = useState<string | null>(null);
  const [bookings,      setBookings]      = useState<Booking[]>([]);
  const [blockedDates,  setBlockedDates]  = useState<Set<string>>(new Set());
  const [availBlocks,   setAvailBlocks]   = useState<AvailBlock[]>([]);
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [selectedDate,  setSelectedDate]  = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [currentDate,   setCurrentDate]   = useState(new Date());
  const [hotDates,      setHotDates]      = useState<Map<string, HotDate>>(new Map());
  const [selectedHot,   setSelectedHot]   = useState<{ date: string } & HotDate | null>(null);
  const [toast,         setToast]         = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  // FAB
  const [fabOpen,       setFabOpen]       = useState(false);
  const [creationType,  setCreationType]  = useState<CreationType>(null);
  const [fabLoading,    setFabLoading]    = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;

  // Form
  const [formTitle,       setFormTitle]       = useState('');
  const [formDate,        setFormDate]        = useState('');
  const [formNote,        setFormNote]        = useState('');
  const [formPhone,       setFormPhone]       = useState('');
  const [formEventType,   setFormEventType]   = useState('');
  const [formReminder,    setFormReminder]    = useState('');
  const [conflictWarn,    setConflictWarn]    = useState<string | null>(null);

  // Import
  const [importMode,    setImportMode]    = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult,  setImportResult]  = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2600),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(''));
  };

  // FAB sheet animation
  useEffect(() => {
    Animated.timing(fabAnim, {
      toValue: fabOpen ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fabOpen]);

  const fabTranslate = fabAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  // Auth + data
  useEffect(() => {
    getVendorSession().then(async (s: any) => {
      if (!s?.id && !s?.vendorId) { router.replace('/'); return; }
      const vid = s.vendorId || s.id;
      setVendorId(vid);
      fetchData(vid);
      fetchHotDates();
    });
  }, []);

  async function fetchData(vid: string) {
    try {
      const [bookRes, availRes] = await Promise.all([
        fetch(`${API}/api/vendor-clients/${vid}`),
        fetch(`${API}/api/vendor-discover/availability/${vid}`),
      ]);
      const [bookJson, availJson] = await Promise.all([bookRes.json(), availRes.json()]);
      const blocked = new Set<string>();

      if (bookJson.success && Array.isArray(bookJson.data)) {
        setBookings(bookJson.data);
        bookJson.data.forEach((b: Booking) => {
          if (b.event_date) {
            const d = new Date(b.event_date + 'T00:00:00');
            blocked.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
          }
        });
      }
      if (availJson.success && Array.isArray(availJson.data)) {
        setAvailBlocks(availJson.data);
        availJson.data.forEach((b: AvailBlock) => {
          if (!b.blocked_date) return;
          const [y, m, d] = b.blocked_date.split('-').map(Number);
          blocked.add(`${y}-${m - 1}-${d}`);
        });
      }
      setBlockedDates(blocked);
    } catch {}
    setLoading(false);
  }

  async function fetchHotDates() {
    try {
      const from = new Date(); from.setMonth(from.getMonth() - 1);
      const to   = new Date(); to.setMonth(to.getMonth() + 13);
      const r = await fetch(
        `${API}/api/v2/hot-dates?from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`
      );
      const d = await r.json();
      if (d.success) {
        const map = new Map<string, HotDate>();
        (d.data || []).forEach((hd: any) => map.set(hd.date, { label: hd.label, intensity: hd.intensity }));
        setHotDates(map);
      }
    } catch {}
  }

  // Calendar grid
  const year        = currentDate.getFullYear();
  const month       = currentDate.getMonth();
  const today       = new Date();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay    = new Date(year, month, 1).getDay();
  const monthName   = currentDate.toLocaleString('default', { month: 'long' });

  const bookingDates = useMemo(() => new Set(
    bookings.filter(b => b.event_date).map(b => {
      const d = new Date(b.event_date + 'T00:00:00');
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  ), [bookings, refreshKey]);

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  // Upcoming list
  type UpcomingItem = { date: string; label: string; sub: string; type: 'booking' | 'blocked' };
  const upcoming: UpcomingItem[] = [
    ...bookings
      .filter(b => b.status !== 'blocked' && new Date(b.event_date) >= new Date(today.toDateString()))
      .map(b => ({ date: b.event_date, label: b.name || 'Client', sub: b.event_type || '', type: 'booking' as const })),
    ...availBlocks
      .filter(b => b.blocked_date && new Date(b.blocked_date + 'T00:00:00') >= new Date(today.toDateString()))
      .map(b => ({ date: b.blocked_date, label: b.reason ? b.reason.replace('Imported: ', '') : 'Blocked', sub: '', type: 'blocked' as const })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  function formatDate(s: string) {
    return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  // Conflict check
  function handleDateChange(val: string) {
    setFormDate(val);
    if (!val) { setConflictWarn(null); return; }
    const blockMatch = availBlocks.filter(b => b.blocked_date === val);
    const bookingMatch = bookings.filter(b => b.event_date && b.event_date.slice(0, 10) === val && b.status !== 'blocked');
    const all = [
      ...blockMatch.map(b => b.reason ? b.reason.replace('Imported: ', '') : 'Blocked date'),
      ...bookingMatch.map(b => b.name || ''),
    ];
    setConflictWarn(all.length > 0
      ? `You already have: ${all.join(', ')} on this date. You can still add another slot.`
      : null);
  }

  function resetForm() {
    setFormTitle(''); setFormDate(''); setFormNote('');
    setFormPhone(''); setFormEventType(''); setFormReminder('');
    setConflictWarn(null); setCreationType(null);
  }

  const isFormValid = () => {
    if (!creationType) return false;
    if (creationType === 'task')    return formTitle.trim().length > 0;
    if (creationType === 'todo')    return formTitle.trim().length > 0;
    if (creationType === 'booking') return formTitle.trim().length > 0 && formDate.length > 0;
    if (creationType === 'block')   return formDate.length > 0;
    return false;
  };

  const submitForm = async () => {
    if (!vendorId || !isFormValid()) return;
    setFabLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (creationType === 'task' || creationType === 'todo') {
        await fetch(`${API}/api/todos/${vendorId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorId, title: formTitle, ...(formDate ? { due_date: formDate } : {}), notes: formNote, type: creationType }),
        });
        showToast(creationType === 'task' ? 'Task added.' : 'To-do added.');
      } else if (creationType === 'booking') {
        await fetch(`${API}/api/vendor-clients`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendor_id: vendorId, name: formTitle, phone: formPhone, event_type: formEventType, event_date: formDate, notes: formNote, status: 'potential' }),
        });
        if (formReminder) {
          await fetch(`${API}/api/todos/${vendorId}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorId, title: `Follow up with ${formTitle}`, due_date: formReminder, type: 'reminder' }),
          });
        }
        showToast('Booking added.');
        await fetchData(vendorId);
        setRefreshKey(k => k + 1);
      } else if (creationType === 'block') {
        await fetch(`${API}/api/v2/dreamai/vendor-action/block-date`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendor_id: vendorId, blocked_date: formDate, reason: formNote || null }),
        });
        showToast('Date blocked.');
        await fetchData(vendorId);
        setRefreshKey(k => k + 1);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      setFabOpen(false);
    } catch {
      showToast('Something went wrong. Try again.');
    }
    setFabLoading(false);
  };

  // ICS import via expo-document-picker
  const handleImport = async () => {
    if (!vendorId) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) return;
      setImportLoading(true);
      setImportResult(null);
      const text = await FileSystem.readAsStringAsync(asset.uri);
      const res = await fetch(`${API}/api/v2/vendor/calendar/import/${vendorId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ics_content: text }),
      });
      const json = await res.json();
      if (json.success) {
        setImportResult(`${json.imported} dates imported from your calendar.`);
        fetchData(vendorId);
      } else {
        setImportResult('Could not import. Please try again.');
      }
    } catch {
      setImportResult('Could not read the file. Make sure it is a valid .ics file.');
    }
    setImportLoading(false);
  };

  const typeLabels: Record<string, string> = { task: 'Task', todo: 'To-Do', booking: 'Booking', block: 'Block Date' };
  const submitLabels: Record<string, string> = { task: 'ADD TASK', todo: 'ADD TO-DO', booking: 'ADD BOOKING', block: 'BLOCK DATE' };

  // Day sheet — shows all events on tapped date
  const daySheetBookings = selectedDate ? bookings.filter(b => b.event_date && b.event_date.slice(0, 10) === selectedDate) : [];
  const daySheetBlocks   = selectedDate ? availBlocks.filter(b => b.blocked_date === selectedDate) : [];
  const daySheetHot      = selectedDate ? hotDates.get(selectedDate) : null;
  const daySheetDisplay  = selectedDate
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <View style={[styles.root, { paddingTop: 0 }]}>

      {/* Toast */}
      {!!toast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim, top: insets.top + 16 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back + Header */}
        <View style={[styles.header, { paddingTop: 24 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} strokeWidth={1.5} color={DARK} />
          </TouchableOpacity>
          <Text style={styles.eyebrow}>YOUR STUDIO</Text>
          <Text style={styles.title}>Calendar</Text>
        </View>

        {/* Month navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month - 1, 1))} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ChevronLeft size={18} strokeWidth={1.5} color="#555250" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthName} {year}</Text>
          <TouchableOpacity onPress={() => setCurrentDate(new Date(year, month + 1, 1))} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <ChevronRight size={18} strokeWidth={1.5} color="#555250" />
          </TouchableOpacity>
        </View>

        {/* Day headers */}
        <View style={styles.dayHeaders}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <Text key={d} style={styles.dayHeader}>{d}</Text>
          ))}
        </View>

        {/* Calendar grid */}
        {loading ? (
          <View style={{ paddingHorizontal: 24 }}><Shimmer height={200} /></View>
        ) : (
          <View style={styles.grid}>
            {days.map((day, idx) => {
              if (day === null) return <View key={`e${idx}`} style={styles.dayCell} />;

              const key     = `${year}-${month}-${day}`;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const hasBooking = bookingDates.has(key);
              const isBlocked  = blockedDates.has(key);
              const hotInfo    = hotDates.get(dateStr);
              const hotColour  = hotInfo?.intensity === 'peak' ? PEAK : GOLD;

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.dayCell,
                    hotInfo && {
                      backgroundColor: hotInfo.intensity === 'peak' ? 'rgba(255,107,53,0.08)' : 'rgba(201,168,76,0.08)',
                      borderWidth: 1,
                      borderColor: hotColour + '44',
                      borderRadius: 6,
                    },
                  ]}
                  onPress={() => {
                    if (hasBooking || isBlocked) { setSelectedDate(dateStr); }
                    else if (hotInfo) { setSelectedHot({ date: dateStr, ...hotInfo }); }
                  }}
                  activeOpacity={(hasBooking || isBlocked || !!hotInfo) ? 0.7 : 1}
                >
                  {hotInfo && (
                    <Text style={[styles.fireEmoji, { opacity: hotInfo.intensity === 'peak' ? 1 : 0.7 }]}>🔥</Text>
                  )}
                  <View style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                    <Text style={[styles.dayText, isToday && styles.dayTextToday]}>{day}</Text>
                  </View>
                  {hasBooking && !isBlocked && <View style={styles.bookingDot} />}
                  {isBlocked && <Text style={styles.blockedX}>×</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: GOLD }]} />
            <Text style={styles.legendText}>Booking</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.legendX, { color: RED_BG }]}>×</Text>
            <Text style={styles.legendText}>Blocked</Text>
          </View>
          {hotDates.size > 0 && (
            <>
              <View style={styles.legendItem}>
                <View style={[styles.legendSquare, { backgroundColor: PEAK }]} />
                <Text style={styles.legendText}>Peak muhurat</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSquare, { backgroundColor: GOLD }]} />
                <Text style={styles.legendText}>High demand</Text>
              </View>
            </>
          )}
        </View>

        {/* Export */}
        {vendorId && (
          <View style={styles.syncRow}>
            <TouchableOpacity
              style={styles.syncCard}
              activeOpacity={0.8}
              onPress={() => Linking.openURL(`${API}/api/v2/vendor/calendar.ics/${vendorId}`)}
            >
              <View>
                <Text style={styles.syncEyebrow}>SYNC YOUR CALENDAR</Text>
                <Text style={styles.syncTitle}>Export to Apple / Google Calendar</Text>
              </View>
              <Text style={styles.syncCta}>↓ .ICS</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Import */}
        {vendorId && (
          <View style={styles.syncRow}>
            {!importMode ? (
              <TouchableOpacity
                style={styles.syncCard}
                activeOpacity={0.8}
                onPress={() => { setImportMode(true); setImportResult(null); }}
              >
                <View>
                  <Text style={styles.syncEyebrow}>IMPORT YOUR CALENDAR</Text>
                  <Text style={styles.syncTitle}>Upload Apple / Google Calendar file</Text>
                </View>
                <Text style={styles.syncCta}>↑ .ICS</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.importCard}>
                <View style={styles.importHeader}>
                  <Text style={styles.importTitle}>Import Calendar</Text>
                  <TouchableOpacity onPress={() => { setImportMode(false); setImportResult(null); }}>
                    <Text style={styles.importClose}>×</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.importInstructions}>
                  <Text style={{ color: DARK, fontFamily: DM400 }}>Google Calendar:</Text>
                  {' '}Open Google Calendar → Settings → select your calendar → Export calendar → upload the .ics file.
                </Text>
                <Text style={[styles.importInstructions, { marginBottom: 14 }]}>
                  <Text style={{ color: DARK, fontFamily: DM400 }}>Apple Calendar:</Text>
                  {' '}Open Calendar on Mac → File → Export → Export → upload the .ics file.
                </Text>
                <TouchableOpacity
                  style={styles.importPickerBtn}
                  activeOpacity={0.8}
                  onPress={handleImport}
                  disabled={importLoading}
                >
                  <Text style={styles.importPickerLabel}>
                    {importLoading ? 'IMPORTING...' : 'TAP TO SELECT FILE'}
                  </Text>
                  <Text style={styles.importPickerSub}>.ics files only</Text>
                </TouchableOpacity>
                {importResult && (
                  <Text style={[
                    styles.importResult,
                    { color: importResult.includes('imported') ? DARK : RED_BG },
                  ]}>
                    {importResult.includes('imported') ? '✓ ' : ''}{importResult}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Upcoming */}
        <View style={styles.upcomingSection}>
          <Text style={styles.sectionLabel}>UPCOMING</Text>
          {loading ? (
            <>
              <Shimmer height={52} />
              <View style={{ marginTop: 8 }}><Shimmer height={52} /></View>
              <View style={{ marginTop: 8 }}><Shimmer height={52} /></View>
            </>
          ) : upcoming.length === 0 ? (
            <Text style={styles.emptyText}>Nothing scheduled yet.</Text>
          ) : (
            upcoming.map((b, i) => (
              <View
                key={b.date + i}
                style={[styles.upcomingRow, i < upcoming.length - 1 && styles.upcomingRowBorder]}
              >
                <Text style={styles.upcomingDate}>{formatDate(b.date)}</Text>
                <Text style={styles.upcomingLabel} numberOfLines={1}>
                  {b.label}{b.sub ? ` — ${b.sub}` : ''}
                </Text>
                <Text style={[styles.upcomingType, { color: b.type === 'blocked' ? RED_BG : GOLD }]}>
                  {b.type === 'blocked' ? 'Blocked' : 'Booking'}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        onPress={() => { setFabOpen(true); setCreationType(null); }}
        activeOpacity={0.85}
      >
        <Plus size={20} color="#F8F7F5" strokeWidth={1.5} />
      </TouchableOpacity>

      {/* Day sheet */}
      <Modal visible={!!selectedDate} transparent animationType="none" statusBarTranslucent onRequestClose={() => setSelectedDate(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelectedDate(null)} />
        <View style={[styles.daySheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.dragHandle} />
          <Text style={styles.daySheetDate}>{daySheetDisplay}</Text>
          {daySheetHot && (
            <Text style={[styles.daySheetHot, { color: daySheetHot.intensity === 'peak' ? PEAK : GOLD }]}>
              🔥 {daySheetHot.intensity === 'peak' ? 'Peak muhurat' : 'High demand day'}{daySheetHot.label ? ` — ${daySheetHot.label}` : ''}
            </Text>
          )}
          <View style={{ gap: 8, marginBottom: 16 }}>
            {daySheetBookings.map(b => (
              <View key={b.id} style={styles.daySheetRow}>
                <View style={[styles.daySheetDot, { backgroundColor: GOLD }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.daySheetRowTitle} numberOfLines={1}>{b.name || 'Client'}</Text>
                  {b.event_type ? <Text style={styles.daySheetRowSub}>{b.event_type}</Text> : null}
                </View>
                <Text style={[styles.daySheetRowTag, { color: GOLD }]}>Booking</Text>
              </View>
            ))}
            {daySheetBlocks.map(b => (
              <View key={b.id} style={styles.daySheetRow}>
                <View style={[styles.daySheetDot, { backgroundColor: RED_BG, borderRadius: 3 }]} />
                <Text style={[styles.daySheetRowTitle, { flex: 1 }]} numberOfLines={1}>
                  {b.reason ? b.reason.replace('Imported: ', '') : 'Blocked'}
                </Text>
                <Text style={[styles.daySheetRowTag, { color: RED_BG }]}>Blocked</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.daySheetClose} onPress={() => setSelectedDate(null)} activeOpacity={0.7}>
            <Text style={styles.daySheetCloseText}>CLOSE</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Hot date nudge */}
      {selectedHot && (
        <View style={[styles.hotNudge, { bottom: insets.bottom + 80 }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.hotNudgeHeader}>
              <Text style={{ fontSize: 14 }}>🔥</Text>
              <Text style={[styles.hotNudgeType, { color: selectedHot.intensity === 'peak' ? PEAK : GOLD }]}>
                {selectedHot.intensity === 'peak' ? 'PEAK DEMAND DAY' : 'HIGH DEMAND DAY'}
              </Text>
            </View>
            <Text style={styles.hotNudgeTitle}>{selectedHot.label}</Text>
            <Text style={styles.hotNudgeBody}>
              This is an auspicious Hindu wedding date. Demand from couples is significantly higher. Consider adjusting your pricing for this date.
            </Text>
            <View style={styles.hotNudgeActions}>
              <TouchableOpacity
                style={styles.hotNudgeBtn}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedHot(null);
                  setFormDate(selectedHot.date);
                  setCreationType('block');
                  setFabOpen(true);
                }}
              >
                <Text style={styles.hotNudgeBtnText}>Block This Date →</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedHot(null)}>
                <Text style={styles.hotNudgeDismiss}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity onPress={() => setSelectedHot(null)} style={{ paddingLeft: 12 }}>
            <Text style={styles.hotNudgeX}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB sheet backdrop */}
      {fabOpen && (
        <Pressable style={styles.backdrop} onPress={() => { setFabOpen(false); resetForm(); }} />
      )}

      {/* FAB sheet */}
      <Animated.View style={[styles.fabSheet, { transform: [{ translateY: fabTranslate }], paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dragHandle} />

        {/* Step 1 — type selector */}
        {creationType === null && (
          <>
            <Text style={styles.fabSheetTitle}>What would you like to add?</Text>
            {([
              { type: 'task'    as CreationType, Icon: CheckSquare,  title: 'Task',       sub: 'Add a to-do for yourself' },
              { type: 'todo'    as CreationType, Icon: ListTodo,     title: 'To-Do',      sub: 'Quick reminder with no date' },
              { type: 'booking' as CreationType, Icon: CalendarPlus, title: 'Booking',    sub: 'Add a potential client with follow-up reminder' },
              { type: 'block'   as CreationType, Icon: Ban,          title: 'Block Date', sub: 'Reserve a date with a note, no client needed' },
            ] as const).map((opt, i, arr) => (
              <TouchableOpacity
                key={opt.title}
                style={[styles.fabTypeRow, i < arr.length - 1 && styles.fabTypeRowBorder]}
                onPress={() => setCreationType(opt.type)}
                activeOpacity={0.7}
              >
                <opt.Icon size={20} strokeWidth={1.5} color={MUTED} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fabTypeName}>{opt.title}</Text>
                  <Text style={styles.fabTypeSub}>{opt.sub}</Text>
                </View>
                <ChevronRight size={16} strokeWidth={1.5} color="#C8C4BE" />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Step 2 — form */}
        {creationType !== null && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.fabFormHeader}>
                <TouchableOpacity onPress={() => setCreationType(null)}>
                  <ArrowLeft size={18} strokeWidth={1.5} color={DARK} />
                </TouchableOpacity>
                <Text style={styles.fabFormTitle}>{typeLabels[creationType]}</Text>
              </View>

              {/* Task fields */}
              {creationType === 'task' && (
                <>
                  <Text style={styles.fieldLabel}>TITLE *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={formTitle}
                    onChangeText={setFormTitle}
                    placeholder="e.g. Confirm team for Sharma wedding"
                    placeholderTextColor="#C8C4BE"
                  />
                  <NativeDateInput label="DUE DATE" value={formDate} onChange={setFormDate} placeholder="Select date (optional)" />
                  <Text style={styles.fieldLabel}>NOTE</Text>
                  <TextInput
                    style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                    value={formNote} onChangeText={setFormNote}
                    placeholder="Optional notes..." placeholderTextColor="#C8C4BE" multiline
                  />
                </>
              )}

              {/* To-Do fields */}
              {creationType === 'todo' && (
                <>
                  <Text style={styles.fieldLabel}>TITLE *</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={formTitle} onChangeText={setFormTitle}
                    placeholder="e.g. Buy extra batteries" placeholderTextColor="#C8C4BE"
                  />
                  <Text style={styles.fieldLabel}>NOTE</Text>
                  <TextInput
                    style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]}
                    value={formNote} onChangeText={setFormNote}
                    placeholder="Optional notes..." placeholderTextColor="#C8C4BE" multiline
                  />
                </>
              )}

              {/* Booking fields */}
              {creationType === 'booking' && (
                <>
                  <Text style={styles.fieldLabel}>CLIENT NAME *</Text>
                  <TextInput style={styles.fieldInput} value={formTitle} onChangeText={setFormTitle} placeholder="e.g. Priya Mehta" placeholderTextColor="#C8C4BE" />
                  <Text style={styles.fieldLabel}>PHONE</Text>
                  <TextInput style={styles.fieldInput} value={formPhone} onChangeText={setFormPhone} placeholder="10-digit number" placeholderTextColor="#C8C4BE" keyboardType="phone-pad" />
                  <Text style={styles.fieldLabel}>EVENT TYPE</Text>
                  <TextInput style={styles.fieldInput} value={formEventType} onChangeText={setFormEventType} placeholder="e.g. Wedding, Pre-Wedding" placeholderTextColor="#C8C4BE" />
                  <NativeDateInput label="EVENT DATE *" value={formDate} onChange={handleDateChange} placeholder="Select date" />
                  {conflictWarn && <Text style={styles.conflictWarn}>⚠ {conflictWarn}</Text>}
                  <NativeDateInput label="FOLLOW-UP REMINDER" value={formReminder} onChange={setFormReminder} placeholder="Select reminder date (optional)" />
                  <Text style={styles.fieldLabel}>NOTE</Text>
                  <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]} value={formNote} onChangeText={setFormNote} placeholder="Any notes about this potential client..." placeholderTextColor="#C8C4BE" multiline />
                </>
              )}

              {/* Block date fields */}
              {creationType === 'block' && (
                <>
                  <NativeDateInput label="DATE *" value={formDate} onChange={handleDateChange} placeholder="Select date" />
                  {conflictWarn && <Text style={styles.conflictWarn}>⚠ {conflictWarn}</Text>}
                  <Text style={styles.fieldLabel}>REASON / NOTE</Text>
                  <TextInput
                    style={[styles.fieldInput, { height: 96, textAlignVertical: 'top' }]}
                    value={formNote} onChangeText={setFormNote}
                    placeholder="e.g. Personal commitment, Travel, Hold for client" placeholderTextColor="#C8C4BE" multiline
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.submitBtn, (!isFormValid() || fabLoading) && styles.submitBtnDisabled]}
                onPress={submitForm}
                disabled={!isFormValid() || fabLoading}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>
                  {fabLoading ? 'Saving...' : submitLabels[creationType!]}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: BG },
  shimmer:  { backgroundColor: WARM, borderRadius: 8, marginBottom: 4 },

  // Toast
  toast: {
    position: 'absolute', left: 24, right: 24, zIndex: 100,
    backgroundColor: DARK, borderRadius: 8, padding: 12, alignItems: 'center',
  },
  toastText: { fontFamily: DM300, fontSize: 12, color: '#F8F7F5' },

  // Header
  header:   { paddingHorizontal: 24, paddingBottom: 0 },
  backBtn:  { marginBottom: 20, alignSelf: 'flex-start' },
  eyebrow:  { fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: MUTED, marginBottom: 6 },
  title:    { fontFamily: CG300, fontSize: 28, color: DARK, lineHeight: 32, marginBottom: 28 },

  // Month navigator
  monthNav:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  monthLabel: { fontFamily: CG300, fontSize: 20, color: DARK },

  // Day headers
  dayHeaders: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 8 },
  dayHeader:  { flex: 1, fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: MUTED, textAlign: 'center' },

  // Grid
  grid:     { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, gap: 2 },
  dayCell:  { width: '14.28%', alignItems: 'center', paddingVertical: 6, position: 'relative' },
  fireEmoji: { position: 'absolute', top: 2, right: 2, fontSize: 7 },
  dayNumber: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayNumberToday: { backgroundColor: DARK },
  dayText:   { fontFamily: DM300, fontSize: 13, color: DARK },
  dayTextToday: { color: '#F8F7F5' },
  bookingDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: GOLD, marginTop: 2 },
  blockedX:   { fontFamily: DM400, fontSize: 10, color: RED_BG, marginTop: 1, lineHeight: 14 },

  // Legend
  legend:      { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 24, paddingTop: 12, gap: 12 },
  legendItem:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:   { width: 6, height: 6, borderRadius: 3 },
  legendSquare: { width: 8, height: 8, borderRadius: 2 },
  legendX:     { fontFamily: DM400, fontSize: 12 },
  legendText:  { fontFamily: DM300, fontSize: 11, color: MUTED },

  // Sync cards
  syncRow:   { paddingHorizontal: 24, paddingTop: 16 },
  syncCard:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 0.5, borderColor: BORDER, borderRadius: 10, padding: 14,
    backgroundColor: BG,
  },
  syncEyebrow: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: MUTED, marginBottom: 3 },
  syncTitle:   { fontFamily: DM300, fontSize: 13, color: DARK },
  syncCta:     { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: GOLD },

  // Import card
  importCard:   { borderWidth: 0.5, borderColor: BORDER, borderRadius: 10, padding: 16, backgroundColor: CARD },
  importHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  importTitle:  { fontFamily: CG300, fontSize: 18, color: DARK },
  importClose:  { fontFamily: DM300, fontSize: 20, color: MUTED },
  importInstructions: { fontFamily: DM300, fontSize: 12, color: MUTED, lineHeight: 18, marginBottom: 4 },
  importPickerBtn:  {
    borderWidth: 0.5, borderColor: GOLD, borderStyle: 'dashed', borderRadius: 8,
    padding: 14, alignItems: 'center',
  },
  importPickerLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, marginBottom: 4 },
  importPickerSub:   { fontFamily: DM300, fontSize: 12, color: MUTED },
  importResult:      { fontFamily: DM300, fontSize: 12, textAlign: 'center', marginTop: 10 },

  // Upcoming
  upcomingSection: { paddingHorizontal: 24, paddingTop: 28 },
  sectionLabel:    { fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: MUTED, marginBottom: 14 },
  emptyText:       { fontFamily: CG300, fontSize: 18, fontStyle: 'italic', color: MUTED },
  upcomingRow:     { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12 },
  upcomingRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  upcomingDate:    { fontFamily: DM300, fontSize: 11, color: MUTED, flexShrink: 0, minWidth: 48 },
  upcomingLabel:   { fontFamily: DM400, fontSize: 14, color: DARK, flex: 1 },
  upcomingType:    { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', flexShrink: 0 },

  // FAB
  fab: {
    position: 'absolute', right: 24,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: DARK, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 6, elevation: 5,
    zIndex: 90,
  },

  // Backdrop
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,17,17,0.4)', zIndex: 200 },

  // Day sheet
  daySheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 300,
    backgroundColor: BG, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20,
  },
  dragHandle:     { width: 32, height: 3, borderRadius: 2, backgroundColor: '#D8D4CE', alignSelf: 'center', marginBottom: 16 },
  daySheetDate:   { fontFamily: DM300, fontSize: 12, color: MUTED, marginBottom: 2 },
  daySheetHot:    { fontFamily: DM300, fontSize: 11, marginBottom: 12 },
  daySheetRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CARD, borderRadius: 10, padding: 12, borderWidth: 0.5, borderColor: BORDER },
  daySheetDot:    { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  daySheetRowTitle: { fontFamily: DM400, fontSize: 13, color: DARK },
  daySheetRowSub:   { fontFamily: DM300, fontSize: 11, color: MUTED },
  daySheetRowTag:   { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', flexShrink: 0 },
  daySheetClose:  { height: 40, borderRadius: 100, borderWidth: 0.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  daySheetCloseText: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: MUTED },

  // Hot nudge
  hotNudge: {
    position: 'absolute', left: 16, right: 16, zIndex: 50,
    backgroundColor: INK, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  hotNudgeHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  hotNudgeType:    { fontFamily: JOST, fontSize: 8, letterSpacing: 3, textTransform: 'uppercase' },
  hotNudgeTitle:   { fontFamily: CG300, fontSize: 18, color: '#F8F7F5', marginBottom: 6 },
  hotNudgeBody:    { fontFamily: DM300, fontSize: 12, color: 'rgba(248,247,245,0.5)', lineHeight: 18 },
  hotNudgeActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  hotNudgeBtn:     { backgroundColor: GOLD, borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8 },
  hotNudgeBtnText: { fontFamily: JOST, fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: INK },
  hotNudgeDismiss: { fontFamily: JOST, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(248,247,245,0.3)' },
  hotNudgeX:       { color: 'rgba(248,247,245,0.3)', fontSize: 18 },

  // FAB sheet
  fabSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 201,
    backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  fabSheetTitle: { fontFamily: CG300, fontSize: 22, color: DARK, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  fabTypeRow:    { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16 },
  fabTypeRowBorder: { borderBottomWidth: 1, borderBottomColor: BORDER },
  fabTypeName:   { fontFamily: DM400, fontSize: 14, color: DARK, marginBottom: 2 },
  fabTypeSub:    { fontFamily: DM300, fontSize: 12, color: MUTED },

  // FAB form
  fabFormHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16 },
  fabFormTitle:  { fontFamily: CG300, fontSize: 22, color: DARK },

  // Fields
  fieldLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: MUTED, marginBottom: 6, paddingHorizontal: 24 },
  fieldInput: {
    fontFamily: DM300, fontSize: 13, color: DARK,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    paddingHorizontal: 24, paddingVertical: 10, marginBottom: 20,
  },
  dateInput: {
    borderBottomWidth: 1, borderBottomColor: BORDER,
    paddingHorizontal: 24, paddingVertical: 10, marginBottom: 20,
  },
  dateInputText: { fontFamily: DM300, fontSize: 13, color: DARK },
  conflictWarn: { fontFamily: DM300, fontSize: 11, color: GOLD, paddingHorizontal: 24, marginTop: -12, marginBottom: 8, lineHeight: 16 },

  // Submit
  submitBtn: {
    marginHorizontal: 24, marginTop: 8, height: 48,
    backgroundColor: DARK, borderRadius: 0, alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#F8F7F5' },
});
