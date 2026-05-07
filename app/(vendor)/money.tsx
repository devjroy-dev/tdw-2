import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Modal, Animated, Switch,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Plus } from 'lucide-react-native';
import { RAILWAY_URL } from '../../constants/tokens';
import { getVendorSession } from '../../utils/session';

const API   = RAILWAY_URL;
const GOLD  = '#C9A84C';
const INK   = '#0C0A09';
const BG    = '#F8F7F5';
const CARD  = '#FFFFFF';
const BORDER = '#E2DED8';
const MUTED  = '#8C8480';
const DARK   = '#111111';
const GREEN  = '#4A7C59';
const RED    = '#9B4545';

const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
const DM400 = 'DMSans_400Regular';
const JOST  = 'Jost_300Light';

type Tab = 'INVOICES' | 'EXPENSES' | 'TAX' | 'PAYMENTS' | 'SHIELD';

const TABS: Tab[] = ['INVOICES', 'EXPENSES', 'TAX', 'PAYMENTS', 'SHIELD'];

const CLIENT_CATEGORIES = ['Travel','Equipment Hire','Assistant / Second Shooter','Printing & Albums','Props & Materials','Food & Hospitality','Other'];
const BUSINESS_CATEGORIES = ['Procurement','Studio & Rent','Marketing & Ads','Software & Subscriptions','Equipment Purchase','Professional Development','Other'];

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatShort(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function fmtAmt(n: number) {
  if (!n) return 'Rs 0';
  return 'Rs ' + Number(n).toLocaleString('en-IN');
}
function currentMonth() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}
function todayStr() { return new Date().toISOString().split('T')[0]; }

// ── Status chips ───────────────────────────────────────────────────────────
function InvoiceChip({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const bg    = s === 'paid' ? '#E8F5E9' : s === 'overdue' ? '#FFEBEE' : '#E2DED8';
  const color = s === 'paid' ? GREEN     : s === 'overdue' ? RED        : MUTED;
  const label = s === 'paid' ? 'PAID'    : s === 'overdue' ? 'OVERDUE'  : 'PENDING';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontFamily: JOST, fontSize: 9, letterSpacing: 2, color }}>{label}</Text>
    </View>
  );
}

// ── Shimmer ────────────────────────────────────────────────────────────────
function Shimmer() {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={{ height: 72, borderRadius: 12, backgroundColor: '#E8E5DF', opacity: anim, marginBottom: 10 }} />;
}

// ── Create invoice modal ───────────────────────────────────────────────────
function CreateInvoiceModal({ visible, vendorId, clients, onClose, onCreated }: {
  visible: boolean; vendorId: string; clients: any[]; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    client_id: '', client_name: '', client_phone: '',
    description: '', amount: '', due_date: '', gst_enabled: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const gstAmount = form.gst_enabled ? Number(form.amount) * 0.18 : 0;
  const total     = Number(form.amount) + gstAmount;

  async function submit() {
    if (!form.client_name && !form.client_id) { setError('Enter a client name.'); return; }
    if (!form.amount) { setError('Enter an amount.'); return; }
    setSubmitting(true); setError('');
    try {
      const r = await fetch(`${API}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          client_id: form.client_id || null,
          client_name: form.client_name,
          client_phone: form.client_phone,
          amount: Number(form.amount),
          total_amount: total,
          description: form.description,
          due_date: form.due_date || null,
          gst_enabled: form.gst_enabled,
          status: 'pending',
          issue_date: todayStr(),
        }),
      });
      const d = await r.json();
      if (d.success || r.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setForm({ client_id: '', client_name: '', client_phone: '', description: '', amount: '', due_date: '', gst_enabled: false });
        onCreated();
        onClose();
      } else { setError(d.error || 'Failed.'); }
    } catch { setError('Network error.'); }
    finally { setSubmitting(false); }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>New Invoice</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>CLIENT NAME *</Text>
          <TextInput style={styles.fieldInput} value={form.client_name} onChangeText={v => setForm(f => ({ ...f, client_name: v }))} placeholder="Client name" placeholderTextColor="#C8C4BE" />

          <Text style={styles.fieldLabel}>PHONE</Text>
          <TextInput style={styles.fieldInput} value={form.client_phone} onChangeText={v => setForm(f => ({ ...f, client_phone: v }))} placeholder="Optional" placeholderTextColor="#C8C4BE" keyboardType="phone-pad" />

          <Text style={styles.fieldLabel}>DESCRIPTION</Text>
          <TextInput style={styles.fieldInput} value={form.description} onChangeText={v => setForm(f => ({ ...f, description: v }))} placeholder="Photography · Wedding" placeholderTextColor="#C8C4BE" />

          <Text style={styles.fieldLabel}>AMOUNT (Rs)</Text>
          <TextInput style={styles.fieldInput} value={form.amount} onChangeText={v => setForm(f => ({ ...f, amount: v }))} placeholder="50000" placeholderTextColor="#C8C4BE" keyboardType="number-pad" />

          <Text style={styles.fieldLabel}>DUE DATE</Text>
          <TextInput style={styles.fieldInput} value={form.due_date} onChangeText={v => setForm(f => ({ ...f, due_date: v }))} placeholder="YYYY-MM-DD" placeholderTextColor="#C8C4BE" />

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={styles.fieldLabel}>GST (18%)</Text>
            <Switch
              value={form.gst_enabled}
              onValueChange={v => setForm(f => ({ ...f, gst_enabled: v }))}
              trackColor={{ false: BORDER, true: 'rgba(201,168,76,0.3)' }}
              thumbColor={form.gst_enabled ? GOLD : '#C8C4BE'}
            />
          </View>

          {form.gst_enabled && Number(form.amount) > 0 && (
            <View style={{ backgroundColor: '#F4F1EC', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <Text style={{ fontFamily: DM300, fontSize: 13, color: MUTED }}>Subtotal: {fmtAmt(Number(form.amount))}</Text>
              <Text style={{ fontFamily: DM300, fontSize: 13, color: MUTED }}>GST (18%): {fmtAmt(gstAmount)}</Text>
              <Text style={{ fontFamily: DM400, fontSize: 15, color: DARK, marginTop: 6 }}>Total: {fmtAmt(total)}</Text>
            </View>
          )}

          {!!error && <Text style={{ fontFamily: DM300, fontSize: 12, color: RED, marginBottom: 12 }}>{error}</Text>}
        </ScrollView>
        <View style={styles.modalButtons}>
          <TouchableOpacity style={[styles.modalConfirmBtn, submitting && { opacity: 0.5 }]} onPress={submit} disabled={submitting} activeOpacity={0.85}>
            <Text style={styles.modalConfirmText}>{submitting ? 'Creating...' : 'CREATE INVOICE'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────
export default function VendorMoneyScreen() {
  const insets = useSafeAreaInsets();

  const [vendorId,  setVendorId]  = useState('');
  const [tab,       setTab]       = useState<Tab>('INVOICES');
  const [invoices,  setInvoices]  = useState<any[]>([]);
  const [expenses,  setExpenses]  = useState<any[]>([]);
  const [tax,       setTax]       = useState<any>(null);
  const [payments,  setPayments]  = useState<any[]>([]);
  const [clients,   setClients]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('ALL');
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Expense form
  const [expDesc,     setExpDesc]     = useState('');
  const [expAmt,      setExpAmt]      = useState('');
  const [expCategory, setExpCategory] = useState('');
  const [expRelated,  setExpRelated]  = useState('');
  const [expType,     setExpType]     = useState<'client' | 'business'>('client');
  const [expSubTab,   setExpSubTab]   = useState<'client' | 'business'>('client');
  const [expAdding,   setExpAdding]   = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(''));
  }

  const fetchAll = useCallback(async (vid: string) => {
    setLoading(true);
    try {
      const [ir, er, tr, pr, cr] = await Promise.allSettled([
        fetch(`${API}/api/invoices/${vid}`).then(r => r.json()),
        fetch(`${API}/api/expenses/${vid}`).then(r => r.json()),
        fetch(`${API}/api/tds/${vid}/summary`).then(r => r.json()),
        fetch(`${API}/api/payment-schedules/${vid}`).then(r => r.json()),
        fetch(`${API}/api/v2/vendor/clients/${vid}`).then(r => r.json()),
      ]);
      if (ir.status === 'fulfilled') setInvoices(ir.value.data || ir.value || []);
      if (er.status === 'fulfilled') setExpenses(er.value.data || er.value || []);
      if (tr.status === 'fulfilled') setTax(tr.value.data || tr.value || null);
      if (pr.status === 'fulfilled') setPayments(pr.value.data || pr.value || []);
      if (cr.status === 'fulfilled') setClients(cr.value.data || []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        const s = await getVendorSession();
        if (cancelled || !s) return;
        const vid = s.vendorId || s.id;
        setVendorId(vid);
        await fetchAll(vid);
      }
      load();
      return () => { cancelled = true; };
    }, [])
  );

  // Hero strip calculations
  const cm = currentMonth();
  const thisMonth = invoices.filter(i => (i.issue_date || '').startsWith(cm)).reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const pending   = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const overdue   = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const expThisMonth = expenses.filter(e => (e.expense_date || '').slice(0, 7) === cm).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const estProfit = thisMonth - expThisMonth;

  const filteredInvoices = invoiceFilter === 'ALL' ? invoices : invoices.filter(i => i.status?.toLowerCase() === invoiceFilter.toLowerCase());

  async function markPaid(invId: string) {
    try {
      const r = await fetch(`${API}/api/invoices/${invId}/mark-paid`, { method: 'PATCH' });
      const d = await r.json();
      if (d.success || r.ok) { showToast('Marked as paid.'); fetchAll(vendorId); }
      else showToast(d.error || 'Failed.');
    } catch { showToast('Network error.'); }
  }

  async function addExpense() {
    if (!expDesc.trim() || !expAmt) { showToast('Enter description and amount.'); return; }
    setExpAdding(true);
    try {
      const r = await fetch(`${API}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          description: expDesc,
          amount: Number(expAmt),
          expense_date: todayStr(),
          category: expCategory || 'Other',
          expense_type: expType,
          related_name: expRelated || null,
        }),
      });
      const d = await r.json();
      if (d.success || r.ok) {
        setExpDesc(''); setExpAmt(''); setExpCategory(''); setExpRelated('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast('Expense added.');
        fetchAll(vendorId);
      } else showToast(d.error || 'Failed.');
    } catch { showToast('Network error.'); }
    finally { setExpAdding(false); }
  }

  // Payment grouping
  const now   = new Date();
  const in7   = new Date(now); in7.setDate(now.getDate() + 7);
  const in30  = new Date(now); in30.setDate(now.getDate() + 30);
  const weekPay  = payments.filter(p => { const d = new Date(p.due_date); return d >= now && d <= in7; });
  const monthPay = payments.filter(p => { const d = new Date(p.due_date); return d > in7 && d <= in30; });
  const laterPay = payments.filter(p => new Date(p.due_date) > in30);

  return (
    <View style={[styles.root, { paddingTop: 0 }]}>

      {/* Toast */}
      {!!toast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {/* Hero strip — dark */}
      <View style={styles.heroStrip}>
        <View style={styles.heroRow}>
          {[
            { label: 'THIS MONTH', val: thisMonth, color: '#F8F7F5' },
            { label: 'PENDING',    val: pending,   color: '#F8F7F5' },
            { label: 'OVERDUE',    val: overdue,   color: GOLD      },
            { label: 'EXPENSES',   val: expThisMonth, color: MUTED  },
          ].map(h => (
            <View key={h.label} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={styles.heroLabel}>{h.label}</Text>
              <Text style={[styles.heroVal, { color: h.color }]}>{fmtAmt(h.val)}</Text>
            </View>
          ))}
        </View>
        {(thisMonth > 0 || expThisMonth > 0) && (
          <View style={styles.profitRow}>
            <Text style={styles.profitLabel}>EST. PROFIT</Text>
            <Text style={[styles.profitVal, { color: estProfit >= 0 ? GOLD : '#9B4545' }]}>{fmtAmt(estProfit)}</Text>
          </View>
        )}
      </View>

      {/* Sub-nav tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => { Haptics.selectionAsync(); setTab(t); }}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── INVOICES ── */}
        {tab === 'INVOICES' && (
          <View>
            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
              {['ALL', 'PAID', 'PENDING', 'OVERDUE'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, invoiceFilter === f && styles.filterChipActive]}
                  onPress={() => setInvoiceFilter(f)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterChipText, invoiceFilter === f && styles.filterChipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading ? (
              <><Shimmer /><Shimmer /><Shimmer /></>
            ) : filteredInvoices.length === 0 ? (
              <Text style={styles.emptyText}>No invoices yet.</Text>
            ) : (
              filteredInvoices.map(inv => (
                <View key={inv.id} style={{ marginBottom: 10 }}>
                  <TouchableOpacity
                    style={styles.invoiceCard}
                    activeOpacity={0.85}
                    onPress={() => { Haptics.selectionAsync(); setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id); }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.invoiceClient} numberOfLines={1}>{inv.client_name}</Text>
                      {inv.description && <Text style={styles.invoiceDesc} numberOfLines={1}>{inv.description}</Text>}
                      <Text style={styles.invoiceDate}>{inv.issue_date ? formatDate(inv.issue_date) : ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 12, flexShrink: 0 }}>
                      <Text style={styles.invoiceAmt}>{fmtAmt(inv.total_amount || inv.amount)}</Text>
                      <View style={{ marginTop: 6 }}>
                        <InvoiceChip status={inv.status} />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {expandedInvoice === inv.id && (
                    <View style={styles.invoiceActions}>
                      {(inv.status === 'pending' || inv.status === 'overdue') && (
                        <TouchableOpacity style={styles.markPaidBtn} onPress={() => markPaid(inv.id)} activeOpacity={0.85}>
                          <Text style={styles.markPaidText}>MARK PAID</Text>
                        </TouchableOpacity>
                      )}
                      {inv.client_phone && (
                        <TouchableOpacity style={styles.reminderBtn} activeOpacity={0.85}>
                          <Text style={styles.reminderText}>SEND REMINDER</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ── EXPENSES ── */}
        {tab === 'EXPENSES' && (
          <View>
            {/* Quick-add form */}
            <View style={styles.expenseForm}>
              {/* Type toggle */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                {(['client', 'business'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, expType === t && styles.typeBtnActive]}
                    onPress={() => { setExpType(t); setExpCategory(''); }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.typeBtnText, expType === t && styles.typeBtnTextActive]}>
                      {t === 'client' ? 'Client Job' : 'Business'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 8 }}>
                {(expType === 'client' ? CLIENT_CATEGORIES : BUSINESS_CATEGORIES).map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, expCategory === cat && styles.catChipActive]}
                    onPress={() => setExpCategory(expCategory === cat ? '' : cat)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.catChipText, expCategory === cat && styles.catChipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TextInput
                  style={[styles.fieldInput, { flex: 1 }]}
                  value={expDesc}
                  onChangeText={setExpDesc}
                  placeholder="Description"
                  placeholderTextColor="#C8C4BE"
                />
                <TextInput
                  style={[styles.fieldInput, { width: 100 }]}
                  value={expAmt}
                  onChangeText={setExpAmt}
                  placeholder="Amount"
                  placeholderTextColor="#C8C4BE"
                  keyboardType="number-pad"
                />
              </View>

              <TextInput
                style={[styles.fieldInput, { marginBottom: 12 }]}
                value={expRelated}
                onChangeText={setExpRelated}
                placeholder={expType === 'client' ? 'Client name (optional)' : 'Supplier name (optional)'}
                placeholderTextColor="#C8C4BE"
              />

              <TouchableOpacity
                style={[styles.addExpenseBtn, expAdding && { opacity: 0.5 }]}
                onPress={addExpense}
                disabled={expAdding}
                activeOpacity={0.85}
              >
                <Text style={styles.addExpenseBtnText}>{expAdding ? 'Adding...' : `ADD ${expType === 'client' ? 'CLIENT' : 'BUSINESS'} EXPENSE`}</Text>
              </TouchableOpacity>
            </View>

            {/* Sub-tabs */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {(['client', 'business'] as const).map(t => {
                const count = expenses.filter(e => (e.expense_type || 'client') === t).length;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, { flex: 1 }, expSubTab === t && styles.typeBtnActive]}
                    onPress={() => setExpSubTab(t)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.typeBtnText, expSubTab === t && styles.typeBtnTextActive]}>
                      {t === 'client' ? 'Client Jobs' : 'Business'}{count > 0 ? ` (${count})` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Expense list */}
            {loading ? (
              <><Shimmer /><Shimmer /></>
            ) : expenses.filter(e => (e.expense_type || 'client') === expSubTab).length === 0 ? (
              <Text style={styles.emptyText}>No expenses yet.</Text>
            ) : (
              expenses
                .filter(e => (e.expense_type || 'client') === expSubTab)
                .map(exp => (
                  <View key={exp.id} style={[styles.invoiceCard, { marginBottom: 10 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invoiceClient} numberOfLines={1}>{exp.description}</Text>
                      {exp.related_name && <Text style={styles.invoiceDesc}>{exp.related_name}</Text>}
                      <Text style={styles.invoiceDate}>{exp.expense_date ? formatDate(exp.expense_date) : ''}</Text>
                    </View>
                    <Text style={[styles.invoiceAmt, { color: MUTED }]}>{fmtAmt(Number(exp.amount))}</Text>
                  </View>
                ))
            )}
          </View>
        )}

        {/* ── TAX ── */}
        {tab === 'TAX' && (
          <View>
            {tax ? (
              <View style={styles.taxCard}>
                <Text style={styles.sectionLabel}>TDS SUMMARY</Text>
                {[
                  { label: 'Total TDS Deducted', val: tax.total_tds || 0 },
                  { label: 'Net Receivable', val: tax.net_receivable || 0 },
                  { label: 'Gross Invoiced', val: tax.gross_invoiced || 0 },
                ].map(r => (
                  <View key={r.label} style={styles.taxRow}>
                    <Text style={styles.taxLabel}>{r.label}</Text>
                    <Text style={styles.taxVal}>{fmtAmt(r.val)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No TDS records yet.</Text>
            )}
          </View>
        )}

        {/* ── PAYMENTS ── */}
        {tab === 'PAYMENTS' && (
          <View>
            {[
              { label: 'DUE THIS WEEK', items: weekPay },
              { label: 'THIS MONTH', items: monthPay },
              { label: 'LATER', items: laterPay },
            ].map(group => (
              group.items.length > 0 && (
                <View key={group.label} style={{ marginBottom: 20 }}>
                  <Text style={styles.sectionLabel}>{group.label}</Text>
                  {group.items.map((p: any) => (
                    <View key={p.id} style={[styles.invoiceCard, { marginBottom: 8 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.invoiceClient}>{p.client_name || p.description || 'Payment'}</Text>
                        <Text style={styles.invoiceDate}>Due {p.due_date ? formatShort(p.due_date) : ''}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={styles.invoiceAmt}>{fmtAmt(p.amount || 0)}</Text>
                        <View style={{ backgroundColor: p.status === 'paid' ? '#E8F5E9' : '#E2DED8', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontFamily: JOST, fontSize: 9, color: p.status === 'paid' ? GREEN : MUTED }}>{(p.status || 'PENDING').toUpperCase()}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )
            ))}
            {payments.length === 0 && !loading && (
              <Text style={styles.emptyText}>No payment schedules yet.</Text>
            )}
          </View>
        )}

        {/* ── SHIELD ── */}
        {tab === 'SHIELD' && (
          <View style={styles.shieldCard}>
            <Text style={styles.sectionLabel}>PAYMENT SHIELD</Text>
            <Text style={styles.shieldTitle}>Secure your final payment</Text>
            <Text style={styles.shieldSub}>
              Payment Shield holds the client's final payment in escrow until after the wedding. Coming August 1.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* FAB — create invoice */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 80 }]}
        activeOpacity={0.85}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setSheetOpen(true); }}
      >
        <Plus size={22} strokeWidth={2} color="#F8F7F5" />
      </TouchableOpacity>

      {/* Create invoice modal */}
      <CreateInvoiceModal
        visible={sheetOpen}
        vendorId={vendorId}
        clients={clients}
        onClose={() => setSheetOpen(false)}
        onCreated={() => { showToast('Invoice created.'); fetchAll(vendorId); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  toast: {
    position: 'absolute', top: 60, alignSelf: 'center', zIndex: 100,
    backgroundColor: DARK, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
  },
  toastText: { fontFamily: DM300, fontSize: 12, color: '#F8F7F5' },

  // Hero strip
  heroStrip: { backgroundColor: DARK, padding: 20, paddingBottom: 16 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  heroLabel: { fontFamily: JOST, fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(248,247,245,0.45)', marginBottom: 5, textAlign: 'center' },
  heroVal: { fontFamily: CG300, fontSize: 18, textAlign: 'center' },
  profitRow: { borderTopWidth: 0.5, borderTopColor: 'rgba(248,247,245,0.1)', paddingTop: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  profitLabel: { fontFamily: JOST, fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)' },
  profitVal: { fontFamily: CG300, fontSize: 16 },

  // Tab scroll
  tabScroll: { flexGrow: 0, flexShrink: 0 },
  tabContent: { padding: 14, gap: 6 },
  tab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: BORDER },
  tabActive: { backgroundColor: DARK },
  tabText: { fontFamily: JOST, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: MUTED },
  tabTextActive: { color: '#F8F7F5' },

  // Filter chips
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: 'transparent' },
  filterChipActive: { backgroundColor: DARK, borderColor: DARK },
  filterChipText: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: MUTED },
  filterChipTextActive: { color: '#F8F7F5' },

  // Invoice card
  invoiceCard: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'flex-start' },
  invoiceClient: { fontFamily: CG300, fontSize: 18, color: DARK, marginBottom: 2 },
  invoiceDesc: { fontFamily: DM300, fontSize: 13, color: MUTED, marginBottom: 2 },
  invoiceDate: { fontFamily: JOST, fontSize: 11, color: MUTED },
  invoiceAmt: { fontFamily: JOST, fontSize: 16, color: DARK },
  invoiceActions: {
    backgroundColor: CARD, borderWidth: 1, borderTopWidth: 0, borderColor: BORDER,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    padding: 12, flexDirection: 'row', gap: 10,
  },
  markPaidBtn: { flex: 1, backgroundColor: DARK, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  markPaidText: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#F8F7F5' },
  reminderBtn: { flex: 1, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  reminderText: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: DARK },

  // Expense form
  expenseForm: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 14, marginBottom: 16 },
  typeBtn: { flex: 1, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: 'transparent', alignItems: 'center' },
  typeBtnActive: { backgroundColor: DARK, borderColor: DARK },
  typeBtnText: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: MUTED },
  typeBtnTextActive: { color: '#F8F7F5' },
  catChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: 'transparent' },
  catChipActive: { backgroundColor: DARK, borderColor: DARK },
  catChipText: { fontFamily: DM300, fontSize: 11, color: MUTED },
  catChipTextActive: { color: '#F8F7F5' },
  addExpenseBtn: { backgroundColor: DARK, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addExpenseBtnText: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#F8F7F5' },

  // Tax
  taxCard: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 16 },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  taxLabel: { fontFamily: DM300, fontSize: 13, color: MUTED },
  taxVal: { fontFamily: DM400, fontSize: 14, color: DARK },

  // Shield
  shieldCard: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 20 },
  shieldTitle: { fontFamily: CG300, fontSize: 22, color: DARK, marginTop: 8, marginBottom: 8 },
  shieldSub: { fontFamily: DM300, fontSize: 13, color: MUTED, lineHeight: 20 },

  // Section label
  sectionLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: '#C8C4BE', marginBottom: 12 },
  emptyText: { fontFamily: CG300, fontSize: 18, fontStyle: 'italic', color: MUTED, textAlign: 'center', marginTop: 40 },

  // Modal
  modalRoot: { flex: 1, backgroundColor: BG, padding: 24, paddingTop: 16 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: CG300, fontSize: 24, color: DARK, marginBottom: 20 },
  fieldLabel: { fontFamily: JOST, fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  fieldInput: { fontFamily: DM300, fontSize: 13, color: DARK, borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 8, marginBottom: 20 },
  modalButtons: { gap: 12, paddingTop: 12, paddingBottom: 16 },
  modalConfirmBtn: { height: 48, backgroundColor: DARK, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  modalConfirmText: { fontFamily: JOST, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#F8F7F5' },
  modalCancelText: { fontFamily: DM300, fontSize: 13, color: MUTED, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute', right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: DARK,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
});
