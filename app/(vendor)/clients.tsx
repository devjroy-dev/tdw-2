import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Modal, Animated, Easing,
  Linking,
} from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
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

const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
const DM400 = 'DMSans_400Regular';
const JOST  = 'Jost_300Light';

// ── Types ──────────────────────────────────────────────────────────────────
interface Client {
  id: string;
  name: string;
  phone?: string;
  event_type?: string;
  event_date?: string;
  status?: string;
  total_invoiced?: number;
  total_paid?: number;
  total_due?: number;
  progress?: number;
  profile_incomplete?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtINR(n: number) { return 'Rs ' + n.toLocaleString('en-IN'); }

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
  return <Animated.View style={{ height: 80, borderRadius: 14, backgroundColor: '#E8E5DF', opacity: anim, marginBottom: 10 }} />;
}

// ── Progress ring ──────────────────────────────────────────────────────────
// SVG not available in RN — use a custom arc-like View approach
function ProgressRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const safeP = Math.min(Math.max(pct, 0), 100);
  // Use a border-based approach: full border in BORDER, overlay gold arc with rotation
  const rotation = (safeP / 100) * 360;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Track */}
      <View style={{
        position: 'absolute', width: size, height: size, borderRadius: size / 2,
        borderWidth: 3, borderColor: BORDER,
      }} />
      {/* Fill — simple visual approximation using gold dot indicator */}
      {safeP > 0 && (
        <View style={{
          position: 'absolute', width: size, height: size, borderRadius: size / 2,
          borderWidth: 3, borderColor: GOLD,
          borderRightColor: safeP < 25 ? BORDER : GOLD,
          borderBottomColor: safeP < 50 ? BORDER : GOLD,
          borderLeftColor: safeP < 75 ? BORDER : GOLD,
        }} />
      )}
      <Text style={{ fontFamily: DM300, fontSize: 8, color: MUTED }}>{safeP}%</Text>
    </View>
  );
}

// ── Add client modal ───────────────────────────────────────────────────────
function AddClientModal({ visible, vendorId, onClose, onAdded }: {
  visible: boolean; vendorId: string; onClose: () => void; onAdded: (c: Client) => void;
}) {
  const [form, setForm] = useState({ name: '', phone: '', event_type: 'Wedding', event_date: '' });
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!form.name.trim() || adding) return;
    setAdding(true); setError('');
    try {
      const r = await fetch(`${API}/api/vendor-clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, ...form }),
      });
      const d = await r.json();
      if (d.success || d.id) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onAdded(d.data || d);
        setForm({ name: '', phone: '', event_type: 'Wedding', event_date: '' });
        onClose();
      } else {
        setError(d.error || 'Could not add client.');
      }
    } catch { setError('Network error.'); }
    finally { setAdding(false); }
  }

  const EVENT_TYPES = ['Wedding', 'Pre-Wedding', 'Engagement', 'Reception', 'Mehendi', 'Sangeet', 'Other'];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Add Client</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>NAME *</Text>
          <TextInput
            style={styles.fieldInput}
            value={form.name}
            onChangeText={v => setForm(f => ({ ...f, name: v }))}
            placeholder="Client name"
            placeholderTextColor="#C8C4BE"
            autoFocus
          />

          <Text style={styles.fieldLabel}>PHONE</Text>
          <TextInput
            style={styles.fieldInput}
            value={form.phone}
            onChangeText={v => setForm(f => ({ ...f, phone: v }))}
            placeholder="Optional"
            placeholderTextColor="#C8C4BE"
            keyboardType="phone-pad"
          />

          <Text style={styles.fieldLabel}>EVENT TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
            {EVENT_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, form.event_type === t && styles.typeChipActive]}
                onPress={() => setForm(f => ({ ...f, event_type: t }))}
              >
                <Text style={[styles.typeChipText, form.event_type === t && styles.typeChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.fieldLabel}>EVENT DATE</Text>
          <TextInput
            style={styles.fieldInput}
            value={form.event_date}
            onChangeText={v => setForm(f => ({ ...f, event_date: v }))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#C8C4BE"
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>

        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalConfirmBtn, (!form.name.trim() || adding) && { opacity: 0.5 }]}
            onPress={submit}
            disabled={!form.name.trim() || adding}
            activeOpacity={0.85}
          >
            <Text style={styles.modalConfirmText}>{adding ? 'Adding...' : 'ADD CLIENT'}</Text>
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
export default function VendorClientsScreen() {
  const insets = useSafeAreaInsets();

  const [vendorId,  setVendorId]  = useState('');
  const [clients,   setClients]   = useState<Client[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [showAdd,   setShowAdd]   = useState(false);
  const [toast,     setToast]     = useState('');

  const toastAnim = useRef(new Animated.Value(0)).current;

  function showToast(msg: string) {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(''));
  }

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function load() {
        const s = await getVendorSession();
        if (cancelled || !s) return;
        const vid = s.vendorId || s.id;
        setVendorId(vid);
        setLoading(true);
        try {
          const r = await fetch(`${API}/api/v2/vendor/clients/${vid}`);
          const d = await r.json();
          if (!cancelled) setClients(d.data || []);
        } catch {}
        finally { if (!cancelled) setLoading(false); }
      }
      load();
      return () => { cancelled = true; };
    }, [])
  );

  const filtered = clients.filter(c =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search)
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* Toast */}
      {!!toast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>BUSINESS</Text>
          <Text style={styles.headerTitle}>Clients</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.85}
          onPress={() => { Haptics.selectionAsync(); setShowAdd(true); }}
        >
          <Text style={styles.addBtnText}>+ ADD</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search clients..."
          placeholderTextColor="#C8C4BE"
          clearButtonMode="while-editing"
        />
      </View>

      {/* List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <><Shimmer /><Shimmer /><Shimmer /></>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{search ? 'No clients found.' : 'No clients yet.'}</Text>
            <Text style={styles.emptySub}>Add your first client or convert a lead.</Text>
          </View>
        ) : (
          filtered.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.clientCard, c.profile_incomplete && styles.clientCardIncomplete]}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/(vendor)/clients/${c.id}` as any);
              }}
            >
              <ProgressRing pct={c.progress || 0} />
              <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <Text style={styles.clientName} numberOfLines={1}>{c.name}</Text>
                  {c.profile_incomplete && <View style={styles.incompleteDot} />}
                </View>
                <Text style={styles.clientSub} numberOfLines={1}>
                  {c.event_type || 'Wedding'}{c.event_date ? ` · ${formatDate(c.event_date)}` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                {(c.total_invoiced || 0) > 0 && (
                  <Text style={styles.clientAmount}>{fmtINR(c.total_invoiced || 0)}</Text>
                )}
                {(c.total_due || 0) > 0 && (
                  <Text style={styles.clientDue}>{fmtINR(c.total_due || 0)} due</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add client modal */}
      <AddClientModal
        visible={showAdd}
        vendorId={vendorId}
        onClose={() => setShowAdd(false)}
        onAdded={(c) => {
          setClients(prev => [c, ...prev]);
          showToast('Client added');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  toast: {
    position: 'absolute', top: 60, alignSelf: 'center', zIndex: 100,
    backgroundColor: DARK, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8,
  },
  toastText: { fontFamily: DM300, fontSize: 12, color: '#F8F7F5' },

  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16,
    borderBottomWidth: 0.5, borderBottomColor: BORDER,
  },
  headerEyebrow: { fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  headerTitle: { fontFamily: CG300, fontSize: 28, color: DARK },
  addBtn: { height: 36, backgroundColor: DARK, borderRadius: 100, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#F8F7F5' },

  searchBar: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  searchInput: {
    fontFamily: DM300, fontSize: 13, color: DARK,
    borderBottomWidth: 1, borderBottomColor: BORDER, paddingBottom: 8,
  },

  clientCard: {
    backgroundColor: CARD, borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
  },
  clientCardIncomplete: { borderColor: 'rgba(220,53,53,0.3)' },
  clientName: { fontFamily: CG300, fontSize: 17, color: DARK, flex: 1 },
  clientSub: { fontFamily: DM300, fontSize: 12, color: MUTED },
  clientAmount: { fontFamily: DM400, fontSize: 13, color: DARK, marginBottom: 2 },
  clientDue: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: GOLD },
  incompleteDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#DC3535', flexShrink: 0 },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontFamily: CG300, fontSize: 20, fontStyle: 'italic', color: MUTED, marginBottom: 8 },
  emptySub: { fontFamily: DM300, fontSize: 13, color: MUTED },

  // Modal
  modalRoot: { flex: 1, backgroundColor: BG, padding: 24, paddingTop: 16 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: CG300, fontSize: 24, color: DARK, marginBottom: 20 },
  fieldLabel: { fontFamily: JOST, fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  fieldInput: {
    fontFamily: DM300, fontSize: 13, color: DARK,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    paddingVertical: 8, marginBottom: 20,
  },
  typeChip: {
    height: 32, paddingHorizontal: 14, borderRadius: 100,
    borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center',
    backgroundColor: CARD,
  },
  typeChipActive: { backgroundColor: DARK, borderColor: DARK },
  typeChipText: { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: MUTED },
  typeChipTextActive: { color: '#F8F7F5' },
  errorText: { fontFamily: DM300, fontSize: 12, color: '#DC3535', marginBottom: 12 },
  modalButtons: { gap: 12, paddingTop: 12, paddingBottom: 16 },
  modalConfirmBtn: { height: 48, backgroundColor: DARK, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  modalConfirmText: { fontFamily: JOST, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#F8F7F5' },
  modalCancelText: { fontFamily: DM300, fontSize: 13, color: MUTED, textAlign: 'center' },
});
