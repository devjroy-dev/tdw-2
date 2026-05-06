import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, KeyboardAvoidingView, Platform,
  RefreshControl, Animated,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
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
  const [vendorName, setVendorName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  // Deduplicate events by name — couple_events can have duplicate rows from seeding
  const uniqueEvents = events.filter((ev, i, arr) => arr.findIndex(e => e.name === ev.name) === i);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }
  function reset() {
    setTaskTitle(''); setSelectedEvent('general'); setPriority('Medium');
    setDueDate(''); setVendorName(''); setNotes('');
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
        <TextInput
          value={dueDate} onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={MUTED}
          style={styles.fieldInput}
        />

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
        <TextInput
          value={dueDate} onChangeText={setDueDate}
          placeholder="YYYY-MM-DD"
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
function TaskCard({ task, userId, events, onCompleted, onDeleted, onRestored, onExpenseAdded }: {
  task: Task; userId: string; events: EventOption[];
  onCompleted: (id: string) => void;
  onDeleted: (id: string) => void;
  onRestored: (id: string) => void;
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
        body: JSON.stringify({ is_complete: false, status: 'pending', completed_at: null }),
      });
      setCompleted(false);
      setExpanded(false);
      onRestored(task.id);
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

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        const s = await getCoupleSession();
        if (cancelled || !s) return;
        setUserId(s.id);
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
