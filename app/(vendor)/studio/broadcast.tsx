/**
 * app/(vendor)/studio/broadcast.tsx
 * Exact native port of web/app/vendor/studio/broadcast/page.tsx
 *
 * Endpoints:
 *   GET  /api/broadcasts/:vendorId
 *   POST /api/v2/vendor/broadcast-whatsapp
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { RAILWAY_URL } from '../../../constants/tokens';
import { getVendorSession } from '../../../utils/session';

const API    = RAILWAY_URL;
const BG     = '#F8F7F5';
const CARD   = '#FFFFFF';
const WARM   = '#F4F1EC';
const GOLD   = '#C9A84C';
const DARK   = '#111111';
const MUTED  = '#8C8480';
const BORDER = '#E2DED8';
const MAX_CHARS = 500;

const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
const DM400 = 'DMSans_400Regular';
const JOST  = 'Jost_300Light';

const SEGMENTS = [
  { key: 'all',          label: 'All Clients',        desc: 'Everyone in your client list'         },
  { key: 'upcoming',     label: 'Upcoming Weddings',  desc: 'Events in the next 90 days'           },
  { key: 'post_wedding', label: 'Post-Wedding',        desc: 'Past clients — ask for reviews'       },
];

export default function VendorBroadcastScreen() {
  const [vendorId,    setVendorId]    = useState('');
  const [broadcasts,  setBroadcasts]  = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [segment,     setSegment]     = useState('all');
  const [message,     setMessage]     = useState('');
  const [sending,     setSending]     = useState(false);
  const [result,      setResult]      = useState<{ sent: number; total: number; failed_count: number } | null>(null);
  const [toast,       setToast]       = useState('');
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string) => {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2600),
      Animated.timing(toastAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setToast(''));
  };

  useEffect(() => {
    getVendorSession().then((s: any) => {
      if (!s) return;
      const vid = s.vendorId || s.id;
      setVendorId(vid);
      fetch(`${API}/api/broadcasts/${vid}`)
        .then(r => r.json())
        .then(d => { setBroadcasts(d.data || d || []); setLoading(false); })
        .catch(() => setLoading(false));
    });
  }, []);

  async function send() {
    if (!message.trim() || sending || !vendorId) return;
    setSending(true); setResult(null);
    try {
      const r = await fetch(`${API}/api/v2/vendor/broadcast-whatsapp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, message: message.trim(), segment }),
      });
      const d = await r.json();
      if (d.success) {
        setResult({ sent: d.sent || 0, total: d.total || 0, failed_count: d.failed_count || 0 });
        setBroadcasts(p => [{ id: Date.now(), message: message.trim(), template: segment, sent_count: d.sent, recipient_count: d.total, created_at: new Date().toISOString() }, ...p]);
        setMessage('');
        showToast(`Sent to ${d.sent} of ${d.total} clients`);
      } else {
        showToast(d.error || 'Could not send');
      }
    } catch { showToast('Network error'); }
    setSending(false);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {!!toast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} strokeWidth={1.5} color={DARK} />
          </TouchableOpacity>
          <Text style={styles.eyebrow}>STUDIO</Text>
          <Text style={styles.title}>Broadcast</Text>
        </View>

        <View style={styles.body}>
          {/* Segment picker */}
          <Text style={styles.fieldLabel}>SEND TO</Text>
          <View style={styles.segments}>
            {SEGMENTS.map(s => (
              <TouchableOpacity
                key={s.key}
                style={[styles.segmentCard, segment === s.key && styles.segmentCardActive]}
                onPress={() => setSegment(s.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentLabel, segment === s.key && styles.segmentLabelActive]}>{s.label}</Text>
                <Text style={[styles.segmentDesc,  segment === s.key && styles.segmentDescActive]}>{s.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message composer */}
          <Text style={[styles.fieldLabel, { marginTop: 4 }]}>MESSAGE</Text>
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              value={message}
              onChangeText={t => setMessage(t.slice(0, MAX_CHARS))}
              placeholder="Type your message here..."
              placeholderTextColor="#C8C4BE"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text style={[styles.charCount, message.length > MAX_CHARS * 0.9 && { color: GOLD }]}>
              {message.length}/{MAX_CHARS}
            </Text>
          </View>
          <Text style={styles.hint}>
            "Reply STOP to unsubscribe" is automatically appended to every message.
          </Text>

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, (!message.trim() || sending) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!message.trim() || sending}
            activeOpacity={0.85}
          >
            <Text style={styles.sendBtnText}>
              {sending ? 'Sending via WhatsApp…' : 'Send via WhatsApp'}
            </Text>
          </TouchableOpacity>

          {/* Result */}
          {result && (
            <View style={styles.resultCard}>
              <Text style={styles.resultText}>{result.sent} of {result.total} sent</Text>
              {result.failed_count > 0 && (
                <Text style={styles.resultFailed}>{result.failed_count} failed (no phone number)</Text>
              )}
            </View>
          )}

          {/* History */}
          {!loading && broadcasts.length > 0 && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 8, marginBottom: 10 }]}>HISTORY</Text>
              <View style={{ gap: 8 }}>
                {broadcasts.slice(0, 10).map((b: any) => (
                  <View key={b.id} style={styles.historyCard}>
                    <Text style={styles.historyMsg} numberOfLines={2}>{b.message}</Text>
                    <View style={styles.historyMeta}>
                      <Text style={styles.historyDate}>{b.created_at ? formatDate(b.created_at) : ''}</Text>
                      <Text style={styles.historySent}>{b.sent_count || 0}/{b.recipient_count || 0} sent</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  toast:   { position: 'absolute', top: 16, left: 24, right: 24, zIndex: 100, backgroundColor: DARK, borderRadius: 8, padding: 12, alignItems: 'center' },
  toastText: { fontFamily: DM300, fontSize: 12, color: '#F8F7F5' },

  header:  { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24 },
  backBtn: { marginBottom: 20, alignSelf: 'flex-start' },
  eyebrow: { fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: MUTED, marginBottom: 4 },
  title:   { fontFamily: CG300, fontSize: 28, color: DARK },
  body:    { paddingHorizontal: 20 },

  fieldLabel: { fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: MUTED, marginBottom: 10 },

  segments:          { gap: 8, marginBottom: 20 },
  segmentCard:       { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 14 },
  segmentCardActive: { backgroundColor: DARK, borderColor: DARK },
  segmentLabel:      { fontFamily: DM300, fontSize: 14, color: DARK, marginBottom: 2 },
  segmentLabelActive: { color: '#F8F7F5' },
  segmentDesc:       { fontFamily: DM300, fontSize: 12, color: MUTED },
  segmentDescActive: { color: 'rgba(248,247,245,0.6)' },

  composer:      { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 14, padding: 14, marginBottom: 8 },
  composerInput: { fontFamily: DM300, fontSize: 14, color: DARK, minHeight: 100, lineHeight: 22 },
  charCount:     { fontFamily: JOST, fontSize: 9, letterSpacing: 1, color: '#C8C4BE', textAlign: 'right', marginTop: 8 },

  hint: { fontFamily: DM300, fontSize: 11, color: MUTED, marginBottom: 16, lineHeight: 16 },

  sendBtn:         { height: 52, backgroundColor: DARK, borderRadius: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText:     { fontFamily: JOST, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#F8F7F5' },

  resultCard:   { backgroundColor: WARM, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 16, marginBottom: 20, alignItems: 'center' },
  resultText:   { fontFamily: CG300, fontSize: 22, color: DARK, marginBottom: 4 },
  resultFailed: { fontFamily: DM300, fontSize: 12, color: MUTED },

  historyCard: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, borderRadius: 12, padding: 14 },
  historyMsg:  { fontFamily: DM300, fontSize: 13, color: DARK, marginBottom: 8, lineHeight: 20 },
  historyMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  historyDate: { fontFamily: JOST, fontSize: 9, letterSpacing: 1, color: MUTED },
  historySent: { fontFamily: JOST, fontSize: 9, letterSpacing: 1, color: MUTED },
});
