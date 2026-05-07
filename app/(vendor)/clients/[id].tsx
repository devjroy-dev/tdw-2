import { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal, Animated, Linking, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { RAILWAY_URL } from '../../../constants/tokens';
import { getVendorSession } from '../../../utils/session';

const API   = RAILWAY_URL;
const GOLD  = '#C9A84C';
const BG    = '#F8F7F5';
const CARD  = '#FFFFFF';
const BORDER = '#E2DED8';
const MUTED  = '#8C8480';
const DARK   = '#111111';
const RED    = '#DC3535';

const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
const DM400 = 'DMSans_400Regular';
const JOST  = 'Jost_300Light';

type Tab = 'overview' | 'invoices' | 'messages' | 'deliveries';

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
function formatShort(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function fmtINR(n: number) { return 'Rs ' + n.toLocaleString('en-IN'); }
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  const dd = Math.floor(diff / 86400000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  if (dd < 7) return `${dd}d ago`;
  return formatShort(d);
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
  return <Animated.View style={{ height: 60, borderRadius: 12, backgroundColor: '#E8E5DF', opacity: anim, marginBottom: 10 }} />;
}

// ── Progress ring ──────────────────────────────────────────────────────────
function ProgressRing({ pct }: { pct: number }) {
  const safe = Math.min(Math.max(pct, 0), 100);
  return (
    <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: BORDER }} />
      {safe > 0 && (
        <View style={{
          position: 'absolute', width: 44, height: 44, borderRadius: 22, borderWidth: 3,
          borderColor: GOLD,
          borderRightColor: safe < 25 ? BORDER : GOLD,
          borderBottomColor: safe < 50 ? BORDER : GOLD,
          borderLeftColor: safe < 75 ? BORDER : GOLD,
        }} />
      )}
      <Text style={{ fontFamily: DM300, fontSize: 8, color: MUTED }}>{safe}%</Text>
    </View>
  );
}

// ── Section ────────────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 24 }}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

// ── Status badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const isPaid = status === 'paid';
  return (
    <View style={[styles.badge, { backgroundColor: isPaid ? '#F4F1EC' : '#FFF8EC' }]}>
      <Text style={[styles.badgeText, { color: isPaid ? MUTED : GOLD }]}>{status?.toUpperCase()}</Text>
    </View>
  );
}

// ── Edit modal ─────────────────────────────────────────────────────────────
function EditModal({ visible, client, onClose, onSaved }: {
  visible: boolean; client: any; onClose: () => void; onSaved: (data: any) => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || '',
        phone: client.phone || '',
        event_type: client.event_type || 'Wedding',
        event_date: client.event_date || '',
        budget: client.budget ? String(client.budget) : '',
        venue: client.venue || '',
      });
    }
  }, [client]);

  async function save() {
    setSaving(true);
    try {
      await fetch(`${API}/api/vendor-clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      onSaved(form);
      onClose();
    } catch {}
    finally { setSaving(false); }
  }

  const FIELDS = [
    { label: 'Name', key: 'name', keyboard: 'default' },
    { label: 'Phone', key: 'phone', keyboard: 'phone-pad' },
    { label: 'Event Type', key: 'event_type', keyboard: 'default' },
    { label: 'Event Date (YYYY-MM-DD)', key: 'event_date', keyboard: 'default' },
    { label: 'Budget', key: 'budget', keyboard: 'number-pad' },
    { label: 'Venue', key: 'venue', keyboard: 'default' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Edit Client</Text>
        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {FIELDS.map(f => (
            <View key={f.key} style={{ marginBottom: 16 }}>
              <Text style={styles.fieldLabel}>{f.label.toUpperCase()}</Text>
              <TextInput
                style={styles.fieldInput}
                value={form[f.key] || ''}
                onChangeText={v => setForm((p: any) => ({ ...p, [f.key]: v }))}
                keyboardType={f.keyboard as any}
                placeholderTextColor="#C8C4BE"
              />
            </View>
          ))}
        </ScrollView>
        <View style={styles.modalButtons}>
          <TouchableOpacity style={[styles.modalConfirmBtn, saving && { opacity: 0.5 }]} onPress={save} disabled={saving} activeOpacity={0.85}>
            <Text style={styles.modalConfirmText}>{saving ? 'Saving...' : 'SAVE'}</Text>
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
export default function ClientDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [vendorId,    setVendorId]    = useState('');
  const [data,        setData]        = useState<any>(null);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState('');
  const [notes,       setNotes]       = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [activeTab,   setActiveTab]   = useState<Tab>('overview');
  const [editing,     setEditing]     = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  const toastAnim = useRef(new Animated.Value(0)).current;

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(''));
  }

  useEffect(() => {
    async function load() {
      const s = await getVendorSession();
      if (!s) return;
      const vid = s.vendorId || s.id;
      setVendorId(vid);
      try {
        const r = await fetch(`${API}/api/v2/vendor/clients/${vid}/${id}`);
        const d = await r.json();
        if (d.success) { setData(d.data); setNotes(d.data.client?.notes || ''); }
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, [id]);

  async function saveNotes() {
    if (savingNotes) return;
    setSavingNotes(true);
    try {
      await fetch(`${API}/api/vendor-clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      showToast('Notes saved');
    } catch { showToast('Could not save'); }
    finally { setSavingNotes(false); }
  }

  async function deleteClient() {
    try {
      await fetch(`${API}/api/vendor-clients/${id}`, { method: 'DELETE' });
      showToast('Client deleted');
      setTimeout(() => router.back(), 1000);
    } catch { showToast('Could not delete'); }
  }

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.backBar}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>‹ Clients</Text></TouchableOpacity>
        </View>
        <View style={{ padding: 20 }}><Shimmer /><Shimmer /><Shimmer /></View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.emptyItalic}>Client not found.</Text>
      </View>
    );
  }

  const { client, invoices, contract, deliveries, enquiry } = data;

  // Financial summary
  const totalInvoiced = (invoices || []).reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const totalPaid = (invoices || []).filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount || 0), 0);
  const totalDue = totalInvoiced - totalPaid;

  // Progress calculation
  const contractPct    = contract?.status === 'signed' ? 25 : 0;
  const financialPct   = totalInvoiced > 0 ? Math.min(25, (totalPaid / totalInvoiced) * 25) : 0;
  const deliveriesDone = (deliveries || []).filter((d: any) => d.status === 'delivered').length;
  const deliveryPct    = (deliveries || []).length > 0 ? Math.min(25, (deliveriesDone / (deliveries || []).length) * 25) : 0;
  const daysSinceMsg   = enquiry?.last_message_at ? Math.floor((Date.now() - new Date(enquiry.last_message_at).getTime()) / 86400000) : 999;
  const commsPct       = daysSinceMsg <= 14 ? 25 : 0;
  const progress       = Math.round(financialPct + contractPct + deliveryPct + commsPct);

  const TABS: Tab[] = ['overview', 'invoices', 'messages', 'deliveries'];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Toast */}
      {!!toast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backRow}>
          <Text style={styles.backText}>‹ Clients</Text>
        </TouchableOpacity>
        <View style={styles.clientHero}>
          <ProgressRing pct={progress} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.detailName}>{client.name}</Text>
            <Text style={styles.detailSub}>
              {client.event_type || 'Wedding'}{client.event_date ? ` · ${formatDate(client.event_date)}` : ''}
            </Text>
          </View>
        </View>

        {/* Edit + Delete */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(true)} activeOpacity={0.85}>
            <Text style={styles.editBtnText}>EDIT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => setDeleting(true)} activeOpacity={0.85}>
            <Text style={styles.deleteBtnText}>DELETE</Text>
          </TouchableOpacity>
        </View>

        {/* Contact actions */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
          {!!client.phone && (
            <TouchableOpacity style={styles.contactBtn} onPress={() => Linking.openURL(`tel:${client.phone}`)} activeOpacity={0.85}>
              <Text style={styles.contactBtnText}>CALL</Text>
            </TouchableOpacity>
          )}
          {!!client.phone && (
            <TouchableOpacity style={styles.waBtn} onPress={() => Linking.openURL(`https://wa.me/${client.phone?.replace(/\D/g, '')}`)} activeOpacity={0.85}>
              <Text style={styles.waBtnText}>WHATSAPP</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Sub-nav tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabContent}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => { Haptics.selectionAsync(); setActiveTab(t); }}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <>
            <Section label="MONEY">
              <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20 }]}>
                {[{ label: 'Invoiced', val: totalInvoiced }, { label: 'Paid', val: totalPaid }, { label: 'Due', val: totalDue }].map(s => (
                  <View key={s.label} style={{ alignItems: 'center' }}>
                    <Text style={[styles.moneyVal, s.label === 'Due' && s.val > 0 && { color: GOLD }]}>{fmtINR(s.val)}</Text>
                    <Text style={styles.moneyLabel}>{s.label.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            </Section>

            <Section label="CONTRACT">
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.cardText}>{contract ? `${contract.template_type || 'Agreement'} · ${contract.status}` : 'No contract yet'}</Text>
                  <StatusBadge status={contract?.status || 'pending'} />
                </View>
              </Card>
            </Section>

            <Section label="DELIVERIES">
              <Card>
                <Text style={styles.cardText}>{deliveriesDone} of {(deliveries || []).length} delivered</Text>
                {(deliveries || []).length === 0 && <Text style={styles.cardSub}>No deliveries logged yet.</Text>}
              </Card>
            </Section>

            {enquiry && (
              <Section label="LAST MESSAGE">
                <Card>
                  <Text style={styles.cardText} numberOfLines={2}>{enquiry.last_message_preview || 'No messages yet'}</Text>
                  <Text style={styles.cardSub}>{timeAgo(enquiry.last_message_at)}</Text>
                </Card>
              </Section>
            )}

            <Section label="PRIVATE NOTES">
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
                placeholder="Notes visible only to you..."
                placeholderTextColor="#C8C4BE"
                textAlignVertical="top"
              />
              {notes !== (data.client?.notes || '') && (
                <TouchableOpacity style={styles.saveNotesBtn} onPress={saveNotes} disabled={savingNotes} activeOpacity={0.85}>
                  <Text style={styles.saveNotesBtnText}>{savingNotes ? '...' : 'SAVE NOTES'}</Text>
                </TouchableOpacity>
              )}
            </Section>
          </>
        )}

        {/* ── Invoices ── */}
        {activeTab === 'invoices' && (
          <Section label="INVOICES">
            {(invoices || []).length === 0 ? (
              <Text style={[styles.emptyItalic, { textAlign: 'center', marginTop: 40 }]}>No invoices yet.</Text>
            ) : (invoices || []).map((inv: any) => (
              <Card key={inv.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invoiceNum}>{inv.invoice_number || `Invoice #${inv.id?.slice(0, 6)}`}</Text>
                    {inv.due_date && <Text style={styles.invoiceDue}>Due {formatShort(inv.due_date)}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={styles.invoiceAmount}>{fmtINR(inv.amount || 0)}</Text>
                    <StatusBadge status={inv.status || 'pending'} />
                  </View>
                </View>
              </Card>
            ))}
          </Section>
        )}

        {/* ── Messages ── */}
        {activeTab === 'messages' && (
          <Section label="MESSAGES">
            {enquiry ? (
              <Card>
                <Text style={styles.cardText} numberOfLines={3}>{enquiry.last_message_preview || 'Thread active'}</Text>
                <TouchableOpacity style={[styles.saveNotesBtn, { marginTop: 12 }]} activeOpacity={0.85}>
                  <Text style={styles.saveNotesBtnText}>OPEN THREAD</Text>
                </TouchableOpacity>
              </Card>
            ) : (
              <Text style={[styles.emptyItalic, { textAlign: 'center', marginTop: 40 }]}>No message thread linked.</Text>
            )}
          </Section>
        )}

        {/* ── Deliveries ── */}
        {activeTab === 'deliveries' && (
          <Section label="DELIVERIES">
            {(deliveries || []).length === 0 ? (
              <Text style={[styles.emptyItalic, { textAlign: 'center', marginTop: 40 }]}>No deliveries logged.</Text>
            ) : (deliveries || []).map((d: any) => (
              <Card key={d.id}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={styles.cardText}>{d.item_name || d.description || 'Delivery item'}</Text>
                  <StatusBadge status={d.status || 'pending'} />
                </View>
              </Card>
            ))}
          </Section>
        )}
      </ScrollView>

      {/* Edit modal */}
      <EditModal
        visible={editing}
        client={client}
        onClose={() => setEditing(false)}
        onSaved={(form) => {
          setData((prev: any) => ({ ...prev, client: { ...prev.client, ...form } }));
          showToast('Client updated');
        }}
      />

      {/* Delete confirm */}
      <Modal visible={deleting} animationType="fade" transparent onRequestClose={() => setDeleting(false)}>
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteSheet}>
            <Text style={styles.deleteTitle}>Delete {client.name}?</Text>
            <Text style={styles.deleteSub}>This will remove the client record. Invoices will not be deleted.</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={deleteClient} activeOpacity={0.85}>
                <Text style={styles.deleteConfirmText}>DELETE</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setDeleting(false)} activeOpacity={0.85}>
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  backBar: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  backRow: { marginBottom: 12 },
  backText: { fontFamily: DM300, fontSize: 13, color: MUTED },

  detailHeader: { backgroundColor: CARD, borderBottomWidth: 0.5, borderBottomColor: BORDER, padding: 20 },
  clientHero: { flexDirection: 'row', alignItems: 'center' },
  detailName: { fontFamily: CG300, fontSize: 26, color: DARK, marginBottom: 3 },
  detailSub: { fontFamily: DM300, fontSize: 13, color: MUTED },

  editBtn: { height: 30, backgroundColor: '#F4F1EC', borderRadius: 100, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: DARK },
  deleteBtn: { height: 30, backgroundColor: 'rgba(220,53,53,0.08)', borderRadius: 100, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: RED },

  contactBtn: { height: 32, backgroundColor: '#F4F1EC', borderRadius: 100, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  contactBtnText: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: DARK },
  waBtn: { height: 32, backgroundColor: '#25D366', borderRadius: 100, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  waBtnText: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#FFFFFF' },

  tabScroll: { flexGrow: 0, flexShrink: 0, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  tabContent: { paddingHorizontal: 20, paddingVertical: 12, gap: 8 },
  tab: { height: 30, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  tabActive: { backgroundColor: DARK, borderColor: DARK },
  tabText: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: MUTED },
  tabTextActive: { color: '#F8F7F5' },

  sectionLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: '#C8C4BE', marginBottom: 10 },
  card: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 16, marginBottom: 8 },
  cardText: { fontFamily: DM300, fontSize: 14, color: DARK, lineHeight: 21 },
  cardSub: { fontFamily: DM300, fontSize: 12, color: MUTED, marginTop: 4 },

  moneyVal: { fontFamily: CG300, fontSize: 20, color: DARK, marginBottom: 3 },
  moneyLabel: { fontFamily: JOST, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: MUTED },

  badge: { borderRadius: 100, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: JOST, fontSize: 8, letterSpacing: 2 },

  invoiceNum: { fontFamily: CG300, fontSize: 16, color: DARK, marginBottom: 3 },
  invoiceDue: { fontFamily: DM300, fontSize: 12, color: MUTED },
  invoiceAmount: { fontFamily: DM400, fontSize: 15, color: DARK, marginBottom: 4 },

  notesInput: {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14,
    padding: 16, fontFamily: DM300, fontSize: 13, color: DARK, lineHeight: 21, minHeight: 100,
  },
  saveNotesBtn: { marginTop: 8, backgroundColor: DARK, borderRadius: 100, paddingHorizontal: 18, paddingVertical: 9, alignSelf: 'flex-start' },
  saveNotesBtnText: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#F8F7F5' },

  emptyItalic: { fontFamily: CG300, fontSize: 18, fontStyle: 'italic', color: MUTED },

  // Modal shared
  modalRoot: { flex: 1, backgroundColor: BG, padding: 24, paddingTop: 16 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: CG300, fontSize: 22, color: DARK, marginBottom: 20 },
  fieldLabel: { fontFamily: JOST, fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  fieldInput: { fontFamily: DM300, fontSize: 13, color: DARK, borderBottomWidth: 1, borderBottomColor: BORDER, paddingVertical: 8, marginBottom: 4 },
  modalButtons: { gap: 12, paddingTop: 12, paddingBottom: 16 },
  modalConfirmBtn: { height: 48, backgroundColor: DARK, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  modalConfirmText: { fontFamily: JOST, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#F8F7F5' },
  modalCancelText: { fontFamily: DM300, fontSize: 13, color: MUTED, textAlign: 'center' },

  // Delete modal
  deleteOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  deleteSheet: { backgroundColor: CARD, borderRadius: 20, padding: 28, width: '100%', maxWidth: 340 },
  deleteTitle: { fontFamily: CG300, fontSize: 22, color: DARK, marginBottom: 8, textAlign: 'center' },
  deleteSub: { fontFamily: DM300, fontSize: 13, color: MUTED, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  deleteConfirmBtn: { flex: 1, height: 44, backgroundColor: RED, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  deleteConfirmText: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#FFFFFF' },
  deleteCancelBtn: { flex: 1, height: 44, borderWidth: 1, borderColor: BORDER, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  deleteCancelText: { fontFamily: JOST, fontSize: 9, color: MUTED },
});
