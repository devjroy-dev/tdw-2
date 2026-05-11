/**
 * Frost · Journey · Expenses (v3 — wired)
 *
 * The bride's promises and what she's paid — her people: MUA, photographer,
 * decorator, lehenga, hairstylist. Frame is "what I owe" not "am I within
 * budget". Two sections: Pending (chronological, due date forward), Paid
 * (greyscaled).
 *
 * Two single-tap mutations:
 *   - Tap "Mark paid" pill on a pending row \u2192 PATCH payment_status='paid'
 *   - Long-press row \u2192 delete via FrostConfirmSheet
 *
 * Tapping the row body is a no-op for now — details belong to Dream Ai.
 *
 * Header line shows totals: paid / pending. Brass for paid, charcoal for
 * pending. No "total budget" — that's the parents' frame.
 */

import React, { useCallback, useState } from 'react';
import {
  ScrollView, View, Text, Pressable, StyleSheet, RefreshControl,
  Alert, Image, Modal,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Plus, FileText } from 'lucide-react-native';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostGestureHint from '../../../../components/frost/FrostGestureHint';
import FrostConfirmSheet from '../../../../components/frost/FrostConfirmSheet';
import FrostedSurface from '../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostRadius,
} from '../../../../constants/frost';
import { RAILWAY_URL } from '../../../../constants/tokens';
import { getCoupleSession } from '../../../../utils/session';
import { uploadImage } from '../../../../services/cloudinary';
import {
  fetchMyExpenses, markExpensePaid, deleteExpense, Expense,
  fetchMyBudget, CoupleBudget,
} from '../../../../services/frostApi';

function fmtINR(n: number): string {
  if (!n) return '₹0';
  return '₹' + n.toLocaleString('en-IN');
}

export default function JourneyExpenses() {
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [budget, setBudget] = useState<CoupleBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  // Receipts section state
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Receipt capture: image-picker → cloudinary → bride-chat (which calls
  // the existing ocr_receipt tool server-side). One OCR pipeline.
  const captureReceipt = useCallback(async (source: 'camera' | 'library') => {
    if (capturing) return;
    try {
      const perm = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        showToast(`Please allow ${source === 'camera' ? 'camera' : 'photo'} access.`);
        return;
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      setCapturing(true);
      const cloudinaryUrl = await uploadImage(result.assets[0].uri);

      const session = await getCoupleSession();
      if (!session?.id) { showToast('Sign in to capture receipts.'); setCapturing(false); return; }

      const r = await fetch(`${RAILWAY_URL}/api/v2/dreamai/bride-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.id,
          message: 'Here is a receipt.',
          image_url: cloudinaryUrl,
        }),
      });
      const data = await r.json();
      if (!data?.success && data?.error) {
        showToast(data.error);
        setCapturing(false);
        return;
      }

      Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success);
      showToast("Captured. It'll appear in receipts.");
      // Refresh in the background so a fast OCR turnaround surfaces immediately.
      load();
    } catch (e: any) {
      showToast(e?.message || 'Could not capture. Try again.');
    } finally {
      setCapturing(false);
    }
  }, [capturing, showToast]);

  const openCaptureSheet = useCallback(() => {
    if (capturing) return;
    Alert.alert('Capture a receipt', 'Choose source', [
      { text: 'Take photo',          onPress: () => captureReceipt('camera')  },
      { text: 'Choose from library', onPress: () => captureReceipt('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [capturing, captureReceipt]);

  const load = useCallback(async () => {
    setError(false);
    // PATCH B-6b: fetch budget in parallel with expenses. Budget is optional
    // — failure is silent (the budget line just won't render).
    const [r, b] = await Promise.all([fetchMyExpenses(), fetchMyBudget()]);
    if (r === null) { setError(true); setExpenses([]); }
    else setExpenses(r);
    setBudget(b);
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
  // Receipts = any expense with a receipt_url attached (proof, not status)
  const receipts = all.filter(e => !!e.receipt_url && e.receipt_url !== '');
  const totalPaid = paid.reduce((s, x) => s + (x.actual_amount || x.planned_amount || 0), 0);
  const totalPending = pending.reduce((s, x) => s + (x.planned_amount || x.actual_amount || 0), 0);
  const isEmpty = !loading && !error && all.length === 0;
  const hasAny = pending.length > 0 || paid.length > 0;

  return (
    <FrostCanvasShell eyebrow="JOURNEY · EXPENSES" mode="frost">
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
            <Text style={styles.totalsSep}>  ·  </Text>
            <Text style={styles.totalsPending}>{fmtINR(totalPending)} pending</Text>
          </Text>
        ) : null}

        {/* PATCH B-6b: tertiary budget line + brass progress bar.
            Renders only if total_budget is set (>0). The "parents' frame"
            stays at the top — this is a soft anchor underneath, not a
            replacement of the "what I owe" framing. */}
        {budget && Number(budget.total_budget) > 0 ? (() => {
          const total = Number(budget.total_budget) || 0;
          const allocated = totalPaid + totalPending;
          const pct = Math.max(0, Math.min(1, allocated / total));
          const remaining = total - allocated;
          const overBudget = remaining < 0;
          return (
            <View style={styles.budgetWrap}>
              <Text style={styles.budgetLine}>
                {overBudget
                  ? `Over budget by ${fmtINR(Math.abs(remaining))} of ${fmtINR(total)}`
                  : `${fmtINR(allocated)} of ${fmtINR(total)} budget`}
              </Text>
              <View style={styles.budgetBarTrack}>
                <View style={[
                  styles.budgetBarFill,
                  { width: `${pct * 100}%` },
                  overBudget && styles.budgetBarFillOver,
                ]} />
              </View>
            </View>
          );
        })() : null}

        {hasAny ? <FrostGestureHint storageKey="expenses" text="Tap to know. Hold to act." /> : null}

        {loading ? (
          <View style={styles.stateWrap}><Text style={styles.loadingDots}>…</Text></View>
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

        {/* ── RECEIPTS — proof of expenses ─────────────────────────────── */}
        {!loading && !error ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RECEIPTS</Text>
            <Text style={styles.receiptsSub}>
              Bills, invoices, advance receipts. Filed under the right vendor.
            </Text>

            <FrostedSurface
              mode="button"
              onPress={openCaptureSheet}
              disabled={capturing}
              style={styles.captureBtnOuter}
            >
              <View style={styles.captureBtnInner}>
                <Plus size={16} color={FrostColors.ink} strokeWidth={1.6} />
                <Text style={styles.captureBtnText}>
                  {capturing ? 'Capturing…' : 'Capture a receipt'}
                </Text>
              </View>
            </FrostedSurface>

            {receipts.length === 0 ? (
              <Text style={styles.receiptsEmpty}>
                No receipts yet. Capture one from Dream Ai with the paperclip.
              </Text>
            ) : (
              <View style={styles.receiptList}>
                {receipts.map(e => (
                  <ReceiptRow
                    key={`r-${e.id}`}
                    expense={e}
                    onPress={() => setViewingReceipt(e.receipt_url ?? null)}
                  />
                ))}
              </View>
            )}
          </View>
        ) : null}

        {toast ? (
          <View style={styles.toast} pointerEvents="none">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        ) : null}
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

      {/* Receipt image viewer — tap anywhere to dismiss */}
      <Modal
        visible={!!viewingReceipt}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingReceipt(null)}
      >
        <Pressable style={styles.receiptModal} onPress={() => setViewingReceipt(null)}>
          {viewingReceipt ? (
            <Image
              source={{ uri: viewingReceipt }}
              style={styles.receiptImage}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </FrostCanvasShell>
  );
}

// ─── Receipt row ────────────────────────────────────────────────────────────

function ReceiptRow({ expense, onPress }: { expense: Expense; onPress: () => void }) {
  const who = expense.vendor_name || expense.description || 'Untitled';
  const amount = expense.actual_amount || expense.planned_amount || 0;
  const meta = [expense.event, formatReceiptDate(expense.due_date || expense.created_at)]
    .filter(Boolean).join(' · ');
  return (
    <FrostedSurface
      mode="button"
      onPress={onPress}
      radius={FrostRadius.md}
      style={styles.receiptRowOuter}
    >
      <View style={styles.receiptRow}>
        <View style={styles.receiptIcon}>
          <FileText size={20} color={FrostColors.goldMuted} strokeWidth={1.5} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.receiptVendor} numberOfLines={1}>{who}</Text>
          {meta ? (
            <Text style={styles.receiptMeta} numberOfLines={1}>{meta.toUpperCase()}</Text>
          ) : null}
        </View>
        <Text style={styles.receiptAmount}>{fmtINR(amount)}</Text>
      </View>
    </FrostedSurface>
  );
}

function formatReceiptDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
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
          {[expense.description !== who ? expense.description : null, expense.event].filter(Boolean).join(' · ')}
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
            <Text style={styles.markPaidText}>{busy ? '…' : 'MARK PAID'}</Text>
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
  if (diffDays < 0) return 'OVERDUE · ' + d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }).toUpperCase();
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
  // PATCH B-6b: budget tertiary line + thin brass progress bar.
  // Sits below the paid/pending totals, above the gesture hint. Soft
  // tone — italic Cormorant in spirit, restrained colour, no heading
  // weight. The bar is hairline-thin so it reads as anchor not chart.
  budgetWrap: {
    marginTop: FrostSpace.m,
  },
  budgetLine: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 13, lineHeight: 18,
    color: FrostColors.soft,
    letterSpacing: 0.2,
  },
  budgetBarTrack: {
    height: 2,
    marginTop: 6,
    backgroundColor: FrostColors.hairline,
    borderRadius: 1,
    overflow: 'hidden',
  },
  budgetBarFill: {
    height: '100%',
    backgroundColor: FrostColors.goldMuted,
    borderRadius: 1,
  },
  budgetBarFillOver: {
    backgroundColor: FrostColors.goldTrue,
  },

  // ── Receipts section ────────────────────────────────────────────────
  receiptsSub: {
    ...FrostType.bodyMedium,
    fontStyle: 'italic',
    color: FrostColors.muted,
    marginTop: -FrostSpace.xs,
    marginBottom: FrostSpace.m,
  },
  captureBtnOuter: {
    marginBottom: FrostSpace.m,
  },
  captureBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FrostSpace.s,
    paddingVertical: FrostSpace.m,
    paddingHorizontal: FrostSpace.xl,
  },
  captureBtnText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: FrostColors.ink,
  },
  receiptsEmpty: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 14,
    lineHeight: 20,
    color: FrostColors.muted,
    marginTop: FrostSpace.s,
    paddingHorizontal: FrostSpace.s,
  },
  receiptList: {
    marginTop: FrostSpace.xs,
  },
  receiptRowOuter: {
    marginBottom: FrostSpace.s,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FrostSpace.m + 2,
    paddingHorizontal: FrostSpace.l,
    gap: FrostSpace.m,
  },
  receiptIcon: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptVendor: {
    fontFamily: FrostFonts.bodyMedium,
    fontSize: 15,
    color: FrostColors.ink,
  },
  receiptMeta: {
    ...FrostType.eyebrowSmall,
    letterSpacing: 1.4,
    marginTop: 2,
  },
  receiptAmount: {
    fontFamily: FrostFonts.bodyMedium,
    fontSize: 15,
    color: FrostColors.goldMuted,
  },
  receiptModal: {
    flex: 1,
    backgroundColor: FrostColors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
  },

  // ── Toast ───────────────────────────────────────────────────────────
  toast: {
    alignSelf: 'center',
    marginTop: FrostSpace.l,
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.s,
    borderRadius: FrostRadius.pill,
    backgroundColor: FrostColors.muted,
  },
  toastText: {
    fontFamily: FrostFonts.body,
    fontSize: 12,
    color: FrostColors.white,
  },
});
