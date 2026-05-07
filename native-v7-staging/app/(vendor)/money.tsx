/**
 * TDW Native V7 — Vendor Money
 * Exact port of web/app/vendor/money/page.tsx
 *
 * Endpoints:
 *   GET  /api/invoices/:vendorId
 *   GET  /api/expenses/:vendorId
 *   GET  /api/tds/:vendorId/summary
 *   GET  /api/payment-schedules/:vendorId
 *   GET  /api/v2/vendor/clients/:vendorId
 *   GET  /api/v2/vendor/gst-summary/:vendorId?fy=:fy
 *   GET  /api/v2/vendor/payment-shield/:vendorId
 *   POST /api/invoices
 *   PATCH /api/invoices/:id/mark-paid
 *   POST /api/expenses
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, ActivityIndicator, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius, RAILWAY_URL } from '../../constants/tokens';

const BASE = RAILWAY_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(n: number): string {
  if (!n) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN');
}
function fmtDate(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function today(): string { return new Date().toISOString().split('T')[0]; }
function currentMonth(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}
function currentFY(): string {
  const n = new Date();
  const y = n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1;
  return `${y}-${y + 1}`;
}

// ─── Chips ────────────────────────────────────────────────────────────────────

function InvoiceChip({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  if (s === 'paid') return <View style={[styles.chip, { backgroundColor: '#E8F5E9' }]}><Text style={[styles.chipText, { color: '#4A7C59' }]}>PAID</Text></View>;
  if (s === 'overdue') return <View style={[styles.chip, { backgroundColor: '#FFEBEE' }]}><Text style={[styles.chipText, { color: '#9B4545' }]}>OVERDUE</Text></View>;
  return <View style={[styles.chip, { backgroundColor: Colors.border }]}><Text style={[styles.chipText, { color: Colors.muted }]}>PENDING</Text></View>;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <View style={styles.toast} pointerEvents="none">
      <Text style={styles.toastText}>{msg}</Text>
    </View>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.toggleTrack, { backgroundColor: on ? Colors.ink : Colors.border }]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.toggleThumb, { left: on ? 23 : 3 }]} />
    </TouchableOpacity>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type TabName = 'INVOICES' | 'EXPENSES' | 'TAX' | 'PAYMENTS' | 'SHIELD';
const TABS: TabName[] = ['INVOICES', 'EXPENSES', 'TAX', 'PAYMENTS', 'SHIELD'];

const CLIENT_CATEGORIES = ['Travel', 'Equipment Hire', 'Assistant / Second Shooter', 'Printing & Albums', 'Props & Materials', 'Food & Hospitality', 'Other'];
const BUSINESS_CATEGORIES = ['Procurement', 'Studio & Rent', 'Marketing & Ads', 'Software & Subscriptions', 'Equipment Purchase', 'Professional Development', 'Other'];

export default function VendorMoneyScreen() {
  const insets = useSafeAreaInsets();
  const [vendorId, setVendorId] = useState('');
  const [tab, setTab] = useState<TabName>('INVOICES');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [tax, setTax] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [gstData, setGstData] = useState<any>(null);
  const [shieldData, setShieldData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState('ALL');
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [selectedFY, setSelectedFY] = useState(currentFY());

  // Invoice sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [invForm, setInvForm] = useState({ client_id: '', client_name: '', client_phone: '', description: '', amount: '', due_date: '', gst_enabled: false });
  const [invSubmitting, setInvSubmitting] = useState(false);

  // Expense quick-add
  const [expDesc, setExpDesc] = useState('');
  const [expAmt, setExpAmt] = useState('');
  const [expAdding, setExpAdding] = useState(false);
  const [expType, setExpType] = useState<'client' | 'business'>('client');
  const [expCategory, setExpCategory] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('vendor_session') || await AsyncStorage.getItem('vendor_web_session') || '';
        if (!raw) return;
        const s = JSON.parse(raw);
        const vid = s.vendorId || s.id;
        if (vid) setVendorId(vid);
      } catch {}
    })();
  }, []);

  const fetchAll = useCallback(async (vid: string) => {
    setLoading(true);
    try {
      const [ir, er, tr, pr, cr, gr, sr] = await Promise.all([
        fetch(`${BASE}/api/invoices/${vid}`),
        fetch(`${BASE}/api/expenses/${vid}`),
        fetch(`${BASE}/api/tds/${vid}/summary`),
        fetch(`${BASE}/api/payment-schedules/${vid}`),
        fetch(`${BASE}/api/v2/vendor/clients/${vid}`),
        fetch(`${BASE}/api/v2/vendor/gst-summary/${vid}?fy=${selectedFY}`),
        fetch(`${BASE}/api/v2/vendor/payment-shield/${vid}`),
      ]);
      const id = await ir.json(); if (id.success || Array.isArray(id.data) || Array.isArray(id)) setInvoices(id.data || id || []);
      const ed = await er.json(); if (ed.success || Array.isArray(ed.data) || Array.isArray(ed)) setExpenses(ed.data || ed || []);
      const td = await tr.json(); setTax(td.data || td || null);
      const pd = await pr.json(); if (pd.success || Array.isArray(pd.data) || Array.isArray(pd)) setPayments(pd.data || pd || []);
      const cd = await cr.json(); if (cd.success) setClients(cd.data || []);
      const gd = await gr.json(); if (gd.success) setGstData(gd.data || null);
      const sd = await sr.json(); if (sd.success) setShieldData(sd.data || []);
    } catch {}
    setLoading(false);
  }, [selectedFY]);

  useEffect(() => { if (vendorId) fetchAll(vendorId); }, [vendorId, fetchAll]);

  // Hero strip calcs
  const cm = currentMonth();
  const thisMonth = invoices.filter(i => (i.issue_date || '').startsWith(cm)).reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const pending = invoices.filter(i => i.status === 'pending').reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + (i.total_amount || i.amount || 0), 0);
  const expThisMonth = expenses.filter(e => (e.expense_date || '').slice(0, 7) === cm).reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const filteredInvoices = invoiceFilter === 'ALL' ? invoices : invoices.filter(i => i.status?.toLowerCase() === invoiceFilter.toLowerCase());

  const handleMarkPaid = async (invId: string) => {
    try {
      const r = await fetch(`${BASE}/api/invoices/${invId}/mark-paid`, { method: 'PATCH' });
      const d = await r.json();
      if (d.success || r.ok) { setToast('Marked as paid.'); fetchAll(vendorId); }
      else setToast(d.error || 'Failed.');
    } catch { setToast('Network error.'); }
  };

  const handleCreateInvoice = async () => {
    if (!invForm.client_name && !invForm.client_id) { setToast('Select a client.'); return; }
    if (!invForm.amount) { setToast('Enter an amount.'); return; }
    setInvSubmitting(true);
    try {
      const gstAmt = invForm.gst_enabled ? Number(invForm.amount) * 1.18 : Number(invForm.amount);
      const r = await fetch(`${BASE}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          client_id: invForm.client_id || null,
          client_name: invForm.client_name,
          client_phone: invForm.client_phone,
          amount: Number(invForm.amount),
          total_amount: gstAmt,
          description: invForm.description,
          due_date: invForm.due_date || null,
          gst_enabled: invForm.gst_enabled,
          status: 'pending',
          issue_date: today(),
        }),
      });
      const d = await r.json();
      if (d.success || r.ok) {
        setSheetOpen(false);
        setInvForm({ client_id: '', client_name: '', client_phone: '', description: '', amount: '', due_date: '', gst_enabled: false });
        setToast('Invoice created.');
        fetchAll(vendorId);
      } else setToast(d.error || d.message || 'Failed.');
    } catch { setToast('Network error.'); }
    setInvSubmitting(false);
  };

  const handleAddExpense = async () => {
    if (!expDesc.trim() || !expAmt) { setToast('Enter description and amount.'); return; }
    setExpAdding(true);
    try {
      const r = await fetch(`${BASE}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          description: expDesc,
          amount: Number(expAmt),
          expense_date: today(),
          category: expCategory || 'Other',
          expense_type: expType,
        }),
      });
      const d = await r.json();
      if (d.success || r.ok) {
        setExpDesc(''); setExpAmt(''); setExpCategory('');
        setToast('Expense added.');
        fetchAll(vendorId);
      } else setToast(d.error || 'Failed.');
    } catch { setToast('Network error.'); }
    setExpAdding(false);
  };

  // Payments grouping
  const now = new Date();
  const in7 = new Date(now); in7.setDate(now.getDate() + 7);
  const in30 = new Date(now); in30.setDate(now.getDate() + 30);
  const weekPay = payments.filter(p => { const d = new Date(p.due_date); return d >= now && d <= in7; });
  const monthPay = payments.filter(p => { const d = new Date(p.due_date); return d > in7 && d <= in30; });
  const laterPay = payments.filter(p => new Date(p.due_date) > in30);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {toast ? <Toast msg={toast} onDone={() => setToast('')} /> : null}

      {/* Hero strip */}
      <View style={styles.heroStrip}>
        <View style={styles.heroRow}>
          {[
            { label: 'This Month', val: thisMonth, color: Colors.background },
            { label: 'Pending', val: pending, color: Colors.background },
            { label: 'Overdue', val: overdue, color: Colors.gold },
            { label: 'Expenses', val: expThisMonth, color: Colors.muted },
          ].map(h => (
            <View key={h.label} style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>{h.label}</Text>
              <Text style={[styles.heroStatValue, { color: h.color }]}>{fmtAmt(h.val)}</Text>
            </View>
          ))}
        </View>
        {(thisMonth > 0 || expThisMonth > 0) && (
          <View style={styles.heroProfitRow}>
            <Text style={styles.heroProfitLabel}>Est. Profit</Text>
            <Text style={[styles.heroProfitValue, { color: (thisMonth - expThisMonth) >= 0 ? Colors.gold : '#9B4545' }]}>
              {fmtAmt(thisMonth - expThisMonth)}
            </Text>
          </View>
        )}
      </View>

      {/* Sub-nav */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 6, paddingVertical: 14 }}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabChip, tab === t && styles.tabChipActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabChipText, tab === t && styles.tabChipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* INVOICES */}
        {tab === 'INVOICES' && (
          <View>
            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
              {['ALL', 'PAID', 'PENDING', 'OVERDUE'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterChip, invoiceFilter === f && styles.filterChipActive]}
                  onPress={() => setInvoiceFilter(f)}
                >
                  <Text style={[styles.filterChipText, invoiceFilter === f && styles.filterChipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {loading ? (
              <ActivityIndicator color={Colors.gold} style={{ marginTop: 20 }} />
            ) : filteredInvoices.length === 0 ? (
              <Text style={styles.emptyText}>No invoices yet.</Text>
            ) : filteredInvoices.map(inv => (
              <View key={inv.id} style={{ marginBottom: 10 }}>
                <TouchableOpacity
                  style={styles.invoiceCard}
                  onPress={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                  activeOpacity={0.85}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.invoiceClient}>{inv.client_name}</Text>
                    {inv.description ? <Text style={styles.invoiceDesc}>{inv.description}</Text> : null}
                    <Text style={styles.invoiceDate}>{inv.issue_date ? fmtDate(inv.issue_date) : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                    <Text style={styles.invoiceAmount}>{fmtAmt(inv.total_amount || inv.amount)}</Text>
                    <InvoiceChip status={inv.status} />
                  </View>
                </TouchableOpacity>
                {expandedInvoice === inv.id && (
                  <View style={styles.invoiceExpanded}>
                    {(inv.status === 'pending' || inv.status === 'overdue') && (
                      <TouchableOpacity
                        style={styles.markPaidBtn}
                        onPress={() => handleMarkPaid(inv.id)}
                      >
                        <Text style={styles.markPaidBtnText}>Mark Paid</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => setSheetOpen(true)}>
              <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* EXPENSES */}
        {tab === 'EXPENSES' && (
          <View>
            {/* Quick add */}
            <View style={styles.expenseAddCard}>
              <View style={styles.expTypeRow}>
                {(['client', 'business'] as const).map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.expTypeBtn, expType === t && styles.expTypeBtnActive]}
                    onPress={() => { setExpType(t); setExpCategory(''); }}
                  >
                    <Text style={[styles.expTypeBtnText, expType === t && styles.expTypeBtnTextActive]}>
                      {t === 'client' ? 'Client Job' : 'Business'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                value={expDesc}
                onChangeText={setExpDesc}
                placeholder="Description"
                placeholderTextColor={Colors.muted}
                style={styles.expInput}
              />
              <TextInput
                value={expAmt}
                onChangeText={setExpAmt}
                placeholder="Amount (₹)"
                placeholderTextColor={Colors.muted}
                style={styles.expInput}
                keyboardType="numeric"
              />
              {/* Category picker */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                {(expType === 'client' ? CLIENT_CATEGORIES : BUSINESS_CATEGORIES).map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, expCategory === c && styles.catChipActive]}
                    onPress={() => setExpCategory(c)}
                  >
                    <Text style={[styles.catChipText, expCategory === c && styles.catChipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.expAddBtn}
                onPress={handleAddExpense}
                disabled={expAdding}
              >
                <Text style={styles.expAddBtnText}>{expAdding ? 'Adding...' : 'Add Expense'}</Text>
              </TouchableOpacity>
            </View>

            {/* Expense list */}
            {expenses.length === 0 ? (
              <Text style={styles.emptyText}>No expenses logged yet.</Text>
            ) : expenses.map((e: any) => (
              <View key={e.id} style={styles.expenseCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseName}>{e.description}</Text>
                  <Text style={styles.expenseDate}>{fmtDate(e.expense_date)}</Text>
                </View>
                <Text style={styles.expenseAmount}>{fmtAmt(e.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* TAX */}
        {tab === 'TAX' && (
          <View>
            {gstData ? (
              <View style={styles.taxCard}>
                <Text style={styles.taxCardTitle}>GST Summary</Text>
                <Text style={styles.taxCardFY}>{selectedFY}</Text>
                <View style={styles.taxRow}>
                  <Text style={styles.taxLabel}>Taxable Revenue</Text>
                  <Text style={styles.taxValue}>{fmtAmt(gstData.total_revenue || 0)}</Text>
                </View>
                <View style={styles.taxRow}>
                  <Text style={styles.taxLabel}>GST Collected (18%)</Text>
                  <Text style={styles.taxValue}>{fmtAmt(gstData.gst_collected || 0)}</Text>
                </View>
              </View>
            ) : loading ? (
              <ActivityIndicator color={Colors.gold} />
            ) : (
              <Text style={styles.emptyText}>No tax data available.</Text>
            )}
            {tax && (
              <View style={[styles.taxCard, { marginTop: 12 }]}>
                <Text style={styles.taxCardTitle}>TDS Summary</Text>
                <View style={styles.taxRow}>
                  <Text style={styles.taxLabel}>TDS Deducted</Text>
                  <Text style={styles.taxValue}>{fmtAmt(tax.total_tds || 0)}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* PAYMENTS */}
        {tab === 'PAYMENTS' && (
          <View>
            {loading ? <ActivityIndicator color={Colors.gold} /> : payments.length === 0 ? (
              <Text style={styles.emptyText}>No payment schedules.</Text>
            ) : (
              <>
                {weekPay.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.paymentsGroup}>This Week</Text>
                    {weekPay.map(p => <PaymentRow key={p.id} payment={p} />)}
                  </View>
                )}
                {monthPay.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={styles.paymentsGroup}>This Month</Text>
                    {monthPay.map(p => <PaymentRow key={p.id} payment={p} />)}
                  </View>
                )}
                {laterPay.length > 0 && (
                  <View>
                    <Text style={styles.paymentsGroup}>Later</Text>
                    {laterPay.map(p => <PaymentRow key={p.id} payment={p} />)}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* SHIELD */}
        {tab === 'SHIELD' && (
          <View>
            <View style={styles.shieldInfoCard}>
              <Text style={styles.shieldTitle}>Payment Shield</Text>
              <Text style={styles.shieldDesc}>
                TDW holds client funds securely until delivery is confirmed. Protects both you and your client.
              </Text>
            </View>
            {shieldData.length === 0 ? (
              <Text style={styles.emptyText}>No clients in Payment Shield yet.</Text>
            ) : shieldData.map((s: any) => (
              <View key={s.id} style={styles.shieldCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shieldClientName}>{s.client_name}</Text>
                  <Text style={styles.shieldDates}>
                    {s.wedding_date ? `Wedding ${fmtDate(s.wedding_date)}` : ''}
                    {s.release_date ? ` · Release ${fmtDate(s.release_date)}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.shieldAmount}>{fmtAmt(s.amount)}</Text>
                  <View style={[styles.chip, {
                    backgroundColor: s.status === 'released' ? '#E8F5E9' : s.status === 'disputed' ? '#FFEBEE' : '#F4F1EC',
                  }]}>
                    <Text style={[styles.chipText, {
                      color: s.status === 'released' ? '#4A7C59' : s.status === 'disputed' ? '#9B4545' : Colors.muted,
                    }]}>{s.status || 'holding'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Create Invoice Sheet */}
      <Modal visible={sheetOpen} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <View style={styles.invoiceSheet}>
            <View style={styles.invoiceSheetHeader}>
              <Text style={styles.invoiceSheetTitle}>Create Invoice</Text>
              <TouchableOpacity onPress={() => setSheetOpen(false)}>
                <Text style={{ fontSize: 22, color: Colors.muted }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Client selector */}
              <Text style={styles.fieldLabel}>CLIENT</Text>
              {invForm.client_name ? (
                <View style={styles.clientSelected}>
                  <Text style={styles.clientSelectedText}>{invForm.client_name}</Text>
                  <TouchableOpacity onPress={() => setInvForm(f => ({ ...f, client_id: '', client_name: '', client_phone: '' }))}>
                    <Text style={{ fontSize: 16, color: Colors.muted }}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                    {clients.slice(0, 10).map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.clientChip}
                        onPress={() => setInvForm(f => ({ ...f, client_id: c.id, client_name: c.name, client_phone: c.phone || '' }))}
                      >
                        <Text style={styles.clientChipText}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {clients.length === 0 && (
                    <TextInput
                      value={invForm.client_name}
                      onChangeText={v => setInvForm(f => ({ ...f, client_name: v }))}
                      placeholder="Client name"
                      placeholderTextColor={Colors.muted}
                      style={[styles.expInput, { marginBottom: 16 }]}
                    />
                  )}
                </View>
              )}

              {[
                { label: 'DESCRIPTION', key: 'description', keyboardType: 'default' as const },
                { label: 'AMOUNT (₹)', key: 'amount', keyboardType: 'numeric' as const },
              ].map(f => (
                <View key={f.key} style={{ marginBottom: 20 }}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    value={(invForm as any)[f.key]}
                    onChangeText={v => setInvForm(p => ({ ...p, [f.key]: v }))}
                    keyboardType={f.keyboardType}
                    placeholderTextColor={Colors.muted}
                    style={styles.invoiceInput}
                  />
                </View>
              ))}

              {/* GST toggle */}
              <View style={styles.gstRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gstLabel}>GST (18%)</Text>
                  {invForm.gst_enabled && invForm.amount ? (
                    <Text style={styles.gstTotal}>Total: {fmtAmt(Number(invForm.amount) * 1.18)}</Text>
                  ) : null}
                </View>
                <Toggle on={invForm.gst_enabled} onToggle={() => setInvForm(f => ({ ...f, gst_enabled: !f.gst_enabled }))} />
              </View>

              <TouchableOpacity
                style={[styles.createInvBtn, invSubmitting && { opacity: 0.6 }]}
                onPress={handleCreateInvoice}
                disabled={invSubmitting}
              >
                <Text style={styles.createInvBtnText}>{invSubmitting ? 'Creating…' : 'Create Invoice'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function PaymentRow({ payment }: { payment: any }) {
  return (
    <View style={styles.paymentCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.paymentName}>{payment.client_name || 'Client'}</Text>
        <Text style={styles.paymentDate}>{fmtDate(payment.due_date)}</Text>
      </View>
      <Text style={styles.paymentAmount}>{fmtAmt(payment.amount)}</Text>
    </View>
  );
}

function fmtDate(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  toast: {
    position: 'absolute', top: 20, alignSelf: 'center',
    backgroundColor: Colors.ink, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, zIndex: 999,
  },
  toastText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.background },

  heroStrip: { backgroundColor: Colors.ink, paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 16 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  heroStat: { alignItems: 'center', flex: 1 },
  heroStatLabel: { fontFamily: Fonts.label, fontSize: 8, letterSpacing: 1.8, textTransform: 'uppercase', color: 'rgba(248,247,245,0.45)', marginBottom: 5 },
  heroStatValue: { fontFamily: Fonts.display, fontSize: 20 },
  heroProfitRow: { borderTopWidth: 0.5, borderTopColor: 'rgba(248,247,245,0.1)', paddingTop: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  heroProfitLabel: { fontFamily: Fonts.label, fontSize: 8, letterSpacing: 1.8, textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)' },
  heroProfitValue: { fontFamily: Fonts.display, fontSize: 16 },

  tabScroll: { flexGrow: 0 },
  tabChip: { borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.border },
  tabChipActive: { backgroundColor: Colors.ink },
  tabChipText: { fontFamily: Fonts.label, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.muted },
  tabChipTextActive: { color: Colors.background },

  filterChip: { borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 6 },
  filterChipActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  filterChipText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: Colors.muted },
  filterChipTextActive: { color: Colors.background },

  emptyText: { fontFamily: Fonts.display, fontStyle: 'italic', fontSize: 18, color: Colors.muted, textAlign: 'center', marginTop: 40 },

  invoiceCard: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'flex-start',
  },
  invoiceClient: { fontFamily: Fonts.display, fontSize: 18, color: Colors.ink },
  invoiceDesc: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginTop: 2 },
  invoiceDate: { fontFamily: Fonts.label, fontSize: 12, color: Colors.muted, marginTop: 4 },
  invoiceAmount: { fontFamily: Fonts.label, fontSize: 16, color: Colors.ink },
  invoiceExpanded: {
    backgroundColor: Colors.card, borderWidth: 1, borderTopWidth: 0, borderColor: Colors.border,
    borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    padding: 10, flexDirection: 'row', gap: 10,
  },
  markPaidBtn: {
    flex: 1, backgroundColor: Colors.ink, borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  markPaidBtnText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.background },

  fab: {
    position: 'absolute', bottom: 80, right: 24,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
  fabText: { fontSize: 28, color: Colors.background, lineHeight: 36, marginTop: -2 },

  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, marginTop: 6 },
  chipText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1 },

  expenseAddCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, marginBottom: 16 },
  expTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  expTypeBtn: { flex: 1, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  expTypeBtnActive: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  expTypeBtnText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.muted },
  expTypeBtnTextActive: { color: Colors.background },
  expInput: {
    fontFamily: Fonts.body, fontSize: 13, color: Colors.ink,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    paddingVertical: 10, marginBottom: 14,
  },
  catChip: { borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border },
  catChipActive: { backgroundColor: Colors.dark, borderColor: Colors.dark },
  catChipText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.ink },
  catChipTextActive: { color: Colors.background },
  expAddBtn: { backgroundColor: Colors.ink, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  expAddBtnText: { fontFamily: Fonts.label, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: Colors.background },

  expenseCard: {
    backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border,
    borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  expenseName: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink },
  expenseDate: { fontFamily: Fonts.label, fontSize: 11, color: Colors.muted, marginTop: 2 },
  expenseAmount: { fontFamily: Fonts.label, fontSize: 16, color: Colors.ink },

  taxCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16 },
  taxCardTitle: { fontFamily: Fonts.display, fontSize: 18, color: Colors.ink, marginBottom: 4 },
  taxCardFY: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginBottom: 12 },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  taxLabel: { fontFamily: Fonts.body, fontSize: 13, color: Colors.ink },
  taxValue: { fontFamily: Fonts.label, fontSize: 14, color: Colors.ink },

  paymentsGroup: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: Colors.muted, marginBottom: 8 },
  paymentCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  paymentName: { fontFamily: Fonts.display, fontSize: 16, color: Colors.ink },
  paymentDate: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 2 },
  paymentAmount: { fontFamily: Fonts.label, fontSize: 16, color: Colors.ink },

  shieldInfoCard: { backgroundColor: '#F4F1EC', borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16, marginBottom: 16 },
  shieldTitle: { fontFamily: Fonts.display, fontSize: 18, color: Colors.ink, marginBottom: 8 },
  shieldDesc: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 20 },
  shieldCard: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' },
  shieldClientName: { fontFamily: Fonts.display, fontSize: 17, color: Colors.ink },
  shieldDates: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, marginTop: 3 },
  shieldAmount: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.ink, marginBottom: 4 },

  // Invoice sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(17,17,17,0.4)', justifyContent: 'flex-end' },
  invoiceSheet: {
    backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '88%',
  },
  invoiceSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  invoiceSheetTitle: { fontFamily: Fonts.display, fontSize: 22, color: Colors.ink },
  fieldLabel: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 2.2, textTransform: 'uppercase', color: Colors.muted, marginBottom: 8 },
  clientSelected: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.background, borderRadius: 8, padding: 10, marginBottom: 16 },
  clientSelectedText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.ink },
  clientChip: { fontFamily: Fonts.body, fontSize: 12, color: Colors.ink, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  clientChipText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.ink },
  invoiceInput: { fontFamily: Fonts.body, fontSize: 13, color: Colors.ink, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingVertical: 10 },
  gstRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  gstLabel: { fontFamily: Fonts.bodyMedium, fontSize: 13, color: Colors.ink },
  gstTotal: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 2 },
  createInvBtn: { width: '100%', backgroundColor: Colors.ink, borderRadius: 10, paddingVertical: 16, alignItems: 'center' },
  createInvBtnText: { fontFamily: Fonts.label, fontSize: 12, letterSpacing: 2.2, textTransform: 'uppercase', color: Colors.background },

  toggleTrack: { width: 44, height: 24, borderRadius: 12, position: 'relative' },
  toggleThumb: { position: 'absolute', top: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFFFFF' },
});
