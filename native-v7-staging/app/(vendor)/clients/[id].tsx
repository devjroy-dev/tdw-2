/**
 * TDW Native V7 — Vendor Client Detail
 * Exact port of web/app/vendor/clients/[id]/page.tsx
 * Endpoint: GET /api/v2/vendor/clients/:vendorId/:clientId
 * Write:    PATCH /api/vendor-clients/:clientId
 *           DELETE /api/vendor-clients/:clientId
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
  StyleSheet, ActivityIndicator, Linking, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { Colors, Fonts, Radius, RAILWAY_URL } from '../../../constants/tokens';

const BASE = RAILWAY_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtINR(n: number): string {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

function formatDate(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  const dd = Math.floor(diff / 86400000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  if (dd < 7) return `${dd}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getInvoicePaid(inv: any): number {
  if (inv.status === 'paid') return inv.amount || 0;
  if (inv.description) {
    const m = inv.description.match(/Advance received[:\s]*₹?([\d,]+)/i);
    if (m) return parseInt(m[1].replace(/,/g, '')) || 0;
  }
  return 0;
}

// ─── ProgressRing ─────────────────────────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }) {
  const r = 19;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <Svg width={44} height={44} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={22} cy={22} r={r} fill="none" stroke={Colors.border} strokeWidth={3} />
      <Circle
        cx={22} cy={22} r={r} fill="none" stroke={Colors.gold} strokeWidth={3}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
      />
      <SvgText
        x={22} y={22} fill={Colors.ink} fontSize={9} fontFamily={Fonts.body}
        textAnchor="middle" alignmentBaseline="central"
        rotation={90} originX={22} originY={22}
      >
        {pct}%
      </SvgText>
    </Svg>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <View style={styles.toast} pointerEvents="none">
      <Text style={styles.toastText}>{msg}</Text>
    </View>
  );
}

// ─── Section + Card ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.card, style]}>{children}</View>
  );
}

// ─── Status Chip ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const isPaid = status === 'paid';
  return (
    <View style={[styles.chip, { backgroundColor: isPaid ? '#F4F1EC' : '#FFF8EC' }]}>
      <Text style={[styles.chipText, { color: isPaid ? Colors.muted : Colors.gold }]}>
        {status}
      </Text>
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'invoices' | 'messages' | 'deliveries';

export default function VendorClientDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id: clientId } = useLocalSearchParams<{ id: string }>();

  const [vendorId, setVendorId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  // Load session and data
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('vendor_session') || await AsyncStorage.getItem('vendor_web_session') || '';
        if (!raw) { router.replace('/'); return; }
        const s = JSON.parse(raw);
        const vid = s.vendorId || s.id;
        if (!vid) { router.replace('/'); return; }
        setVendorId(vid);
        const res = await fetch(`${BASE}/api/v2/vendor/clients/${vid}/${clientId}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
          setNotes(json.data.client?.notes || '');
        }
      } catch {}
      setLoading(false);
    })();
  }, [clientId]);

  const saveNotes = async () => {
    if (savingNotes) return;
    setSavingNotes(true);
    try {
      await fetch(`${BASE}/api/vendor-clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      setToast('Notes saved');
    } catch { setToast('Could not save'); }
    setSavingNotes(false);
  };

  const saveEdit = async () => {
    try {
      await fetch(`${BASE}/api/vendor-clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      setData((prev: any) => ({ ...prev, client: { ...prev.client, ...editForm } }));
      setEditing(false);
      setToast('Client updated');
    } catch { setToast('Could not save'); }
  };

  const deleteClient = async () => {
    try {
      await fetch(`${BASE}/api/vendor-clients/${clientId}`, { method: 'DELETE' });
      setToast('Client deleted');
      setTimeout(() => router.back(), 1000);
    } catch { setToast('Could not delete'); }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.notFoundText}>Client not found.</Text>
      </View>
    );
  }

  const { client, invoices = [], contract, deliveries = [], enquiry } = data;

  // Progress calculation (mirrors PWA)
  const totalInvoiced = invoices.reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const totalPaid = invoices.reduce((s: number, i: any) => s + getInvoicePaid(i), 0);
  const totalDue = totalInvoiced - totalPaid;
  const deliveriesDone = deliveries.filter((d: any) => d.status === 'delivered').length;
  const contractPct = contract?.status === 'signed' ? 25 : 0;
  const financialPct = totalInvoiced > 0 ? Math.min(25, (totalPaid / totalInvoiced) * 25) : 0;
  const deliveryPct = deliveries.length > 0 ? Math.min(25, (deliveriesDone / deliveries.length) * 25) : 0;
  const daysSinceMsg = enquiry?.last_message_at
    ? Math.floor((Date.now() - new Date(enquiry.last_message_at).getTime()) / 86400000)
    : 999;
  const commsPct = daysSinceMsg <= 14 ? 25 : 0;
  const progress = Math.round(financialPct + contractPct + deliveryPct + commsPct);

  const TABS: Tab[] = ['overview', 'invoices', 'messages', 'deliveries'];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {toast ? <Toast msg={toast} onDone={() => setToast('')} /> : null}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Clients</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <ProgressRing pct={progress} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.clientName}>{client.name}</Text>
            <Text style={styles.clientSub}>
              {client.event_type || 'Wedding'}
              {client.event_date ? ` · ${formatDate(client.event_date)}` : ''}
            </Text>
          </View>
        </View>
        {/* Edit + Delete */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => {
              setEditForm({
                name: client.name || '',
                phone: client.phone || '',
                event_type: client.event_type || 'Wedding',
                event_date: client.event_date || '',
                budget: client.budget || '',
                venue: client.venue || '',
              });
              setEditing(true);
            }}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => setDeleting(true)}
          >
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
        {/* Contact actions */}
        <View style={styles.actionRow}>
          {client.phone ? (
            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${client.phone}`)}>
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>
          ) : null}
          {client.phone ? (
            <TouchableOpacity
              style={styles.waBtn}
              onPress={() => Linking.openURL(`https://wa.me/${(client.phone || '').replace(/\D/g, '')}`)}
            >
              <Text style={styles.waBtnText}>WhatsApp</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Sub-nav */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabChip, activeTab === t && styles.tabChipActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabChipText, activeTab === t && styles.tabChipTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <>
            {/* Money */}
            <Section label="MONEY">
              <Card>
                <View style={styles.moneyRow}>
                  {[
                    { label: 'Invoiced', val: totalInvoiced },
                    { label: 'Paid', val: totalPaid },
                    { label: 'Due', val: totalDue },
                  ].map(s => (
                    <View key={s.label} style={styles.moneyStat}>
                      <Text style={[styles.moneyAmount, s.label === 'Due' && s.val > 0 && { color: Colors.gold }]}>
                        {fmtINR(s.val)}
                      </Text>
                      <Text style={styles.moneyLabel}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </Section>

            {/* Contract */}
            <Section label="CONTRACT">
              <Card>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardBodyText}>
                    {contract ? `${contract.template_type || 'Agreement'} · ${contract.status}` : 'No contract yet'}
                  </Text>
                  <View style={[styles.chip, { backgroundColor: contract?.status === 'signed' ? '#F4F1EC' : '#FFF8EC' }]}>
                    <Text style={[styles.chipText, { color: contract?.status === 'signed' ? Colors.muted : Colors.gold }]}>
                      {contract?.status || 'pending'}
                    </Text>
                  </View>
                </View>
              </Card>
            </Section>

            {/* Deliveries */}
            <Section label="DELIVERIES">
              <Card>
                <Text style={styles.cardBodyText}>
                  {deliveriesDone} of {deliveries.length} delivered
                </Text>
                {deliveries.length === 0 && (
                  <Text style={styles.mutedText}>No deliveries logged yet.</Text>
                )}
              </Card>
            </Section>

            {/* Last message */}
            {enquiry ? (
              <Section label="LAST MESSAGE">
                <Card>
                  <Text style={styles.cardBodyText}>{enquiry.last_message_preview || 'No messages yet'}</Text>
                  <Text style={[styles.mutedText, { marginTop: 4 }]}>{timeAgo(enquiry.last_message_at)}</Text>
                </Card>
              </Section>
            ) : null}

            {/* Private notes */}
            <Section label="PRIVATE NOTES">
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  placeholder="Notes visible only to you..."
                  placeholderTextColor={Colors.muted}
                  style={styles.notesInput}
                  textAlignVertical="top"
                />
                {notes !== (data.client?.notes || '') ? (
                  <TouchableOpacity
                    style={styles.saveNotesBtn}
                    onPress={saveNotes}
                    disabled={savingNotes}
                  >
                    <Text style={styles.saveNotesBtnText}>
                      {savingNotes ? '...' : 'SAVE NOTES'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </KeyboardAvoidingView>
            </Section>
          </>
        )}

        {/* Invoices tab */}
        {activeTab === 'invoices' && (
          <Section label="INVOICES">
            {invoices.length === 0 ? (
              <Text style={styles.emptyText}>No invoices yet.</Text>
            ) : invoices.map((inv: any) => (
              <Card key={inv.id} style={{ marginBottom: 8 }}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invoiceName}>{inv.invoice_number || `Invoice #${(inv.id || '').slice(0, 6)}`}</Text>
                    {inv.due_date ? (
                      <Text style={styles.mutedText}>Due {formatDate(inv.due_date)}</Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.invoiceAmount}>{fmtINR(inv.amount || 0)}</Text>
                    <StatusChip status={inv.status || 'pending'} />
                  </View>
                </View>
              </Card>
            ))}
          </Section>
        )}

        {/* Messages tab */}
        {activeTab === 'messages' && (
          <Section label="MESSAGES">
            {enquiry ? (
              <Card>
                <Text style={[styles.cardBodyText, { marginBottom: 12 }]}>
                  {enquiry.last_message_preview || 'Thread active'}
                </Text>
              </Card>
            ) : (
              <Text style={styles.emptyText}>No message thread linked.</Text>
            )}
          </Section>
        )}

        {/* Deliveries tab */}
        {activeTab === 'deliveries' && (
          <Section label="DELIVERIES">
            {deliveries.length === 0 ? (
              <Text style={styles.emptyText}>No deliveries logged.</Text>
            ) : deliveries.map((d: any) => (
              <Card key={d.id} style={{ marginBottom: 8 }}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardBodyText}>{d.item_name || d.description || 'Delivery item'}</Text>
                  <View style={[styles.chip, { backgroundColor: d.status === 'delivered' ? '#F4F1EC' : '#FFF8EC' }]}>
                    <Text style={[styles.chipText, { color: d.status === 'delivered' ? Colors.muted : Colors.gold }]}>
                      {d.status}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </Section>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editing} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Edit Client</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'Name', key: 'name' },
                { label: 'Phone', key: 'phone' },
                { label: 'Event Type', key: 'event_type' },
                { label: 'Budget (₹)', key: 'budget' },
                { label: 'Venue', key: 'venue' },
              ].map(f => (
                <View key={f.key} style={{ marginBottom: 16 }}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    value={editForm[f.key] || ''}
                    onChangeText={v => setEditForm((p: any) => ({ ...p, [f.key]: v }))}
                    style={styles.fieldInput}
                    placeholderTextColor={Colors.muted}
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={saveEdit}>
                <Text style={styles.modalSaveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal visible={deleting} animationType="fade" transparent>
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteSheet}>
            <Text style={styles.deleteTitle}>Delete {client.name}?</Text>
            <Text style={styles.deleteSubtitle}>
              This will remove the client record. Invoices will not be deleted.
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.deleteConfirmBtn}
                onPress={deleteClient}
              >
                <Text style={styles.deleteConfirmBtnText}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDeleting(false)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { fontFamily: Fonts.display, fontSize: 20, color: Colors.muted, fontStyle: 'italic' },

  toast: {
    position: 'absolute', top: 60, alignSelf: 'center',
    backgroundColor: Colors.dark, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, zIndex: 999,
  },
  toastText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.background },

  header: {
    backgroundColor: Colors.card,
    borderBottomWidth: 0.5, borderBottomColor: Colors.border,
    paddingHorizontal: 20, paddingBottom: 14,
  },
  backBtn: { paddingVertical: 12 },
  backText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  clientName: { fontFamily: Fonts.display, fontSize: 26, color: Colors.ink, marginBottom: 3 },
  clientSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editBtn: { backgroundColor: '#F4F1EC', borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  editBtnText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: Colors.ink },
  deleteBtn: { backgroundColor: 'rgba(220,53,53,0.08)', borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 6 },
  deleteBtnText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: '#DC3535' },
  callBtn: { backgroundColor: '#F4F1EC', borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  callBtnText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: Colors.ink },
  waBtn: { backgroundColor: '#25D366', borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 7 },
  waBtnText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: '#FFFFFF' },

  tabScroll: { paddingVertical: 12, flexGrow: 0 },
  tabChip: {
    borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: 'transparent',
  },
  tabChipActive: { backgroundColor: Colors.dark, borderColor: Colors.dark },
  tabChipText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: Colors.muted },
  tabChipTextActive: { color: Colors.background },

  scroll: { flex: 1 },
  sectionLabel: {
    fontFamily: Fonts.label, fontSize: 9, letterSpacing: 2.2, textTransform: 'uppercase',
    color: '#C8C4BE', marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: 14, marginBottom: 8,
  },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  moneyRow: { flexDirection: 'row', justifyContent: 'space-around' },
  moneyStat: { alignItems: 'center' },
  moneyAmount: { fontFamily: Fonts.display, fontSize: 20, color: Colors.ink, marginBottom: 3 },
  moneyLabel: { fontFamily: Fonts.label, fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.muted },

  cardBodyText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink, lineHeight: 20 },
  mutedText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted },
  emptyText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted, textAlign: 'center', marginTop: 40 },

  chip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: Radius.pill },
  chipText: { fontFamily: Fonts.label, fontSize: 8, letterSpacing: 1, textTransform: 'uppercase' },

  invoiceName: { fontFamily: Fonts.display, fontSize: 16, color: Colors.ink, marginBottom: 3 },
  invoiceAmount: { fontFamily: Fonts.bodyMedium, fontSize: 15, color: Colors.ink, marginBottom: 3 },

  notesInput: {
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.card,
    padding: 14,
    fontFamily: Fonts.body, fontSize: 13, color: Colors.ink,
    minHeight: 100, lineHeight: 20,
  },
  saveNotesBtn: {
    marginTop: 8, alignSelf: 'flex-start',
    backgroundColor: Colors.dark, borderRadius: Radius.pill,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  saveNotesBtnText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.background },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, maxHeight: '80%',
  },
  modalTitle: { fontFamily: Fonts.display, fontSize: 22, color: Colors.ink, marginBottom: 20 },
  fieldLabel: {
    fontFamily: Fonts.label, fontSize: 8, letterSpacing: 2.2, textTransform: 'uppercase',
    color: Colors.muted, marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: Colors.card,
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: Fonts.body, fontSize: 13, color: Colors.ink,
  },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalSaveBtn: { flex: 1, height: 44, backgroundColor: Colors.dark, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  modalSaveBtnText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.background },
  modalCancelBtn: { height: 44, paddingHorizontal: 20, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  modalCancelBtnText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.5, color: Colors.muted },

  deleteOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  deleteSheet: { backgroundColor: Colors.card, borderRadius: 20, padding: 28, width: '100%', maxWidth: 340, alignItems: 'center' },
  deleteTitle: { fontFamily: Fonts.display, fontSize: 22, color: Colors.ink, marginBottom: 8 },
  deleteSubtitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, marginBottom: 24, lineHeight: 20, textAlign: 'center' },
  deleteConfirmBtn: { flex: 1, height: 44, backgroundColor: '#DC3535', borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  deleteConfirmBtnText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: '#FFFFFF' },
});
