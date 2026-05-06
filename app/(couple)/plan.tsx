import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform,
  RefreshControl, Animated,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RAILWAY_URL } from '../../constants/tokens';
import { getCoupleSession } from '../../utils/session';

const API = RAILWAY_URL;

// ── Colours ────────────────────────────────────────────────────────────────
const GOLD   = '#C9A84C';
const INK    = '#0C0A09';
const BG     = '#F8F7F5';
const CARD   = '#FFFFFF';
const BORDER = '#E2DED8';
const MUTED  = '#8C8480';
const DARK   = '#111111';
const CREAM  = '#F8F7F5';

// ── Fonts ──────────────────────────────────────────────────────────────────
const CG300  = 'CormorantGaramond_300Light';
const DM300  = 'DMSans_300Light';
const DM400  = 'DMSans_400Regular';
const DM500  = 'DMSans_500Medium';

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = 'tasks' | 'money' | 'vendors' | 'people' | 'events' | 'muse';
type StatusFilter = 'all' | 'pending' | 'done';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string;
  event_name?: string;
  events?: { name: string };
  assigned_to?: string;
  notes?: string;
  is_complete?: boolean;
}

interface EventOption { id: string; name: string; }

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDue(d?: string): string {
  if (!d) return '';
  const dt = new Date(d); dt.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((dt.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return 'Due ' + new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function isOverdue(d?: string): boolean {
  if (!d) return false;
  const dt = new Date(d); dt.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return dt < today;
}

function groupByEvent(arr: Task[]): { group: string; items: Task[] }[] {
  const map = new Map<string, Task[]>();
  arr.forEach(t => {
    const k = t.events?.name || t.event_name || 'General';
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(t);
  });
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }));
}

// ── Shimmer ────────────────────────────────────────────────────────────────
function Shimmer({ height, width = '100%', borderRadius = 8, marginTop = 0 }: {
  height: number; width?: number | string; borderRadius?: number; marginTop?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0, duration: 700, useNativeDriver: false }),
      ])
    ).start();
  }, []);
  const bg = anim.interpolate({ inputRange: [0, 1], outputRange: ['#EEECE8', '#F8F7F5'] });
  return <Animated.View style={{ height, width: width as any, borderRadius, marginTop, backgroundColor: bg }} />;
}

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <View style={styles.toast} pointerEvents="none">
      <Text style={styles.toastText}>{msg}</Text>
    </View>
  );
}

// ── Pill ───────────────────────────────────────────────────────────────────
function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
      activeOpacity={0.8}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Bottom Sheet wrapper ────────────────────────────────────────────────────
function BottomSheet({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetKAV}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.sheetClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── AddTaskSheet ───────────────────────────────────────────────────────────
function AddTaskSheet({ visible, onClose, userId, events, onSuccess }: {
  visible: boolean; onClose: () => void; userId: string;
  events: EventOption[]; onSuccess: () => void;
}) {
  const [taskTitle, setTaskTitle] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('general');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  // Deduplicate events by name — couple_events can have duplicate rows from seeding
  const uniqueEvents = events.filter((ev, i, arr) => arr.findIndex(e => e.name === ev.name) === i);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }
  function reset() {
    setTaskTitle(''); setSelectedEvent('general'); setPriority('Medium');
    setDueDate(''); setVendorName(''); setNotes(''); setShowDatePicker(false);
  }

  async function handleSubmit() {
    if (!userId || !taskTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/couple/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: userId,
          event: selectedEvent || 'general',
          text: taskTitle.trim(),
          priority: priority.toLowerCase(),
          due_date: dueDate || null,
          assigned_to: vendorName.trim() || null,
          notes: notes.trim() || null,
          is_custom: true,
        }),
      });
      const json = await res.json();
      if (json.success === false) { showToast(json.error || 'Error adding task'); }
      else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Task added');
        onClose();
        reset();
        setTimeout(() => onSuccess(), 380);
      }
    } catch { showToast('Network error'); }
    finally { setSubmitting(false); }
  }

  const disabled = !taskTitle.trim() || submitting;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="New Task">
      <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.fieldLabel}>TASK</Text>
        <TextInput
          value={taskTitle} onChangeText={setTaskTitle}
          placeholder="What needs to be done?"
          placeholderTextColor={MUTED}
          style={styles.fieldInput}
        />

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>EVENT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4, flexDirection: 'row' }}>
          <Pill label="General" active={selectedEvent === 'general'} onPress={() => setSelectedEvent('general')} />
          {uniqueEvents.map(ev => (
            <Pill key={ev.id} label={ev.name} active={selectedEvent === ev.name} onPress={() => setSelectedEvent(ev.name)} />
          ))}
        </ScrollView>

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>PRIORITY</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['High', 'Medium', 'Low'].map(p => (
            <Pill key={p} label={p} active={priority === p} onPress={() => setPriority(p)} />
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>DUE DATE</Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={[styles.fieldInput, { justifyContent: 'center' }]}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: DM300, fontSize: 14, color: dueDate ? DARK : MUTED }}>
            {dueDate || 'Select a date'}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate ? new Date(dueDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (event.type === 'dismissed') { setShowDatePicker(false); return; }
              if (selectedDate) {
                const y = selectedDate.getFullYear();
                const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const d = String(selectedDate.getDate()).padStart(2, '0');
                setDueDate(`${y}-${m}-${d}`);
                setShowDatePicker(false);
              }
            }}
          />
        )}

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>MAKER (OPTIONAL)</Text>
        <TextInput
          value={vendorName} onChangeText={setVendorName}
          placeholder="e.g. Arjun Kartha Studio"
          placeholderTextColor={MUTED}
          style={styles.fieldInput}
        />

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>NOTES (OPTIONAL)</Text>
        <TextInput
          value={notes} onChangeText={setNotes}
          placeholder="Any details or reminders..."
          placeholderTextColor={MUTED}
          style={[styles.fieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 8 }]}
          multiline
        />
      </ScrollView>

      <View style={styles.sheetFooter}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={disabled}
          style={[styles.submitBtn, disabled && styles.submitBtnDisabled]}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>{submitting ? '...' : 'ADD TASK'}</Text>
        </TouchableOpacity>
      </View>
      <Toast msg={toast} />
    </BottomSheet>
  );
}

// ── EditTaskSheet ──────────────────────────────────────────────────────────
function EditTaskSheet({ visible, onClose, userId, task, events, onSuccess }: {
  visible: boolean; onClose: () => void; userId: string;
  task: Task; events: EventOption[]; onSuccess: () => void;
}) {
  const [taskTitle, setTaskTitle] = useState(task.title || '');
  const [selectedEvent, setSelectedEvent] = useState(task.event_name || task.events?.name || 'general');
  const [priority, setPriority] = useState(
    task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium'
  );
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.split('T')[0] : '');
  const [notes, setNotes] = useState(task.notes || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  // Deduplicate events by name
  const uniqueEvents = events.filter((ev, i, arr) => arr.findIndex(e => e.name === ev.name) === i);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    if (visible) {
      setTaskTitle(task.title || '');
      setSelectedEvent(task.event_name || task.events?.name || 'general');
      setPriority(task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium');
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      setNotes(task.notes || '');
    }
  }, [visible, task.id]);

  async function handleSubmit() {
    if (!taskTitle.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/couple/checklist/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: taskTitle.trim(),
          event: selectedEvent || 'general',
          priority: priority.toLowerCase(),
          due_date: dueDate || null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success === false) { showToast(json.error || 'Could not update task'); }
      else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Task updated');
        onClose();
        setTimeout(() => onSuccess(), 380);
      }
    } catch { showToast('Network error'); }
    finally { setSubmitting(false); }
  }

  const disabled = !taskTitle.trim() || submitting;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit Task">
      <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.fieldLabel}>TASK</Text>
        <TextInput
          value={taskTitle} onChangeText={setTaskTitle}
          placeholder="What needs to be done?"
          placeholderTextColor={MUTED}
          style={styles.fieldInput}
        />

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>EVENT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4, flexDirection: 'row' }}>
          <Pill label="General" active={selectedEvent === 'general'} onPress={() => setSelectedEvent('general')} />
          {uniqueEvents.map(ev => (
            <Pill key={ev.id} label={ev.name} active={selectedEvent === ev.name} onPress={() => setSelectedEvent(ev.name)} />
          ))}
        </ScrollView>

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>PRIORITY</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['High', 'Medium', 'Low'].map(p => (
            <Pill key={p} label={p} active={priority === p} onPress={() => setPriority(p)} />
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>DUE DATE</Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={[styles.fieldInput, { justifyContent: 'center' }]}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: DM300, fontSize: 14, color: dueDate ? DARK : MUTED }}>
            {dueDate || 'Select a date'}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate ? new Date(dueDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (event.type === 'dismissed') { setShowDatePicker(false); return; }
              if (selectedDate) {
                const y = selectedDate.getFullYear();
                const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const d = String(selectedDate.getDate()).padStart(2, '0');
                setDueDate(`${y}-${m}-${d}`);
                setShowDatePicker(false);
              }
            }}
          />
        )}

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>NOTES (OPTIONAL)</Text>
        <TextInput
          value={notes} onChangeText={setNotes}
          placeholder="Any details or reminders..."
          placeholderTextColor={MUTED}
          style={[styles.fieldInput, { height: 80, textAlignVertical: 'top', paddingTop: 8 }]}
          multiline
        />
      </ScrollView>

      <View style={styles.sheetFooter}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={disabled}
          style={[styles.submitBtn, disabled && styles.submitBtnDisabled]}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>{submitting ? '...' : 'SAVE CHANGES'}</Text>
        </TouchableOpacity>
      </View>
      <Toast msg={toast} />
    </BottomSheet>
  );
}

// ── CreateExpenseSheet (post-task-complete prompt) ─────────────────────────
function CreateExpenseSheet({ visible, onClose, userId, task, onSuccess }: {
  visible: boolean; onClose: () => void; userId: string;
  task: Task; onSuccess: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  const eventName = task.events?.name || task.event_name || 'general';
  const vendorName = task.assigned_to || '';

  async function handleSubmit() {
    if (!amount || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/couple/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: userId,
          vendor_name: vendorName || 'General',
          description: task.title,
          actual_amount: Number(amount),
          event: eventName || 'general',
          payment_status: 'committed',
          category: 'other',
        }),
      });
      const json = await res.json();
      if (json.success === false) { showToast(json.error || 'Error adding expense'); }
      else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Expense added');
        onSuccess();
        onClose();
        setAmount('');
      }
    } catch { showToast('Network error'); }
    finally { setSubmitting(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetKAV}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, paddingHorizontal: 20 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Log an expense?</Text>
          <Text style={[styles.sheetSubtitle, { marginBottom: 24 }]}>
            {task.title}{vendorName ? ` · ${vendorName}` : ''}
          </Text>
          <Text style={styles.fieldLabel}>AMOUNT PAID</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontFamily: DM300, fontSize: 14, color: MUTED, marginRight: 4 }}>₹</Text>
            <TextInput
              value={amount} onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={MUTED}
              keyboardType="numeric"
              style={[styles.fieldInput, { flex: 1 }]}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <TouchableOpacity onPress={onClose} style={styles.skipBtn} activeOpacity={0.8}>
              <Text style={styles.skipBtnText}>SKIP</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!amount || submitting}
              style={[styles.submitBtn, { flex: 1 }, (!amount || submitting) && styles.submitBtnDisabled]}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>{submitting ? '...' : 'LOG EXPENSE'}</Text>
            </TouchableOpacity>
          </View>
          <Toast msg={toast} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── TaskCard ───────────────────────────────────────────────────────────────
function TaskCard({ task, userId, events, onCompleted, onDeleted, onRestored, onReload, onExpenseAdded }: {
  task: Task; userId: string; events: EventOption[];
  onCompleted: (id: string) => void;
  onDeleted: (id: string) => void;
  onRestored: (id: string) => void;
  onReload: () => void;
  onExpenseAdded: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(task.status === 'done' || !!task.is_complete);
  const [deleting, setDeleting] = useState(false);
  const [expenseSheetOpen, setExpenseSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  const isDone = completed || task.status === 'done';
  const overdue = !isDone && isOverdue(task.due_date);
  const dueLabel = formatDue(task.due_date);
  const prioColor = task.priority === 'high' ? GOLD : task.priority === 'medium' ? MUTED : BORDER;
  const eventLabel = task.events?.name || task.event_name || '';

  async function handleComplete() {
    if (isDone || completing) return;
    setCompleting(true);
    try {
      await fetch(`${API}/api/couple/checklist/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: true }),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCompleted(true);
      onCompleted(task.id);
      setTimeout(() => setExpenseSheetOpen(true), 400);
    } catch { showToast('Could not update task'); }
    finally { setCompleting(false); }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await fetch(`${API}/api/couple/checklist/${task.id}`, { method: 'DELETE' });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onDeleted(task.id);
    } catch { showToast('Could not delete task'); setDeleting(false); }
  }

  async function handleMarkPending() {
    try {
      await fetch(`${API}/api/couple/checklist/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_complete: false, completed_at: null }),
      });
      setCompleted(false);
      setExpanded(false);
      onRestored(task.id);
      // Reload from API to guarantee DB state is reflected — is_complete: false
      // must round-trip through backend before we trust local state
      setTimeout(() => onReload(), 300);
    } catch { showToast('Could not update task'); }
  }

  return (
    <>
      <View style={[
        styles.taskCard,
        isDone && styles.taskCardDone,
        overdue && styles.taskCardOverdue,
      ]}>
        {/* Main row */}
        <TouchableOpacity
          onPress={() => setExpanded(v => !v)}
          style={styles.taskRow}
          activeOpacity={0.9}
        >
          {/* Checkbox */}
          <TouchableOpacity
            onPress={handleComplete}
            disabled={isDone || completing}
            style={[styles.checkbox, isDone && styles.checkboxDone]}
            activeOpacity={0.8}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            {isDone && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>

          {/* Content */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]} numberOfLines={2}>
              {task.title}
            </Text>
            <View style={styles.taskMeta}>
              {dueLabel ? (
                <Text style={[styles.taskDue, overdue && { color: GOLD }]}>{dueLabel}</Text>
              ) : null}
              {eventLabel && eventLabel !== 'General' ? (
                <View style={styles.eventTag}>
                  <Text style={styles.eventTagText}>{eventLabel.toUpperCase()}</Text>
                </View>
              ) : null}
              <View style={[styles.priorityDot, { backgroundColor: prioColor }]} />
            </View>
          </View>

          {/* Chevron */}
          <Text style={[styles.chevron, expanded && { transform: [{ rotate: '90deg' }] }]}>›</Text>
        </TouchableOpacity>

        {/* Expanded detail */}
        {expanded && (
          <View style={styles.taskExpanded}>
            {task.notes ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>NOTES</Text>
                <Text style={styles.detailValue}>{task.notes}</Text>
              </View>
            ) : null}
            {task.assigned_to ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>MAKER</Text>
                <Text style={styles.detailValue}>{task.assigned_to}</Text>
              </View>
            ) : null}
            {eventLabel ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>EVENT</Text>
                <Text style={styles.detailValue}>{eventLabel}</Text>
              </View>
            ) : null}
            {task.due_date ? (
              <View style={[styles.detailRow, { marginBottom: 16 }]}>
                <Text style={styles.detailLabel}>DUE</Text>
                <Text style={[styles.detailValue, overdue && { color: GOLD }]}>
                  {new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            ) : null}

            {/* Action buttons — locked interaction model */}
            <View style={styles.taskActions}>
              {!isDone ? (
                <>
                  <TouchableOpacity
                    onPress={() => setEditSheetOpen(true)}
                    style={styles.actionBtnOutline}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnOutlineText}>EDIT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setExpanded(false)}
                    style={styles.actionBtnFill}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnFillText}>OK</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDelete}
                    disabled={deleting}
                    style={styles.deleteBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.deleteBtnText}>{deleting ? '·' : '✕'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={handleMarkPending}
                    style={[styles.actionBtnOutline, { flex: 1 }]}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnOutlineText}>MARK AS PENDING</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDelete}
                    disabled={deleting}
                    style={styles.deleteBtn}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.deleteBtnText}>{deleting ? '·' : '✕'}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
      </View>

      <CreateExpenseSheet
        visible={expenseSheetOpen}
        onClose={() => setExpenseSheetOpen(false)}
        userId={userId}
        task={task}
        onSuccess={onExpenseAdded}
      />
      <EditTaskSheet
        visible={editSheetOpen}
        onClose={() => setEditSheetOpen(false)}
        userId={userId}
        task={task}
        events={events}
        onSuccess={() => { setEditSheetOpen(false); onCompleted(task.id); }}
      />
      <Toast msg={toast} />
    </>
  );
}

// ── TasksTab ───────────────────────────────────────────────────────────────
function TasksTab({ userId, events, refetch, onExpenseAdded }: {
  userId: string; events: EventOption[];
  refetch: number; onExpenseAdded: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

  async function loadTasks(triggerSeedIfEmpty = false) {
    try {
      const r = await fetch(`${API}/api/v2/couple/tasks/${userId}`);
      const d = await r.json();
      const taskList: Task[] = Array.isArray(d) ? d : [];
      if (triggerSeedIfEmpty && taskList.length === 0) {
        await fetch(`${API}/api/couple/checklist/seed/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const r2 = await fetch(`${API}/api/v2/couple/tasks/${userId}`);
        const d2 = await r2.json();
        setTasks(Array.isArray(d2) ? d2 : []);
      } else {
        setTasks(taskList);
      }
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    setLoading(true);
    loadTasks(true);
  }, [userId, refetch]);

  async function onRefresh() {
    setRefreshing(true);
    await loadTasks(false);
    setRefreshing(false);
  }

  function handleCompleted(id: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'done', is_complete: true } : t));
  }
  function handleDeleted(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }
  function handleRestored(id: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'pending', is_complete: false } : t));
  }

  const filtered = tasks.filter(t => {
    if (statusFilter === 'pending') return t.status !== 'done' && !t.is_complete;
    if (statusFilter === 'done') return t.status === 'done' || !!t.is_complete;
    return true;
  });
  const groups = groupByEvent(filtered);
  const pendingCount = tasks.filter(t => t.status !== 'done' && !t.is_complete).length;
  const doneCount = tasks.filter(t => t.status === 'done' || !!t.is_complete).length;

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
      >
        {/* Filter row */}
        <View style={styles.filterRow}>
          <View style={styles.filterPills}>
            {([
              { key: 'all' as StatusFilter, label: `All${tasks.length > 0 ? ' ' + tasks.length : ''}` },
              { key: 'pending' as StatusFilter, label: `Pending${pendingCount > 0 ? ' ' + pendingCount : ''}` },
              { key: 'done' as StatusFilter, label: `Done${doneCount > 0 ? ' ' + doneCount : ''}` },
            ]).map(fc => (
              <TouchableOpacity
                key={fc.key}
                onPress={() => setStatusFilter(fc.key)}
                style={[styles.filterPill, statusFilter === fc.key && styles.filterPillActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillText, statusFilter === fc.key && styles.filterPillTextActive]}>
                  {fc.label.trim()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.askBtn} activeOpacity={0.8}>
            <Text style={styles.askBtnStar}>✦</Text>
            <Text style={styles.askBtnText}> Ask</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading ? (
          <>
            {[0, 1, 2].map(g => (
              <View key={g} style={{ marginBottom: 24 }}>
                <Shimmer height={8} width={60} borderRadius={4} />
                <View style={{ marginTop: 12, gap: 8 }}>
                  <Shimmer height={68} />
                  <Shimmer height={68} />
                </View>
              </View>
            ))}
          </>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Your list is clear.</Text>
            <Text style={styles.emptyStateBody}>
              Tasks you add will appear here,{'\n'}grouped by your events.
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyState, { marginTop: 48 }]}>
            <Text style={[styles.emptyStateTitle, { fontSize: 20, color: MUTED }]}>
              {statusFilter === 'done' ? 'Nothing completed yet.' : 'All tasks are done.'}
            </Text>
          </View>
        ) : (
          groups.map(({ group, items }) => (
            <View key={group} style={{ marginBottom: 28 }}>
              <Text style={styles.groupHeader}>{group.toUpperCase()}</Text>
              <View style={{ gap: 8 }}>
                {items.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    userId={userId}
                    events={events}
                    onCompleted={handleCompleted}
                    onDeleted={handleDeleted}
                    onRestored={handleRestored}
                    onReload={() => loadTasks(false)}
                    onExpenseAdded={onExpenseAdded}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Gold FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 88 }]}
        onPress={() => { Haptics.selectionAsync(); setAddSheetOpen(true); }}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <AddTaskSheet
        visible={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        userId={userId}
        events={events}
        onSuccess={() => loadTasks(false)}
      />
    </>
  );
}


// ── MoneyTab ────────────────────────────────────────────────────────────────

interface MoneyData {
  totalBudget: number;
  committed: number;
  paid: number;
  events: { id: string; name: string; budget: number }[];
  thisWeek: MoneyExpense[];
  next30: MoneyExpense[];
}

interface MoneyExpense {
  id: string;
  vendor_name?: string;
  purpose?: string;
  description?: string;
  amount: number;
  actual_amount?: number;
  due_date?: string;
  status?: string;
  payment_status?: string;
  event_name?: string;
  event?: string;
  category?: string;
}

interface BudgetCategory {
  category_key: string;
  display_name: string;
  pct: number;
  allocated_amount: number;
}

type PaymentFilter = 'week' | 'next30';

function fmtINR(n: number) {
  if (!n) return '₹0';
  return '₹' + n.toLocaleString('en-IN');
}

// ── BudgetSetupSheet ─────────────────────────────────────────────────────────
const DEFAULT_BUDGET_CATEGORIES: BudgetCategory[] = [
  { category_key: 'venue',         display_name: 'Venue',                    pct: 50, allocated_amount: 0 },
  { category_key: 'attire',        display_name: 'Attire & Jewellery',       pct: 17, allocated_amount: 0 },
  { category_key: 'decor',         display_name: 'Decor & Florals',          pct: 15, allocated_amount: 0 },
  { category_key: 'photo',         display_name: 'Photography & Video',      pct: 10, allocated_amount: 0 },
  { category_key: 'beauty',        display_name: 'MUA, Hair & Mehendi',      pct: 6,  allocated_amount: 0 },
  { category_key: 'entertainment', display_name: 'Entertainment',            pct: 2,  allocated_amount: 0 },
  { category_key: 'invitations',   display_name: 'Invitations & Stationery', pct: 1,  allocated_amount: 0 },
  { category_key: 'other',         display_name: 'Other & Contingency',      pct: 5,  allocated_amount: 0 },
];

function BudgetSetupSheet({ visible, onClose, userId, currentTotal, onSaved }: {
  visible: boolean; onClose: () => void; userId: string;
  currentTotal: number; onSaved: (n: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'budget' | 'categories'>('budget');
  const [totalVal, setTotalVal] = useState(currentTotal > 0 ? String(currentTotal) : '');
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    if (visible) {
      setStep('budget');
      setTotalVal(currentTotal > 0 ? String(currentTotal) : '');
      fetch(`${API}/api/couple/budget-categories/${userId}`)
        .then(r => r.json())
        .then(d => { if (d.success && d.data?.length > 0) setCategories(d.data); })
        .catch(() => {});
    }
  }, [visible, currentTotal]);

  const total = Number(totalVal) || 0;

  function initCategories() {
    if (!total) return;
    setCategories(DEFAULT_BUDGET_CATEGORIES.map(c => ({
      ...c,
      allocated_amount: Math.round(total * c.pct / 100),
    })));
    setStep('categories');
  }

  function updateAmount(key: string, amount: number) {
    setCategories(prev => prev.map(c => c.category_key === key
      ? { ...c, allocated_amount: amount, pct: total > 0 ? Math.round(amount / total * 100) : 0 } : c));
  }

  const allocatedTotal = categories.reduce((s, c) => s + c.allocated_amount, 0);

  async function handleSave() {
    if (!total || saving) return;
    setSaving(true);
    try {
      await fetch(`${API}/api/couple/budget/${userId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ total_budget: total }),
      });
      if (categories.length > 0) {
        await fetch(`${API}/api/couple/budget-categories/${userId}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categories }),
        });
      }
      onSaved(total);
      onClose();
    } catch { showToast('Network error'); }
    finally { setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetKAV}>
        <View style={[styles.sheet, { maxHeight: '92%', paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{step === 'budget' ? 'Set your budget' : 'Category breakdown'}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.sheetClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {step === 'budget' ? (
            <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}
              keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>TOTAL BUDGET</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontFamily: DM300, fontSize: 18, color: MUTED, marginRight: 4 }}>₹</Text>
                <TextInput
                  value={totalVal} onChangeText={v => setTotalVal(v.replace(/[^0-9]/g, ''))}
                  placeholder="0" placeholderTextColor={MUTED} keyboardType="numeric"
                  style={[styles.fieldInput, { flex: 1, fontSize: 22 }]}
                />
              </View>
              <View style={{ marginTop: 28, gap: 10 }}>
                {total > 0 && (
                  <TouchableOpacity onPress={initCategories} style={[styles.submitBtn, { backgroundColor: DARK }]} activeOpacity={0.85}>
                    <Text style={styles.submitBtnText}>SET CATEGORY BUDGETS →</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!total || saving}
                  style={[styles.submitBtn, (!total || saving) && styles.submitBtnDisabled]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitBtnText}>{saving ? '...' : 'SAVE TOTAL ONLY'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <>
              <View style={{ paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 0.5, borderBottomColor: BORDER }}>
                <Text style={{ fontFamily: DM300, fontSize: 12, color: MUTED }}>
                  Allocated: {fmtINR(allocatedTotal)} / {fmtINR(total)}
                  {allocatedTotal > total ? ` · ${fmtINR(allocatedTotal - total)} over` :
                   allocatedTotal < total ? ` · ${fmtINR(total - allocatedTotal)} unallocated` : ' · balanced'}
                </Text>
              </View>
              <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}
                keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {categories.map(cat => (
                  <View key={cat.category_key} style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={{ fontFamily: DM300, fontSize: 13, color: '#3C3835', flex: 1 }}>{cat.display_name}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontFamily: DM300, fontSize: 12, color: MUTED }}>{cat.pct}%</Text>
                        <Text style={{ fontFamily: DM300, fontSize: 12, color: '#C8C4BE' }}> | ₹</Text>
                        <TextInput
                          value={String(cat.allocated_amount)}
                          onChangeText={v => updateAmount(cat.category_key, Number(v.replace(/[^0-9]/g, '')) || 0)}
                          keyboardType="numeric"
                          style={{ fontFamily: DM300, fontSize: 12, color: '#3C3835', width: 80, textAlign: 'right',
                            borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 2 }}
                        />
                      </View>
                    </View>
                    <View style={{ height: 4, backgroundColor: BORDER, borderRadius: 4 }}>
                      <View style={{ height: 4, borderRadius: 4, backgroundColor: GOLD,
                        width: `${Math.min(100, total > 0 ? (cat.allocated_amount / total) * 100 : 0)}%` as any }} />
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.sheetFooter}>
                <TouchableOpacity onPress={handleSave} disabled={saving}
                  style={[styles.submitBtn, saving && styles.submitBtnDisabled]} activeOpacity={0.85}>
                  <Text style={styles.submitBtnText}>{saving ? '...' : 'SAVE BUDGET'}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          <Toast msg={toast} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── AddExpenseSheet ──────────────────────────────────────────────────────────
function AddExpenseSheet({ visible, onClose, userId, events, onSuccess }: {
  visible: boolean; onClose: () => void; userId: string;
  events: EventOption[]; onSuccess: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('general');
  const [paymentStatus, setPaymentStatus] = useState('committed');
  const [dueDate, setDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const uniqueEvents = events.filter((ev, i, arr) => arr.findIndex(e => e.name === ev.name) === i);
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }
  function reset() {
    setVendorName(''); setVendorPhone(''); setDescription(''); setAmount('');
    setSelectedEvent('general'); setPaymentStatus('committed');
    setDueDate(''); setShowDatePicker(false);
  }

  async function handleSubmit() {
    if (!amount || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/couple/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: userId,
          vendor_name: vendorName.trim() || null,
          description: description.trim() || null,
          actual_amount: Number(amount),
          event: selectedEvent || 'general',
          payment_status: paymentStatus,
          category: 'other',
          due_date: dueDate || null,
        }),
      });
      const json = await res.json();
      if (json.success === false) { showToast(json.error || 'Error adding expense'); }
      else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Silent background vendor creation if phone provided
        const vendorCreated = vendorPhone.trim().length >= 10;
        if (vendorCreated) {
          fetch(`${API}/api/couple/vendors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              couple_id: userId,
              name: vendorName.trim() || description.trim() || 'Vendor',
              phone: vendorPhone.trim(),
              profile_incomplete: true,
              source: 'expense',
              status: 'considering',
              category: null,
            }),
          }).catch(() => {}); // silent — never surface error to user
        }
        showToast(vendorCreated
          ? `Expense logged · ${vendorName.trim() || 'Vendor'} added to Makers`
          : 'Expense logged');
        onClose();
        reset();
        setTimeout(() => onSuccess(), 380);
      }
    } catch { showToast('Network error'); }
    finally { setSubmitting(false); }
  }

  const disabled = !amount || submitting;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Add Expense">
      <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.fieldLabel}>VENDOR / MAKER (OPTIONAL)</Text>
        <TextInput value={vendorName} onChangeText={setVendorName}
          placeholder="e.g. Swati Roy MUA" placeholderTextColor={MUTED}
          style={styles.fieldInput} />

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>VENDOR PHONE (OPTIONAL)</Text>
        <TextInput value={vendorPhone} onChangeText={setVendorPhone}
          placeholder="e.g. 9999999999" placeholderTextColor={MUTED}
          keyboardType="phone-pad" style={styles.fieldInput} />

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>DESCRIPTION (OPTIONAL)</Text>
        <TextInput value={description} onChangeText={setDescription}
          placeholder="e.g. Advance payment" placeholderTextColor={MUTED}
          style={styles.fieldInput} />

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>AMOUNT *</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontFamily: DM300, fontSize: 14, color: MUTED, marginRight: 4 }}>₹</Text>
          <TextInput value={amount} onChangeText={v => setAmount(v.replace(/[^0-9]/g, ''))}
            placeholder="0" placeholderTextColor={MUTED} keyboardType="numeric"
            style={[styles.fieldInput, { flex: 1 }]} />
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>EVENT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4, flexDirection: 'row' }}>
          <Pill label="General" active={selectedEvent === 'general'} onPress={() => setSelectedEvent('general')} />
          {uniqueEvents.map(ev => (
            <Pill key={ev.id} label={ev.name} active={selectedEvent === ev.name} onPress={() => setSelectedEvent(ev.name)} />
          ))}
        </ScrollView>

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>STATUS</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['committed', 'paid'].map(s => (
            <Pill key={s} label={s === 'committed' ? 'Committed' : 'Paid'}
              active={paymentStatus === s} onPress={() => setPaymentStatus(s)} />
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>DUE DATE (OPTIONAL)</Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={[styles.fieldInput, { justifyContent: 'center' }]}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: DM300, fontSize: 14, color: dueDate ? DARK : MUTED }}>
            {dueDate || 'Select a date'}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate ? new Date(dueDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (event.type === 'dismissed') { setShowDatePicker(false); return; }
              if (selectedDate) {
                const y = selectedDate.getFullYear();
                const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const d = String(selectedDate.getDate()).padStart(2, '0');
                setDueDate(`${y}-${m}-${d}`);
                setShowDatePicker(false);
              }
            }}
          />
        )}
      </ScrollView>

      <View style={styles.sheetFooter}>
        <TouchableOpacity onPress={handleSubmit} disabled={disabled}
          style={[styles.submitBtn, disabled && styles.submitBtnDisabled]} activeOpacity={0.85}>
          <Text style={styles.submitBtnText}>{submitting ? '...' : 'ADD EXPENSE'}</Text>
        </TouchableOpacity>
      </View>
      <Toast msg={toast} />
    </BottomSheet>
  );
}

// ── EditExpenseSheet ─────────────────────────────────────────────────────────
function EditExpenseSheet({ visible, onClose, expense, events, onSuccess }: {
  visible: boolean; onClose: () => void;
  expense: MoneyExpense; events: EventOption[]; onSuccess: (updated: MoneyExpense) => void;
}) {
  const [vendorName, setVendorName] = useState(expense.vendor_name || '');
  const [description, setDescription] = useState(expense.purpose || expense.description || '');
  const [amount, setAmount] = useState(String(expense.actual_amount || expense.amount || ''));
  const [selectedEvent, setSelectedEvent] = useState(expense.event_name || expense.event || 'general');
  const [paymentStatus, setPaymentStatus] = useState(expense.payment_status || expense.status || 'committed');
  const [dueDate, setDueDate] = useState(expense.due_date ? expense.due_date.split('T')[0] : '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const uniqueEvents = events.filter((ev, i, arr) => arr.findIndex(e => e.name === ev.name) === i);
  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  useEffect(() => {
    if (visible) {
      setVendorName(expense.vendor_name || '');
      setDescription(expense.purpose || expense.description || '');
      setAmount(String(expense.actual_amount || expense.amount || ''));
      setSelectedEvent(expense.event_name || expense.event || 'general');
      setPaymentStatus(expense.payment_status || expense.status || 'committed');
      setDueDate(expense.due_date ? expense.due_date.split('T')[0] : '');
    }
  }, [visible, expense.id]);

  async function handleSubmit() {
    if (!amount || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/couple/expenses/${expense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_name: vendorName.trim() || null,
          description: description.trim() || null,
          actual_amount: Number(amount),
          event: selectedEvent || 'general',
          payment_status: paymentStatus,
          due_date: dueDate || null,
        }),
      });
      const json = await res.json();
      if (json.success === false) { showToast(json.error || 'Error updating'); }
      else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess({
          ...expense,
          vendor_name: vendorName.trim() || undefined,
          purpose: description.trim() || undefined,
          actual_amount: Number(amount),
          amount: Number(amount),
          event_name: selectedEvent,
          payment_status: paymentStatus,
          status: paymentStatus,
          due_date: dueDate || undefined,
        });
        onClose();
      }
    } catch { showToast('Network error'); }
    finally { setSubmitting(false); }
  }

  const disabled = !amount || submitting;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit Expense">
      <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetScrollContent}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        <Text style={styles.fieldLabel}>VENDOR / MAKER (OPTIONAL)</Text>
        <TextInput value={vendorName} onChangeText={setVendorName}
          placeholder="e.g. Swati Roy MUA" placeholderTextColor={MUTED}
          style={styles.fieldInput} />

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>DESCRIPTION (OPTIONAL)</Text>
        <TextInput value={description} onChangeText={setDescription}
          placeholder="e.g. Advance payment" placeholderTextColor={MUTED}
          style={styles.fieldInput} />

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>AMOUNT *</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontFamily: DM300, fontSize: 14, color: MUTED, marginRight: 4 }}>₹</Text>
          <TextInput value={amount} onChangeText={v => setAmount(v.replace(/[^0-9]/g, ''))}
            placeholder="0" placeholderTextColor={MUTED} keyboardType="numeric"
            style={[styles.fieldInput, { flex: 1 }]} />
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>EVENT</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 4, flexDirection: 'row' }}>
          <Pill label="General" active={selectedEvent === 'general'} onPress={() => setSelectedEvent('general')} />
          {uniqueEvents.map(ev => (
            <Pill key={ev.id} label={ev.name} active={selectedEvent === ev.name} onPress={() => setSelectedEvent(ev.name)} />
          ))}
        </ScrollView>

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>STATUS</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['committed', 'paid'].map(s => (
            <Pill key={s} label={s === 'committed' ? 'Committed' : 'Paid'}
              active={paymentStatus === s} onPress={() => setPaymentStatus(s)} />
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>DUE DATE (OPTIONAL)</Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={[styles.fieldInput, { justifyContent: 'center' }]}
          activeOpacity={0.8}
        >
          <Text style={{ fontFamily: DM300, fontSize: 14, color: dueDate ? DARK : MUTED }}>
            {dueDate || 'Select a date'}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={dueDate ? new Date(dueDate) : new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (event.type === 'dismissed') { setShowDatePicker(false); return; }
              if (selectedDate) {
                const y = selectedDate.getFullYear();
                const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const d = String(selectedDate.getDate()).padStart(2, '0');
                setDueDate(`${y}-${m}-${d}`);
                setShowDatePicker(false);
              }
            }}
          />
        )}
      </ScrollView>
      <View style={styles.sheetFooter}>
        <TouchableOpacity onPress={handleSubmit} disabled={disabled}
          style={[styles.submitBtn, disabled && styles.submitBtnDisabled]} activeOpacity={0.85}>
          <Text style={styles.submitBtnText}>{submitting ? '...' : 'SAVE CHANGES'}</Text>
        </TouchableOpacity>
      </View>
      <Toast msg={toast} />
    </BottomSheet>
  );
}

// ── ExpenseDetailSheet ────────────────────────────────────────────────────────
function ExpenseDetailSheet({ visible, onClose, expense, events, onUpdated, onDeleted }: {
  visible: boolean; onClose: () => void;
  expense: MoneyExpense | null; events: EventOption[];
  onUpdated: (updated: MoneyExpense) => void;
  onDeleted: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  if (!expense) return null;

  const isPaid = expense.status === 'paid' || expense.payment_status === 'paid';

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await fetch(`${API}/api/couple/expenses/${expense.id}`, { method: 'DELETE' });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onDeleted(expense.id);
      onClose();
    } catch { showToast('Could not delete'); setDeleting(false); }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: '85%' }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{expense.vendor_name || '—'}</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.sheetClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            {/* Amount + status */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontFamily: CG300, fontSize: 32, color: isPaid ? MUTED : DARK }}>
                {fmtINR(expense.actual_amount || expense.amount || 0)}
              </Text>
              <View style={[styles.statusTag, isPaid ? styles.statusTagPaid : styles.statusTagCommitted]}>
                <Text style={[styles.statusTagText, isPaid ? styles.statusTagTextPaid : styles.statusTagTextCommitted]}>
                  {isPaid ? 'PAID' : 'COMMITTED'}
                </Text>
              </View>
            </View>

            {/* Detail rows */}
            {expense.purpose || expense.description ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>DESCRIPTION</Text>
                <Text style={styles.detailValue}>{expense.purpose || expense.description}</Text>
              </View>
            ) : null}

            {expense.event_name || expense.event ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>EVENT</Text>
                <Text style={styles.detailValue}>{expense.event_name || expense.event}</Text>
              </View>
            ) : null}

            {expense.due_date ? (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>DUE DATE</Text>
                <Text style={styles.detailValue}>
                  {new Date(expense.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
              </View>
            ) : null}

            {/* Actions */}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                onPress={() => setEditOpen(true)}
                style={[styles.actionBtnFill, { flex: 1 }]}
                activeOpacity={0.85}
              >
                <Text style={styles.actionBtnFillText}>EDIT</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                disabled={deleting}
                style={[styles.actionBtnOutline, { flex: 1 }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.actionBtnOutlineText, { color: deleting ? MUTED : '#C0392B' }]}>
                  {deleting ? '...' : 'DELETE'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          <Toast msg={toast} />
        </View>
      </Modal>

      {expense && (
        <EditExpenseSheet
          visible={editOpen}
          onClose={() => setEditOpen(false)}
          expense={expense}
          events={events}
          onSuccess={updated => {
            onUpdated(updated);
            setEditOpen(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

// ── MoneyTab ─────────────────────────────────────────────────────────────────
function MoneyTab({ userId, events, refetch, tier }: {
  userId: string; events: EventOption[]; refetch: number; tier: string;
}) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<MoneyData | null>(null);
  const [allExpenses, setAllExpenses] = useState<MoneyExpense[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [payFilter, setPayFilter] = useState<PaymentFilter>('week');
  const [budgetSheetOpen, setBudgetSheetOpen] = useState(false);
  const [addExpenseSheetOpen, setAddExpenseSheetOpen] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [fetchedTier, setFetchedTier] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<MoneyExpense | null>(null);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  function loadData() {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/v2/couple/money/${userId}`).then(r => r.json()),
      fetch(`${API}/api/couple/expenses/${userId}`).then(r => r.json()),
      fetch(`${API}/api/couple/budget-categories/${userId}`).then(r => r.json()).catch(() => ({ success: false })),
      fetch(`${API}/api/v2/couple/profile/${userId}`).then(r => r.json()).catch(() => null),
    ]).then(([money, exps, cats, profile]) => {
      if (cats?.success && cats.data?.length > 0) setBudgetCategories(cats.data);
      // Resolve tier from profile — more reliable than session field
      const resolvedTier = profile?.couple?.couple_tier || profile?.couple?.tier || null;
      if (resolvedTier) setFetchedTier(resolvedTier);
      setData(money);
      const rows = (exps?.data || exps || []) as any[];
      setAllExpenses(rows.map(e => ({
        ...e,
        actual_amount: e.actual_amount || 0,
        amount: e.actual_amount || 0,
        status: e.payment_status || 'committed',
        purpose: e.description || e.purpose || null,
        event_name: e.event || e.event_name || null,
      })));
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [userId, refetch]);

  async function handleMarkPaid(expId: string) {
    if (markingPaid) return;
    setMarkingPaid(expId);
    try {
      await fetch(`${API}/api/couple/expenses/${expId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_status: 'paid' }),
      });
      setAllExpenses(prev => prev.map(e => e.id === expId
        ? { ...e, status: 'paid', payment_status: 'paid' } : e));
      fetch(`${API}/api/v2/couple/money/${userId}`).then(r => r.json()).then(setData).catch(() => {});
      showToast('Marked as paid');
    } catch { showToast('Could not update'); }
    finally { setMarkingPaid(null); }
  }

  async function handleDeleteExpense(expId: string) {
    try {
      await fetch(`${API}/api/couple/expenses/${expId}`, { method: 'DELETE' });
      setAllExpenses(prev => prev.filter(e => e.id !== expId));
      fetch(`${API}/api/v2/couple/money/${userId}`).then(r => r.json()).then(setData).catch(() => {});
    } catch { showToast('Could not delete'); }
  }

  const d = data || { totalBudget: 0, committed: 0, paid: 0, events: [], thisWeek: [], next30: [] };
  const committedPct = d.totalBudget ? Math.min(100, (d.committed / d.totalBudget) * 100) : 0;
  const paidPct = d.totalBudget ? Math.min(100, (d.paid / d.totalBudget) * 100) : 0;
  const remaining = d.totalBudget - d.committed;

  const now = new Date(); now.setHours(0, 0, 0, 0);
  const in7 = new Date(now); in7.setDate(now.getDate() + 7);
  const in30 = new Date(now); in30.setDate(now.getDate() + 30);
  const unpaid = allExpenses.filter(e => e.status !== 'paid' && e.payment_status !== 'paid');
  const thisWeekPayments = unpaid.filter(e => {
    if (!e.due_date) return false;
    const dt = new Date(e.due_date); dt.setHours(0, 0, 0, 0);
    return dt >= now && dt <= in7;
  });
  const next30Payments = unpaid.filter(e => {
    if (!e.due_date) return false;
    const dt = new Date(e.due_date); dt.setHours(0, 0, 0, 0);
    return dt > in7 && dt <= in30;
  });
  const payments = payFilter === 'week' ? thisWeekPayments : next30Payments;

  if (loading) {
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Shimmer height={140} borderRadius={16} />
        <View style={{ marginTop: 20, gap: 10 }}>
          <Shimmer height={8} width={80} borderRadius={4} />
          <Shimmer height={80} borderRadius={12} />
          <Shimmer height={80} borderRadius={12} />
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        {/* UpgradeCard — hidden for platinum, hidden until Razorpay KYC Aug 1 */}
        {((fetchedTier || tier) !== 'platinum' && (fetchedTier || tier) !== 'prestige') && (
          <View style={{ backgroundColor: '#0C0A09', borderRadius: 16, padding: 24, marginBottom: 20 }}>
            <Text style={{ fontFamily: DM300, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: GOLD, marginBottom: 8 }}>
              UPGRADE
            </Text>
            <Text style={{ fontFamily: CG300, fontSize: 22, color: '#F8F7F5', marginBottom: 16, lineHeight: 28 }}>
              {(fetchedTier || tier) === 'signature' ? 'Your AI wedding planner awaits.' : 'Unlock the full journey.'}
            </Text>
            <Text style={{ fontFamily: DM300, fontSize: 13, color: '#888580', marginBottom: 4 }}>
              · {(fetchedTier || tier) === 'signature' ? 'DreamAi — your AI wedding planner' : 'Priority discovery'}
            </Text>
            <Text style={{ fontFamily: DM300, fontSize: 13, color: '#888580', marginBottom: 16 }}>
              · {(fetchedTier || tier) === 'signature' ? 'Couture appointments' : 'Unlock full vendor profiles'}
            </Text>
            <Text style={{ fontFamily: DM300, fontSize: 11, color: '#555250', fontStyle: 'italic' }}>
              Payments activate August 1.
            </Text>
          </View>
        )}
        <View style={styles.moneyHeaderRow}>
          <Text style={styles.moneyHeaderLabel}>BUDGET</Text>
          <TouchableOpacity style={styles.askBtn} activeOpacity={0.8}>
            <Text style={styles.askBtnStar}>✦</Text>
            <Text style={styles.askBtnText}> Ask</Text>
          </TouchableOpacity>
        </View>

        {/* Budget hero */}
        <TouchableOpacity
          onPress={() => setBudgetSheetOpen(true)}
          style={styles.budgetHero}
          activeOpacity={0.9}
        >
          <Text style={styles.budgetHeroLabel}>TOTAL BUDGET ›</Text>
          <Text style={styles.budgetHeroAmount}>
            {d.totalBudget > 0 ? fmtINR(d.totalBudget) : 'Tap to set'}
          </Text>
          <View style={styles.budgetStats}>
            {[{ label: 'Committed', val: d.committed }, { label: 'Paid', val: d.paid }, { label: 'Remaining', val: remaining }].map(s => (
              <View key={s.label}>
                <Text style={styles.budgetStatLabel}>{s.label}</Text>
                <Text style={[styles.budgetStatVal, s.label === 'Remaining' && remaining < 0 && { color: GOLD }]}>
                  {fmtINR(s.val)}
                </Text>
              </View>
            ))}
          </View>
          {/* Progress bar: gold = committed layer, dark = paid layer */}
          <View style={styles.progressBg}>
            <View style={[styles.progressCommitted, { width: `${committedPct}%` as any }]} />
            <View style={[styles.progressPaid, { width: `${paidPct}%` as any }]} />
          </View>
          {d.totalBudget > 0 && (
            <Text style={styles.progressLabel}>
              {Math.round(committedPct)}% committed · {Math.round(paidPct)}% paid
            </Text>
          )}
        </TouchableOpacity>

        {/* Category breakdown */}
        {budgetCategories.length > 0 && d.totalBudget > 0 && (
          <View style={{ marginBottom: 28 }}>
            <Text style={styles.moneySectionLabel}>BY CATEGORY</Text>
            <View style={{ gap: 8 }}>
              {budgetCategories.map(cat => {
                const catSpent = allExpenses
                  .filter(e => e.category === cat.category_key)
                  .reduce((s, e) => s + (e.actual_amount || e.amount || 0), 0);
                const catPct = cat.allocated_amount > 0
                  ? Math.min(100, (catSpent / cat.allocated_amount) * 100) : 0;
                return (
                  <View key={cat.category_key} style={styles.categoryRow}>
                    <Text style={styles.categoryName} numberOfLines={1}>{cat.display_name}</Text>
                    <View style={styles.categoryTrackBg}>
                      <View style={[
                        styles.categoryTrackFill,
                        { width: `${catPct}%` as any, backgroundColor: catPct > 90 ? GOLD : DARK },
                      ]} />
                    </View>
                    <Text style={styles.categoryAmount}>{fmtINR(cat.allocated_amount)}</Text>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setBudgetSheetOpen(true)} style={styles.editCatBtn} activeOpacity={0.8}>
              <Text style={styles.editCatBtnText}>EDIT CATEGORIES</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming payments */}
        <View style={{ marginBottom: 28 }}>
          <View style={styles.upcomingHeader}>
            <Text style={styles.moneySectionLabel}>UPCOMING</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {([{ key: 'week' as PaymentFilter, label: 'This Week' }, { key: 'next30' as PaymentFilter, label: 'Next 30' }]).map(f => (
                <TouchableOpacity
                  key={f.key}
                  onPress={() => setPayFilter(f.key)}
                  style={[styles.filterPill, payFilter === f.key && styles.filterPillActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterPillText, payFilter === f.key && styles.filterPillTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {payments.length === 0 ? (
            <Text style={[styles.emptyText, { textAlign: 'center', paddingVertical: 20 }]}>
              {payFilter === 'week' ? 'No payments due this week.' : 'No payments due in the next 30 days.'}
            </Text>
          ) : (
            <View style={{ gap: 8 }}>
              {payments.map(exp => (
                <View key={exp.id} style={styles.paymentCard}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.paymentVendor} numberOfLines={1}>
                      {exp.vendor_name || '—'}
                    </Text>
                    <Text style={styles.paymentMeta}>
                      {[exp.purpose, exp.due_date ? formatDue(exp.due_date) : null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                    <Text style={styles.paymentAmount}>{fmtINR(exp.actual_amount || exp.amount || 0)}</Text>
                    <TouchableOpacity
                      onPress={() => handleMarkPaid(exp.id)}
                      disabled={markingPaid === exp.id}
                      style={[styles.markPaidBtn, markingPaid === exp.id && { opacity: 0.6 }]}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.markPaidBtnText}>
                        {markingPaid === exp.id ? '...' : 'MARK PAID'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* All entries */}
        {allExpenses.length > 0 ? (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.moneySectionLabel}>ALL ENTRIES</Text>
            {allExpenses.map((exp, i) => {
              const isPaid = exp.status === 'paid' || exp.payment_status === 'paid';
              return (
                <TouchableOpacity
                  key={exp.id}
                  style={[styles.expenseRow, i < allExpenses.length - 1 && styles.expenseRowBorder]}
                  onPress={() => setSelectedExpense(exp)}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.expenseVendor, isPaid && { opacity: 0.5 }]} numberOfLines={1}>
                      {exp.vendor_name || '—'}
                    </Text>
                    <Text style={styles.expenseMeta}>
                      {[exp.purpose, exp.event_name].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                    <Text style={[styles.expenseAmount, isPaid && { color: MUTED }]}>
                      {fmtINR(exp.actual_amount || exp.amount || 0)}
                    </Text>
                    <View style={[styles.statusTag, isPaid ? styles.statusTagPaid : styles.statusTagCommitted]}>
                      <Text style={[styles.statusTagText, isPaid ? styles.statusTagTextPaid : styles.statusTagTextCommitted]}>
                        {isPaid ? 'PAID' : 'COMMITTED'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontFamily: DM300, fontSize: 14, color: '#C8C4BE', paddingLeft: 8 }}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No expenses yet.</Text>
            <Text style={[styles.emptyStateBody, { fontSize: 14 }]}>Tap + to log your first entry.</Text>
          </View>
        )}
      </ScrollView>

      {/* Gold FAB */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 88 }]}
        onPress={() => { Haptics.selectionAsync(); setAddExpenseSheetOpen(true); }}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <BudgetSetupSheet
        visible={budgetSheetOpen}
        onClose={() => setBudgetSheetOpen(false)}
        userId={userId}
        currentTotal={d.totalBudget}
        onSaved={n => { setData(prev => prev ? { ...prev, totalBudget: n } : prev); loadData(); }}
      />
      <AddExpenseSheet
        visible={addExpenseSheetOpen}
        onClose={() => setAddExpenseSheetOpen(false)}
        userId={userId}
        events={events}
        onSuccess={loadData}
      />
      <ExpenseDetailSheet
        visible={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        expense={selectedExpense}
        events={events}
        onUpdated={updated => {
          setAllExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
          setSelectedExpense(null);
          fetch(`${API}/api/v2/couple/money/${userId}`).then(r => r.json()).then(setData).catch(() => {});
        }}
        onDeleted={id => {
          setAllExpenses(prev => prev.filter(e => e.id !== id));
          setSelectedExpense(null);
          fetch(`${API}/api/v2/couple/money/${userId}`).then(r => r.json()).then(setData).catch(() => {});
        }}
      />
      <Toast msg={toast} />
    </>
  );
}


// ── Main Plan Screen ───────────────────────────────────────────────────────
const TABS: { key: Tab; label: string }[] = [
  { key: 'tasks',   label: 'Tasks'   },
  { key: 'money',   label: 'Money'   },
  { key: 'vendors', label: 'Vendors' },
  { key: 'people',  label: 'Guests'  },
  { key: 'events',  label: 'Events'  },
  { key: 'muse',    label: 'Muse'    },
];

export default function CouplePlanScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('tasks');
  const [userId, setUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [refetch, setRefetch] = useState(0);
  const [tier, setTier] = useState<string>('lite');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        const s = await getCoupleSession();
        if (cancelled || !s) return;
        setUserId(s.id);
        if (s.dreamer_type) setTier(s.dreamer_type);
        else if (s.tier) setTier(s.tier);
        try {
          const r = await fetch(`${API}/api/v2/couple/events/${s.id}`);
          const d = await r.json();
          const evList = Array.isArray(d) ? d : (d?.data || []);
          if (!cancelled) setEvents(evList.map((e: any) => ({ id: e.id, name: e.event_name || e.name })));
        } catch {}
      }
      load();
      return () => { cancelled = true; };
    }, [])
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Top pill nav — PLAN · AI · DISCOVER */}
      <View style={styles.topPillNav}>
        {['PLAN', 'AI', 'DISCOVER'].map((p, i) => (
          <TouchableOpacity
            key={p}
            style={[styles.topPill, i === 0 && styles.topPillActive]}
            activeOpacity={0.85}
          >
            <Text style={[
              styles.topPillText,
              i === 0 && styles.topPillTextActive,
              i === 1 && styles.topPillTextAi,
            ]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sub-tab strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.subTabBar}
        contentContainerStyle={styles.subTabBarContent}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.subTab, activeTab === tab.key && styles.subTabActive]}
            onPress={() => { setActiveTab(tab.key); Haptics.selectionAsync(); }}
            activeOpacity={0.85}
          >
            <Text style={[styles.subTabText, activeTab === tab.key && styles.subTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab content */}
      {activeTab === 'tasks' && userId ? (
        <TasksTab
          userId={userId}
          events={events}
          refetch={refetch}
          onExpenseAdded={() => setRefetch(r => r + 1)}
        />
      ) : activeTab === 'money' && userId ? (
        <MoneyTab
          userId={userId}
          events={events}
          refetch={refetch}
          tier={tier}
        />
      ) : (
        <View style={styles.placeholderWrap}>
          <Text style={styles.placeholderText}>{TABS.find(t => t.key === activeTab)?.label} — coming soon</Text>
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  // Top pill nav
  topPillNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: BG,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    gap: 4,
  },
  topPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 100,
  },
  topPillActive: {
    backgroundColor: DARK,
  },
  topPillText: {
    fontFamily: DM300,
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: MUTED,
  },
  topPillTextActive: { color: '#FAFAF8' },
  topPillTextAi: { color: GOLD },

  // Sub-tab strip
  subTabBar: {
    flexGrow: 0,
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  subTabBarContent: {
    paddingHorizontal: 20,
    paddingVertical: 0,
    gap: 0,
  },
  subTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: DARK,
  },
  subTabText: {
    fontFamily: DM300,
    fontSize: 13,
    color: MUTED,
  },
  subTabTextActive: {
    color: DARK,
    fontFamily: DM500,
  },

  // Placeholder
  // Money tab
  moneyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  moneyHeaderLabel: { fontFamily: 'DMSans_300Light', fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: '#C8C4BE' },
  moneySectionLabel: { fontFamily: 'DMSans_300Light', fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: '#C8C4BE', marginBottom: 12 },
  budgetHero: { backgroundColor: '#F4F1EC', borderWidth: 1, borderColor: '#E2DED8', borderRadius: 16, padding: 24, marginBottom: 20 },
  budgetHeroLabel: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: '#8C8480', marginBottom: 4 },
  budgetHeroAmount: { fontFamily: 'CormorantGaramond_300Light', fontSize: 40, color: '#0C0A09', lineHeight: 44, marginBottom: 16 },
  budgetStats: { flexDirection: 'row', gap: 32, marginBottom: 14 },
  budgetStatLabel: { fontFamily: 'DMSans_300Light', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: '#8C8480', marginBottom: 3 },
  budgetStatVal: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#3C3835' },
  progressBg: { height: 6, borderRadius: 8, backgroundColor: '#E2DED8', overflow: 'hidden', position: 'relative' as const },
  progressCommitted: { position: 'absolute' as const, left: 0, top: 0, height: 6, backgroundColor: '#C9A84C', borderRadius: 8 },
  progressPaid: { position: 'absolute' as const, left: 0, top: 0, height: 6, backgroundColor: '#0C0A09', borderRadius: 8 },
  progressLabel: { fontFamily: 'DMSans_300Light', fontSize: 11, color: '#8C8480', marginTop: 6 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  categoryName: { fontFamily: 'DMSans_300Light', fontSize: 12, color: '#3C3835', width: 130, flexShrink: 0 },
  categoryTrackBg: { flex: 1, height: 4, backgroundColor: '#E2DED8', borderRadius: 4, overflow: 'hidden' },
  categoryTrackFill: { height: 4, borderRadius: 4 },
  categoryAmount: { fontFamily: 'DMSans_300Light', fontSize: 11, color: '#8C8480', width: 64, textAlign: 'right' as const, flexShrink: 0 },
  editCatBtn: { marginTop: 10, borderWidth: 0.5, borderColor: '#E2DED8', borderRadius: 100, paddingVertical: 5, paddingHorizontal: 12, alignSelf: 'flex-start' as const },
  editCatBtnText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#8C8480' },
  upcomingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  paymentCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2DED8', borderRadius: 14, padding: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentVendor: { fontFamily: 'CormorantGaramond_300Light', fontSize: 16, color: '#0C0A09', marginBottom: 2 },
  paymentMeta: { fontFamily: 'DMSans_300Light', fontSize: 12, color: '#8C8480' },
  paymentAmount: { fontFamily: 'DMSans_400Regular', fontSize: 15, color: '#C9A84C', marginBottom: 6 },
  markPaidBtn: { backgroundColor: '#111111', borderRadius: 100, paddingVertical: 4, paddingHorizontal: 10 },
  markPaidBtnText: { fontFamily: 'DMSans_400Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: '#F8F7F5' },
  expenseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  expenseRowBorder: { borderBottomWidth: 1, borderBottomColor: '#E2DED8' },
  expenseVendor: { fontFamily: 'CormorantGaramond_300Light', fontSize: 16, color: '#0C0A09', marginBottom: 2 },
  expenseMeta: { fontFamily: 'DMSans_300Light', fontSize: 12, color: '#8C8480' },
  expenseAmount: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#3C3835', marginBottom: 4 },
  statusTag: { borderRadius: 100, paddingHorizontal: 7, paddingVertical: 2 },
  statusTagPaid: { backgroundColor: '#F4F1EC' },
  statusTagCommitted: { backgroundColor: '#FFF8EC' },
  statusTagText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' },
  statusTagTextPaid: { color: '#8C8480' },
  statusTagTextCommitted: { color: '#C9A84C' },
  placeholderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontFamily: DM300, fontSize: 13, color: MUTED },

  // Toast
  toast: {
    position: 'absolute', bottom: 80, alignSelf: 'center',
    backgroundColor: DARK, borderRadius: 100,
    paddingHorizontal: 20, paddingVertical: 12, zIndex: 999,
  },
  toastText: { fontFamily: DM300, fontSize: 13, color: '#F8F7F5' },

  // Pill
  pill: {
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 100,
    borderWidth: 1, borderColor: BORDER,
  },
  pillActive: { backgroundColor: DARK, borderColor: DARK },
  pillText: { fontFamily: DM300, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: MUTED },
  pillTextActive: { color: '#F8F7F5' },

  // Filter row
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  filterPills: { flexDirection: 'row', gap: 6 },
  filterPill: {
    paddingVertical: 4, paddingHorizontal: 11, borderRadius: 100,
    borderWidth: 1, borderColor: BORDER,
  },
  filterPillActive: { backgroundColor: DARK, borderColor: DARK },
  filterPillText: { fontFamily: DM300, fontSize: 10, letterSpacing: 1, color: MUTED },
  filterPillTextActive: { color: '#FAFAF8' },
  askBtn: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 0.5, borderColor: BORDER,
    borderRadius: 100, paddingVertical: 4, paddingHorizontal: 10,
  },
  askBtnStar: { fontSize: 10, color: MUTED },
  askBtnText: { fontFamily: DM300, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: MUTED },

  // Group header
  groupHeader: {
    fontFamily: DM300, fontSize: 10, letterSpacing: 1.8,
    textTransform: 'uppercase', color: '#C8C4BE', marginBottom: 10,
  },

  // Task card
  taskCard: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    overflow: 'hidden',
  },
  taskCardDone: { backgroundColor: 'transparent', opacity: 0.55 },
  taskCardOverdue: { borderColor: GOLD },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: BORDER,
    backgroundColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxDone: { backgroundColor: GOLD, borderColor: GOLD },
  checkmark: { color: '#FFFFFF', fontSize: 12, lineHeight: 14 },
  taskTitle: {
    fontFamily: CG300, fontSize: 17, color: INK,
    marginBottom: 4, lineHeight: 22,
  },
  taskTitleDone: {
    color: MUTED, textDecorationLine: 'line-through',
  },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  taskDue: { fontFamily: DM300, fontSize: 12, color: MUTED },
  eventTag: {
    backgroundColor: '#F4F1EC', borderRadius: 100,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  eventTagText: {
    fontFamily: DM300, fontSize: 9,
    letterSpacing: 1, textTransform: 'uppercase', color: MUTED,
  },
  priorityDot: { width: 4, height: 4, borderRadius: 2 },
  chevron: { fontFamily: DM300, fontSize: 16, color: '#C8C4BE', flexShrink: 0, marginTop: 2 },

  // Expanded task
  taskExpanded: {
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    padding: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FAFAF8',
  },
  detailRow: { marginBottom: 12 },
  detailLabel: {
    fontFamily: DM300, fontSize: 9, letterSpacing: 1.5,
    textTransform: 'uppercase', color: MUTED, marginBottom: 4,
  },
  detailValue: { fontFamily: DM300, fontSize: 13, color: '#3C3835', lineHeight: 20 },
  taskActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionBtnOutline: {
    flex: 1, height: 38, borderRadius: 100,
    borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnOutlineText: {
    fontFamily: DM300, fontSize: 10, letterSpacing: 1.5,
    textTransform: 'uppercase', color: '#555250',
  },
  actionBtnFill: {
    flex: 1, height: 38, borderRadius: 100,
    backgroundColor: DARK,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnFillText: {
    fontFamily: DM400, fontSize: 10, letterSpacing: 1.5,
    textTransform: 'uppercase', color: '#F8F7F5',
  },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  deleteBtnText: { fontFamily: DM300, fontSize: 14, color: MUTED },

  // Empty states
  emptyState: { marginTop: 72, alignItems: 'center' },
  emptyStateTitle: {
    fontFamily: CG300, fontSize: 24, fontStyle: 'italic',
    color: '#3C3835', marginBottom: 10, textAlign: 'center',
  },
  emptyStateBody: {
    fontFamily: DM300, fontSize: 14, color: MUTED,
    marginBottom: 28, lineHeight: 22, textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute', right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: GOLD,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: GOLD, shadowOpacity: 0.35,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: { fontFamily: DM300, fontSize: 28, color: '#FFFFFF', lineHeight: 32, marginTop: -2 },

  // Bottom sheet
  sheetBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(17,17,17,0.4)',
  },
  sheetKAV: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  sheetHandle: {
    width: 36, height: 4, backgroundColor: BORDER,
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
    borderBottomWidth: 0.5, borderBottomColor: BORDER,
  },
  sheetTitle: { fontFamily: CG300, fontSize: 22, color: DARK },
  sheetSubtitle: { fontFamily: DM300, fontSize: 13, color: MUTED, marginTop: 4 },
  sheetClose: { fontFamily: DM300, fontSize: 13, color: MUTED, padding: 4 },
  sheetScroll: { flex: 1 },
  sheetScrollContent: { padding: 20, paddingBottom: 8 },
  sheetFooter: {
    padding: 16, paddingHorizontal: 20,
    borderTopWidth: 0.5, borderTopColor: BORDER,
    backgroundColor: CARD,
  },

  // Form fields
  fieldLabel: {
    fontFamily: DM300, fontSize: 10, letterSpacing: 1.5,
    textTransform: 'uppercase', color: MUTED, marginBottom: 8,
  },
  fieldInput: {
    fontFamily: DM300, fontSize: 14, color: DARK,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    paddingVertical: 10, paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },

  // Submit button
  submitBtn: {
    height: 52, borderRadius: 100, backgroundColor: DARK,
    alignItems: 'center', justifyContent: 'center',
  },
  submitBtnDisabled: { backgroundColor: BORDER },
  submitBtnText: {
    fontFamily: DM400, fontSize: 11,
    letterSpacing: 1.5, textTransform: 'uppercase', color: '#F8F7F5',
  },
  skipBtn: {
    flex: 1, height: 52, borderRadius: 100,
    borderWidth: 1, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  skipBtnText: {
    fontFamily: DM300, fontSize: 11,
    letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED,
  },
});
