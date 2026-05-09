/**
 * Frost · Journey · Reminders (v3 — wired)
 *
 * The bride's quiet log. Read + two single-tap gestures:
 *   - Tap row    → toggle complete/incomplete (optimistic)
 *   - Long-press → delete via FrostConfirmSheet
 *
 * Everything else (adding, editing, status changes) goes through Dream Ai.
 * This page is the witness, not the workspace.
 *
 * Cache invalidation: useFocusEffect refetches on every focus, so Dream Ai
 * writes show up the moment the bride returns to this page.
 */

import React, { useCallback, useState } from 'react';
import {
  ScrollView, View, Text, Pressable, StyleSheet, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostGestureHint from '../../../../components/frost/FrostGestureHint';
import FrostConfirmSheet from '../../../../components/frost/FrostConfirmSheet';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../constants/frost';
import {
  fetchMyReminders, toggleReminderComplete, deleteReminder, Reminder,
} from '../../../../services/frostApi';

export default function JourneyReminders() {
  const [reminders, setReminders] = useState<Reminder[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);

  const load = useCallback(async () => {
    setError(false);
    const r = await fetchMyReminders();
    if (r === null) { setError(true); setReminders([]); }
    else setReminders(r);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const handleToggle = useCallback(async (r: Reminder) => {
    Haptics.selectionAsync?.();
    const next = !r.is_complete;
    setReminders(prev => prev?.map(x => x.id === r.id ? { ...x, is_complete: next } : x) ?? null);
    const ok = await toggleReminderComplete(r.id, next);
    if (!ok) {
      setReminders(prev => prev?.map(x => x.id === r.id ? { ...x, is_complete: !next } : x) ?? null);
    }
  }, []);

  const handleLongPress = useCallback((r: Reminder) => {
    Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
    setDeleteTarget(r);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setReminders(prev => prev?.filter(x => x.id !== id) ?? null);
    const ok = await deleteReminder(id);
    if (!ok) load();
  }, [deleteTarget, load]);

  const all = reminders ?? [];
  const pending = all.filter(r => !r.is_complete).sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });
  const done = all.filter(r => r.is_complete);
  const isEmpty = !loading && !error && all.length === 0;
  const hasPending = pending.length > 0;
  const hasDone = done.length > 0;

  return (
    <FrostCanvasShell eyebrow="JOURNEY \u00B7 REMINDERS" mode="frost">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FrostColors.goldMuted} />
        }
      >
        <Text style={styles.heading}>What I remember.</Text>

        {hasPending || hasDone ? (
          <FrostGestureHint storageKey="reminders" text="Tap to know. Hold to act." />
        ) : null}

        {loading ? (
          <View style={styles.stateWrap}><Text style={styles.loadingDots}>\u2026</Text></View>
        ) : error ? (
          <Text style={styles.errorText}>I couldn't reach the page. Pull down to try again.</Text>
        ) : isEmpty ? (
          <Text style={styles.emptyText}>Your list is clear.</Text>
        ) : (
          <>
            {hasPending ? (
              <View style={styles.section}>
                {pending.map(r => (
                  <ReminderRow
                    key={r.id}
                    reminder={r}
                    onToggle={() => handleToggle(r)}
                    onLongPress={() => handleLongPress(r)}
                  />
                ))}
              </View>
            ) : null}

            {hasDone ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>DONE</Text>
                {done.map(r => (
                  <ReminderRow
                    key={r.id}
                    reminder={r}
                    onToggle={() => handleToggle(r)}
                    onLongPress={() => handleLongPress(r)}
                    muted
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <FrostConfirmSheet
        visible={!!deleteTarget}
        title={'Forget this?'}
        body={deleteTarget ? `"${deleteTarget.text}" will be removed from your list. Ask Dream Ai if you want it back.` : ''}
        confirmLabel="Forget it"
        cancelLabel="Keep"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </FrostCanvasShell>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

function ReminderRow({
  reminder, onToggle, onLongPress, muted = false,
}: {
  reminder: Reminder;
  onToggle: () => void;
  onLongPress: () => void;
  muted?: boolean;
}) {
  const dueLabel = formatDueDate(reminder.due_date);
  return (
    <Pressable
      onPress={onToggle}
      onLongPress={onLongPress}
      delayLongPress={420}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, muted && styles.rowMuted]}
    >
      <View style={[styles.checkbox, reminder.is_complete && styles.checkboxComplete]}>
        {reminder.is_complete ? <View style={styles.checkboxFill} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowText, reminder.is_complete && styles.rowTextStrike]}>{reminder.text}</Text>
        {dueLabel ? <Text style={styles.rowWhen}>{dueLabel}</Text> : null}
      </View>
    </Pressable>
  );
}

function formatDueDate(due: string | null | undefined): string | null {
  if (!due) return null;
  const d = new Date(due);
  if (isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dCopy = new Date(d); dCopy.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dCopy.getTime() - today.getTime()) / 86400000);
  if (diffDays === 0) return 'TODAY';
  if (diffDays === 1) return 'TOMORROW';
  if (diffDays === -1) return 'YESTERDAY';
  if (diffDays > 1 && diffDays <= 7) {
    return d.toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase();
  }
  if (diffDays < 0) {
    return 'OVERDUE \u00B7 ' + d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }).toUpperCase();
  }
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }).toUpperCase();
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: FrostSpace.xl,
    paddingBottom: FrostSpace.huge,
  },
  heading: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 26, lineHeight: 30,
    color: FrostColors.ink,
    letterSpacing: 0.3,
  },
  section: { marginTop: FrostSpace.xl },
  sectionLabel: {
    fontFamily: FrostFonts.label,
    fontSize: 9, fontWeight: '300',
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    color: FrostColors.soft,
    marginBottom: FrostSpace.m,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: FrostSpace.l,
    gap: FrostSpace.m,
  },
  rowPressed: { opacity: 0.7 },
  rowMuted: { opacity: 0.4 },
  checkbox: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1, borderColor: FrostColors.hairline,
    marginTop: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxComplete: { borderColor: FrostColors.goldMuted },
  checkboxFill: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: FrostColors.goldMuted,
  },
  rowText: { ...FrostType.bodyLarge, color: FrostColors.ink },
  rowTextStrike: {
    textDecorationLine: 'line-through',
    textDecorationColor: FrostColors.muted,
    color: FrostColors.muted,
  },
  rowWhen: {
    ...FrostType.eyebrowSmall,
    marginTop: 4, letterSpacing: 1.4,
    color: FrostColors.goldMuted,
  },
  stateWrap: { paddingTop: 80, alignItems: 'center' },
  loadingDots: {
    fontFamily: FrostFonts.display,
    fontSize: 36, color: FrostColors.goldMuted,
    letterSpacing: 6,
  },
  emptyText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 18, lineHeight: 24,
    color: FrostColors.soft,
    textAlign: 'center', paddingTop: 80,
  },
  errorText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 16, lineHeight: 22,
    color: FrostColors.soft,
    textAlign: 'center', paddingTop: 80,
  },
});
