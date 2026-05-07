/**
 * app/(vendor)/leads.tsx
 * Exact port of web/app/vendor/leads/page.tsx
 * Dark background (#0C0A09) — unique screen aesthetic matches PWA exactly.
 *
 * POST /api/v2/dreamai/whatsapp-extract
 * POST /api/vendor-clients
 * GET  /api/v2/vendor/clients/:vendorId
 * POST /api/v2/vendor/leads/:clientId/convert
 */
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { RAILWAY_URL } from '../../constants/tokens';
import { getVendorSession } from '../../utils/session';

const API = RAILWAY_URL;

// Dark page — unique to Leads
const PAGE_BG  = '#0C0A09';
const CARD_BG  = '#FFFFFF';
const GOLD     = '#C9A84C';
const MUTED    = '#888580';
const BORDER   = '#E2DED8';

const CG300   = 'CormorantGaramond_300Light';
const DM300   = 'DMSans_300Light';
const DM400   = 'DMSans_400Regular';
const JOST200 = 'Jost_200ExtraLight';
const JOST    = 'Jost_300Light';
const JOST400 = 'Jost_400Regular';

interface ExtractedLead { name: string|null; phone: string|null; wedding_date: string|null; event_type: string|null; budget: string|null; city: string|null; }
interface Client { id: string; name?: string; event_type?: string; budget?: number; event_date?: string; status?: string; city?: string; notes?: string; }

function fmtDate(d: string) { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }); }
function fmtINR(n: number) { return '₹' + n.toLocaleString('en-IN'); }

function LeadField({ label, value }: { label: string; value: string|null }) {
  return (
    <View style={s.leadField}>
      <Text style={s.leadFieldLabel}>{label}</Text>
      <Text style={[s.leadFieldValue, !value && { color: '#C8C4BE' }]}>{value || '—'}</Text>
    </View>
  );
}

function BookingSheet({ client, onConfirm, onCancel, loading }: { client: Client; onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <>
      <TouchableOpacity style={s.backdrop} onPress={onCancel} activeOpacity={1} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetEyebrow}>BOOK THIS COUPLE</Text>
        <Text style={s.sheetTitle}>{client.name || 'Unknown'}</Text>
        <View style={{ marginBottom: 24 }}>
          {[
            { label: 'Event',  value: client.event_type },
            { label: 'Date',   value: client.event_date ? fmtDate(client.event_date) : null },
            { label: 'Budget', value: client.budget ? fmtINR(client.budget) : null },
            { label: 'City',   value: client.city },
          ].filter(r => r.value).map(row => (
            <View key={row.label} style={s.sheetRow}>
              <Text style={s.sheetRowLabel}>{row.label}</Text>
              <Text style={s.sheetRowValue}>{row.value}</Text>
            </View>
          ))}
        </View>
        <Text style={s.sheetHint}>This will add them to your Clients with status <Text style={{ fontFamily: DM400 }}>Active</Text>.</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={[s.confirmBtn, loading && { opacity: 0.6 }]} onPress={onConfirm} disabled={loading} activeOpacity={0.85}>
            <Text style={s.confirmBtnText}>{loading ? 'Booking...' : 'Confirm Booking →'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

export default function VendorLeadsScreen() {
  const [vendorId,       setVendorId]       = useState('');
  const [message,        setMessage]        = useState('');
  const [extracting,     setExtracting]     = useState(false);
  const [extracted,      setExtracted]      = useState<ExtractedLead|null>(null);
  const [saving,         setSaving]         = useState(false);
  const [clients,        setClients]        = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [activeFilter,   setActiveFilter]   = useState('all');
  const [expandedId,     setExpandedId]     = useState<string|null>(null);
  const [bookingTarget,  setBookingTarget]  = useState<Client|null>(null);
  const [booking,        setBooking]        = useState(false);
  const [toast,          setToast]          = useState('');
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
    getVendorSession().then((s: any) => {
      if (!s) return;
      const vid = s.vendorId || s.id;
      setVendorId(vid);
      loadClients(vid);
    });
  }, []);

  function loadClients(vid: string) {
    setLoadingClients(true);
    fetch(`${API}/api/v2/vendor/clients/${vid}`)
      .then(r => r.json())
      .then(d => { setClients(Array.isArray(d.data) ? d.data : []); })
      .catch(() => {})
      .finally(() => setLoadingClients(false));
  }

  async function handleExtract() {
    if (!message.trim()) return;
    setExtracting(true);
    setExtracted(null);
    try {
      const res = await fetch(`${API}/api/v2/dreamai/whatsapp-extract`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setExtracted(json.data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else showToast('Could not extract lead details. Try again.');
    } catch { showToast('Unable to reach DreamAi. Check your connection.'); }
    setExtracting(false);
  }

  async function handleSave() {
    if (!extracted || !vendorId) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/vendor-clients`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          name: extracted.name || 'Unknown',
          phone: extracted.phone || null,
          event_type: extracted.event_type || null,
          event_date: extracted.wedding_date || null,
          budget: extracted.budget ? parseInt(extracted.budget.replace(/[^0-9]/g, '')) || null : null,
          notes: message.trim(),
          status: 'new',
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Lead saved.');
        setMessage(''); setExtracted(null);
        loadClients(vendorId);
      } else showToast('Could not save lead. Try again.');
    } catch { showToast('Could not save lead. Try again.'); }
    setSaving(false);
  }

  async function bookClient(client: Client) {
    if (!vendorId || booking) return;
    setBooking(true);
    try {
      const res = await fetch(`${API}/api/v2/vendor/leads/${client.id}/convert`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Booked ✓ Added to Clients');
        setBookingTarget(null);
        loadClients(vendorId);
      } else showToast(json.error || 'Could not book couple. Try again.');
    } catch { showToast('Could not book couple. Check connection.'); }
    setBooking(false);
  }

  const filters = ['all', 'new', 'active', 'done'];
  const filtered = activeFilter === 'all' ? clients : clients.filter(c => c.status === activeFilter);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: PAGE_BG }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {!!toast && (
        <Animated.View style={[s.toast, { opacity: toastAnim }]}>
          <Text style={s.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {bookingTarget && (
        <BookingSheet client={bookingTarget} onConfirm={() => bookClient(bookingTarget)} onCancel={() => setBookingTarget(null)} loading={booking} />
      )}

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Top wordmark */}
        <Text style={s.wordmark}>THE DREAM WEDDING</Text>

        {/* Header */}
        <Text style={s.eyebrow}>LEADS</Text>
        <Text style={s.pageTitle}>WhatsApp Leads</Text>
        <Text style={s.pageSubtitle}>Paste a WhatsApp message. DreamAi extracts the details.</Text>

        {/* Paste area */}
        <TextInput
          style={s.pasteArea}
          value={message}
          onChangeText={setMessage}
          placeholder="Paste WhatsApp message here..."
          placeholderTextColor="rgba(248,247,245,0.25)"
          multiline numberOfLines={6} textAlignVertical="top"
        />

        {/* Extract button */}
        <TouchableOpacity
          style={[s.extractBtn, (!message.trim() || extracting) && s.extractBtnDisabled]}
          onPress={handleExtract} disabled={extracting || !message.trim()} activeOpacity={0.85}
        >
          <Text style={[s.extractBtnText, !message.trim() && { color: 'rgba(17,17,17,0.4)' }]}>
            {extracting ? 'Extracting...' : 'Extract Lead'}
          </Text>
        </TouchableOpacity>

        {/* Extracted lead card */}
        {extracted && !extracting && (
          <View style={s.extractedCard}>
            <Text style={s.extractedLabel}>EXTRACTED LEAD</Text>
            <LeadField label="Name" value={extracted.name} />
            <LeadField label="Phone" value={extracted.phone} />
            <LeadField label="Wedding Date" value={extracted.wedding_date} />
            <LeadField label="Event Type" value={extracted.event_type} />
            <LeadField label="Budget" value={extracted.budget} />
            <LeadField label="City" value={extracted.city} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save as Lead'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.clearBtn} onPress={() => { setMessage(''); setExtracted(null); }} activeOpacity={0.7}>
                <Text style={s.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Leads list */}
        <View style={{ marginTop: 40 }}>
          <Text style={s.listEyebrow}>YOUR LEADS</Text>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
            {filters.map(f => (
              <TouchableOpacity key={f} style={[s.filterChip, activeFilter === f && s.filterChipActive]} onPress={() => setActiveFilter(f)} activeOpacity={0.8}>
                <Text style={[s.filterChipText, activeFilter === f && s.filterChipTextActive]}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* List */}
          {loadingClients ? (
            <Text style={{ fontFamily: DM300, fontSize: 13, color: 'rgba(248,247,245,0.3)', fontStyle: 'italic', textAlign: 'center', marginTop: 40 }}>Loading…</Text>
          ) : filtered.length === 0 ? (
            <Text style={{ fontFamily: DM300, fontSize: 14, color: 'rgba(248,247,245,0.3)', fontStyle: 'italic', textAlign: 'center', marginTop: 40 }}>No leads yet.</Text>
          ) : filtered.map(client => (
            <View key={client.id}>
              <TouchableOpacity
                style={s.leadCard}
                onPress={() => setExpandedId(expandedId === client.id ? null : client.id)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.leadName} numberOfLines={1}>{client.name || 'Unknown'}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    {client.event_type && <Text style={s.leadEventType}>{client.event_type}</Text>}
                    {!!client.budget && <Text style={s.leadBudget}>{fmtINR(client.budget)}</Text>}
                  </View>
                </View>
                {client.status && (
                  <View style={[s.statusPill, client.status === 'new' && s.statusPillNew]}>
                    <Text style={[s.statusPillText, client.status === 'new' && s.statusPillTextNew]}>{client.status}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {expandedId === client.id && (
                <View style={s.leadExpanded}>
                  {client.event_date && <Text style={s.leadDetail}>📅 {fmtDate(client.event_date)}</Text>}
                  {client.city && <Text style={s.leadDetail}>📍 {client.city}</Text>}
                  {client.notes && <Text style={s.leadNote}>"{client.notes}"</Text>}
                  <TouchableOpacity style={s.bookBtn} onPress={() => setBookingTarget(client)} activeOpacity={0.85}>
                    <Text style={s.bookBtnText}>Book this couple →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  toast:    { position: 'absolute', top: 16, left: 24, right: 24, zIndex: 100, backgroundColor: '#111111', borderRadius: 8, padding: 12, alignItems: 'center' },
  toastText: { fontFamily: DM300, fontSize: 13, color: '#F8F7F5' },

  wordmark:    { fontFamily: JOST200, fontSize: 9, letterSpacing: 2.2, textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)', marginBottom: 32 },
  eyebrow:     { fontFamily: JOST, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)', marginBottom: 8 },
  pageTitle:   { fontFamily: CG300, fontSize: 32, color: '#F8F7F5', marginBottom: 8, lineHeight: 37 },
  pageSubtitle: { fontFamily: DM300, fontSize: 14, color: 'rgba(248,247,245,0.5)', marginBottom: 32, lineHeight: 21 },

  pasteArea: {
    backgroundColor: 'rgba(248,247,245,0.05)', borderWidth: 0.5, borderColor: 'rgba(248,247,245,0.15)',
    borderRadius: 16, padding: 16, fontFamily: DM300, fontSize: 15, color: '#F8F7F5',
    minHeight: 120, textAlignVertical: 'top',
  },

  extractBtn:         { height: 56, backgroundColor: GOLD, borderRadius: 16, marginTop: 12, alignItems: 'center', justifyContent: 'center' },
  extractBtnDisabled: { backgroundColor: 'rgba(201,168,76,0.3)' },
  extractBtnText:     { fontFamily: JOST400, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: '#111111' },

  extractedCard:  { marginTop: 20, backgroundColor: CARD_BG, borderRadius: 16, padding: 20 },
  extractedLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: MUTED, marginBottom: 4 },

  leadField:      { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  leadFieldLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: MUTED, flexShrink: 0 },
  leadFieldValue: { fontFamily: DM300, fontSize: 15, color: '#111111', textAlign: 'right' },

  saveBtn:     { flex: 1, height: 48, backgroundColor: GOLD, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontFamily: JOST400, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: '#111111' },
  clearBtn:    { flex: 1, height: 48, borderWidth: 0.5, borderColor: BORDER, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  clearBtnText: { fontFamily: JOST400, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: MUTED },

  listEyebrow:  { fontFamily: JOST, fontSize: 9, letterSpacing: 2.2, textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)', marginBottom: 16 },

  filterChip:         { height: 30, paddingHorizontal: 12, borderRadius: 100, borderWidth: 0.5, borderColor: 'rgba(248,247,245,0.15)', alignItems: 'center', justifyContent: 'center' },
  filterChipActive:   { backgroundColor: '#F8F7F5', borderColor: '#F8F7F5' },
  filterChipText:     { fontFamily: JOST, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(248,247,245,0.5)' },
  filterChipTextActive: { color: '#111111' },

  leadCard:    { backgroundColor: 'rgba(248,247,245,0.04)', borderWidth: 0.5, borderColor: 'rgba(248,247,245,0.1)', borderRadius: 10, padding: 14, marginBottom: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  leadName:    { fontFamily: CG300, fontSize: 17, color: '#F8F7F5' },
  leadEventType: { fontFamily: JOST, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)' },
  leadBudget:  { fontFamily: DM300, fontSize: 12, color: GOLD },

  statusPill:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, backgroundColor: 'rgba(248,247,245,0.08)' },
  statusPillNew:  { backgroundColor: 'rgba(201,168,76,0.15)' },
  statusPillText: { fontFamily: JOST, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)' },
  statusPillTextNew: { color: GOLD },

  leadExpanded: { backgroundColor: 'rgba(248,247,245,0.06)', borderWidth: 0.5, borderColor: 'rgba(248,247,245,0.1)', borderTopWidth: 0, borderRadius: 10, padding: 12, marginBottom: 2 },
  leadDetail:   { fontFamily: DM300, fontSize: 13, color: 'rgba(248,247,245,0.5)', marginBottom: 6 },
  leadNote:     { fontFamily: DM300, fontSize: 13, color: 'rgba(248,247,245,0.4)', fontStyle: 'italic', marginTop: 6 },
  bookBtn:      { marginTop: 14, height: 40, backgroundColor: GOLD, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  bookBtnText:  { fontFamily: JOST400, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: '#111111' },

  // Booking sheet
  backdrop:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 200 },
  sheet:      { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 201, backgroundColor: CARD_BG, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 20 },
  sheetEyebrow: { fontFamily: JOST200, fontSize: 9, letterSpacing: 2.2, textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  sheetTitle:  { fontFamily: CG300, fontSize: 24, color: '#111111', marginBottom: 20, lineHeight: 28 },
  sheetRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#F0EEE8' },
  sheetRowLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', color: MUTED },
  sheetRowValue: { fontFamily: DM300, fontSize: 14, color: '#111111' },
  sheetHint:   { fontFamily: DM300, fontSize: 12, color: MUTED, marginBottom: 20, lineHeight: 18 },
  confirmBtn:  { flex: 1, height: 52, backgroundColor: GOLD, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontFamily: JOST400, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: '#111111' },
  cancelBtn:   { height: 52, paddingHorizontal: 20, borderWidth: 0.5, borderColor: BORDER, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontFamily: JOST, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: MUTED },
});
