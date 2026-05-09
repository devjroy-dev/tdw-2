/**
 * Frost \u00B7 Journey \u00B7 Expenses (v3 \u2014 wired)
 *
 * The bride's promises and what she's paid \u2014 her people: MUA, photographer,
 * decorator, lehenga, hairstylist. Frame is "what I owe" not "am I within
 * budget". Two sections: Pending (chronological, due date forward), Paid
 * (greyscaled).
 *
 * Two single-tap mutations:
 *   - Tap "Mark paid" pill on a pending row \u2192 PATCH payment_status='paid'
 *   - Long-press row \u2192 delete via FrostConfirmSheet
 *
 * Tapping the row body is a no-op for now \u2014 details belong to Dream Ai.
 *
 * Header line shows totals: paid / pending. Brass for paid, charcoal for
 * pending. No "total budget" \u2014 that's the parents' frame.
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
  fetchMyExpenses, markExpensePaid, deleteExpense, Expense,
} from '../../../../services/frostApi';

function fmtINR(n: number): string {
  if (!n) return '\u20B90';
  return '\u20B9' + n.toLocaleString('en-IN');
}

export default function JourneyExpenses() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(false);
    const r = await fetchMyExpenses();
    if (r === null) { setError(true); setExpenses([]); }
    else setExpenses(r);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const handleMarkPaid = useCallback(async (e: Expense) => {
    if (markingId) return;
    Haptics.selectionAsync?.();
    setMarkingId(e.id);
    setExpenses(prev => prev?.map(x =>
      x.id === e.id ? { ...x, payment_status: 'paid', actual_amount: x.actual_amount || x.planned_amount || 0 } : x
    ) ?? null);
    const ok = await markExpensePaid(e.id);
    setMarkingId(null);
    if (!ok) {
      // Revert
      setExpenses(prev => prev?.map(x => x.id === e.id ? e : x) ?? null);
    }
  }, [markingId]);

  const handleLongPress = useCallback((e: Expense) => {
    Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
    setDeleteTarget(e);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setExpenses(prev => prev?.filter(x => x.id !== id) ?? null);
    const ok = await deleteExpense(id);
    if (!ok) load();
  }, [deleteTarget, load]);

  const all = expenses ?? [];
  const pending = all
    .filter(e => e.payment_status !== 'paid')
    .sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    });
  const paid = all.filter(e => e.payment_status === 'paid');
  const totalPaid = paid.reduce((s, x) => s + (x.actual_amount || x.planned_amount || 0), 0);
  const totalPending = pending.reduce((s, x) => s + (x.planned_amount || x.actual_amount || 0), 0);
  const isEmpty = !loading && !error && all.length === 0;
  const hasAny = pending.length > 0 || paid.length > 0;

  return (
    <FrostCanvasShell eyebrow="JOURNEY \u00B7 EXPENSES" mode="frost">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FrostColors.goldMuted} />
        }
      >
        <Text style={styles.heading}>What I owe.</Text>

        {hasAny ? (
          <Text style={styles.totalsLine}>
            <Text style={styles.totalsPaid}>{fmtINR(totalPaid)} paid</Text>
            <Text style={styles.totalsSep}>  \u00B7  </Text>
            <Text style={styles.totalsPending}>{fmtINR(totalPending)} pending</Text>
          </Text>
        ) : null}

        {hasAny ? <FrostGestureHint storageKey="expenses" text="Tap to know. Hold to act." /> : null}

        {loading ? (
          <View style={styles.stateWrap}><Text style={styles.loadingDots}>\u2026</Text></View>
        ) : error ? (
          <Text style={styles.errorText}>I couldn't reach the page. Pull down to try again.</Text>
        ) : isEmpty ? (
          <Text style={styles.emptyText}>Nothing logged yet.</Text>
        ) : (
          <>
            {pending.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>PENDING</Text>
                {pending.map(e => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    onMarkPaid={() => handleMarkPaid(e)}
                    onLongPress={() => handleLongPress(e)}
                    busy={markingId === e.id}
                  />
                ))}
              </View>
            ) : null}
            {paid.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>PAID</Text>
                {paid.map(e => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    onLongPress={() => handleLongPress(e)}
                    paid
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <FrostConfirmSheet
        visible={!!deleteTarget}
        title={'Forget this expense?'}
        body={deleteTarget ? `${deleteTarget.vendor_name || deleteTarget.description || 'This entry'} will be removed. Ask Dream Ai if you want it back.` : ''}
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

function ExpenseRow({
  expense, onMarkPaid, onLongPress, paid = false, busy = false,
}: {
  expense: Expense;
  onMarkPaid?: () => void;
  onLongPress: () => void;
  paid?: boolean;
  busy?: boolean;
}) {
  const who = expense.vendor_name || expense.description || 'Untitled';
  const amount = paid
    ? (expense.actual_amount || expense.planned_amount || 0)
    : (expense.planned_amount || expense.actual_amount || 0);
  const dueLabel = !paid ? formatDueDate(expense.due_date) : null;

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={420}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, paid && styles.rowMuted]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowName} numberOfLines={1}>{who}</Text>
        <Text style={styles.rowMeta}>
          {[expense.description !== who ? expense.description : null, expense.event].filter(Boolean).join(' \u00B7 ')}
        </Text>
        {dueLabel ? <Text style={styles.rowWhen}>{dueLabel}</Text> : null}
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, paid && styles.rowAmountPaid]}>{fmtINR(amount)}</Text>
        {!paid && onMarkPaid ? (
          <Pressable
            onPress={(ev) => { ev.stopPropagation?.(); onMarkPaid(); }}
            disabled={busy}
            style={({ pressed }) => [styles.markPaidBtn, pressed && styles.markPaidPressed, busy && styles.markPaidBusy]}
          >
            <Text style={styles.markPaidText}>{busy ? '\u2026' : 'MARK PAID'}</Text>
          </Pressable>
        ) : null}
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
  if (diffDays === 0) return 'DUE TODAY';
  if (diffDays === 1) return 'DUE TOMORROW';
  if (diffDays > 1 && diffDays <= 7) return 'DUE ' + d.toLocaleDateString('en-IN', { weekday: 'long' }).toUpperCase();
  if (diffDays < 0) return 'OVERDUE \u00B7 ' + d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }).toUpperCase();
  return 'DUE ' + d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }).toUpperCase();
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
  totalsLine: {
    ...FrostType.bodyMedium,
    marginTop: FrostSpace.s,
  },
  totalsPaid: {
    color: FrostColors.goldMuted,
    fontFamily: FrostFonts.bodyMedium,
  },
  totalsPending: {
    color: FrostColors.ink,
    fontFamily: FrostFonts.bodyMedium,
  },
  totalsSep: { color: FrostColors.muted },

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
  rowMuted: { opacity: 0.5 },

  rowName: {
    ...FrostType.bodyLarge,
    color: FrostColors.ink,
  },
  rowMeta: {
    ...FrostType.bodySmall,
    color: FrostColors.soft,
    marginTop: 2,
  },
  rowWhen: {
    ...FrostType.eyebrowSmall,
    marginTop: 4,
    letterSpacing: 1.4,
    color: FrostColors.goldMuted,
  },

  rowRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  rowAmount: {
    fontFamily: FrostFonts.bodyMedium,
    fontSize: 16,
    color: FrostColors.ink,
    marginBottom: 6,
  },
  rowAmountPaid: { color: FrostColors.muted },

  markPaidBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: FrostColors.ink,
  },
  markPaidPressed: { opacity: 0.85 },
  markPaidBusy: { opacity: 0.6 },
  markPaidText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 9,
    letterSpacing: 1.2,
    color: FrostColors.white,
  },

  stateWrap: { paddingTop: 80, alignItems: 'center' },
  loadingDots: {
    fontFamily: FrostFonts.display,
    fontSize: 36,
    color: FrostColors.goldMuted,
    letterSpacing: 6,
  },
  emptyText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 18, lineHeight: 24,
    color: FrostColors.soft,
    textAlign: 'center',
    paddingTop: 80,
  },
  errorText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 16, lineHeight: 22,
    color: FrostColors.soft,
    textAlign: 'center',
    paddingTop: 80,
  },
});
