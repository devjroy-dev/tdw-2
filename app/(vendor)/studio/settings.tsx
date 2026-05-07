/**
 * app/(vendor)/studio/settings.tsx
 * Exact native port of web/app/vendor/studio/settings/page.tsx
 * Tips & Features + Google Account connection
 *
 * Endpoints:
 *   GET    /api/v2/vendor/gmail/status/:vendorId
 *   DELETE /api/v2/vendor/gmail/disconnect/:vendorId
 *   GET    /api/v2/vendor/gmail/connect/:vendorId → opens in browser (OAuth)
 */

import { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { RAILWAY_URL } from '../../../constants/tokens';
import { getVendorSession } from '../../../utils/session';

const API    = RAILWAY_URL;
const BG     = '#F8F7F5';
const CARD   = '#FFFFFF';
const GOLD   = '#C9A84C';
const DARK   = '#111111';
const MUTED  = '#8C8480';
const BORDER = '#E2DED8';
const GREEN  = '#4A7C59';

const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
const JOST  = 'Jost_300Light';

const TIPS = [
  { id: 'dreamai_whatsapp',  icon: '✦', title: 'DreamAi on WhatsApp',     description: 'Run your entire business from WhatsApp. Create invoices, add clients, block dates — all by sending a text. No dashboard needed.',                                                                    example: 'Text: "Sharma ji ka invoice banao, 5 lakh"',                                                          cta: 'Activate DreamAi',      href: 'https://wa.me/14787788550',      external: true  },
  { id: 'payment_shield',    icon: '◈', title: 'Payment Shield',            description: 'Secure your final payment before the wedding day. The couple commits to paying before you travel to the venue. Never chase a balance again.',                                                             example: 'Couple locks ₹80,000 balance two weeks before the wedding. You travel with confidence.',              cta: 'Go to Money',           href: '/(vendor)/money',                external: false },
  { id: 'broadcast',         icon: '◉', title: 'WhatsApp Broadcast',        description: 'Message all your clients at once with one tap. Payment reminders, season greetings, availability updates — sent to everyone in seconds.',                                                                 example: 'Send a payment reminder to every October client in 10 seconds.',                                      cta: 'Go to Broadcast',       href: '/(vendor)/studio/broadcast',    external: false },
  { id: 'discovery_profile', icon: '⬡', title: 'How Couples See You',       description: 'Couples swipe your work before they see your name. Your photos do the selling. A couple falls in love with your work, spends a token, and only then sees your identity.',                               example: 'A couple matches with your style. They spend a token. They see your name and message you.',           cta: 'Preview Your Profile',  href: '/(vendor)/discovery',            external: false },
  { id: 'progress_ring',     icon: '◐', title: 'Client Progress Ring',      description: 'Every client has a progress ring. Watch it fill from enquiry to final payment. At a glance, you know exactly where each relationship stands.',                                                           example: 'Add invoice → ring fills to 60%. Mark paid → ring completes to 100%.',                               cta: 'Go to Clients',         href: '/(vendor)/clients',              external: false },
  { id: 'gst_invoice',       icon: '₹', title: 'GST-Compliant Invoicing',   description: 'Every invoice auto-calculates CGST and SGST. Download as PDF. Your client gets a professional invoice. You stay compliant without an accountant.',                                                      example: 'Create invoice for Kapoor wedding ₹2L → GST splits instantly → download and send.',                  cta: 'Create Invoice',        href: '/(vendor)/money',                external: false },
  { id: 'block_dates',       icon: '◻', title: 'Block Your Calendar',       description: 'Block dates the moment you confirm a booking. Or text DreamAi on WhatsApp. Your calendar stays accurate and double-bookings become impossible.',                                                         example: 'Text DreamAi: "Block Dec 15 and 16 for Kapoor wedding"',                                             cta: 'Open Calendar',         href: '/(vendor)/studio/calendar',     external: false },
  { id: 'referral',          icon: '✦', title: 'Referral Discounts',        description: 'Refer past clients to TDW and earn subscription discounts when they join and send an enquiry. More referrals = lower monthly bill.',                                                                      example: '3 referrals = 20% off your monthly subscription. 10 referrals = 50% off.',                          cta: 'Get Your Referral Code',href: '/(vendor)/studio/referrals',    external: false },
  { id: 'collab_hub',        icon: '⟡', title: 'Collab Hub',                description: 'Post when you need a vendor for a shoot, or find work from other vendors who need your category. A private marketplace within TDW.',                                                                     example: 'Post: "Looking for MUA in Jaipur, Nov 15, ₹40K budget" — matching vendors notified.',                cta: 'Go to Collab',          href: '/(vendor)/discovery-collab',    external: false },
  { id: 'image_hub',         icon: '◫', title: 'Image Hub & Approval',      description: 'Every photo you upload is reviewed by our team before going live on the couple feed. Make them catalogue-worthy — editorial, portrait-oriented, well-lit.',                                              example: 'Sharp, well-lit, portrait-oriented photos get approved faster. Think Vogue, not Instagram.',          cta: 'Go to Image Hub',       href: '/(vendor)/discovery-images',    external: false },
  { id: 'dreamai_tab',       icon: '✦', title: 'DreamAi Mode',              description: 'Switch to ✦ AI mode to run your entire business by conversation. No buttons, no forms — just talk.',                                                                                                    example: '"Mehra booked me Dec 15, ₹80,000, 10% advance" — client added, invoice created, calendar blocked.',  cta: 'Open DreamAi',          href: '/(vendor)/dreamai',              external: false },
  { id: 'just_do_it',        icon: '⚡', title: 'Just Do It Mode',           description: 'Power user mode. DreamAi acts immediately without asking for confirmation. Turn on when you trust the AI.',                                                                                              example: 'Say "send Sharma a payment reminder" — it sends. No Confirm button.',                                 cta: 'Open DreamAi',          href: '/(vendor)/dreamai',              external: false },
];

export default function VendorSettingsScreen() {
  const [vendorId,       setVendorId]       = useState('');
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail,     setGmailEmail]     = useState('');
  const [gmailLoading,   setGmailLoading]   = useState(true);
  const [gmailWorking,   setGmailWorking]   = useState(false);
  const [toast,          setToast]          = useState('');
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
      fetch(`${API}/api/v2/vendor/gmail/status/${vid}`)
        .then(r => r.json())
        .then(d => { setGmailConnected(d.connected); setGmailEmail(d.email || ''); setGmailLoading(false); })
        .catch(() => setGmailLoading(false));
    });
  }, []);

  async function disconnectGmail() {
    if (!vendorId || gmailWorking) return;
    setGmailWorking(true);
    try {
      await fetch(`${API}/api/v2/vendor/gmail/disconnect/${vendorId}`, { method: 'DELETE' });
      setGmailConnected(false); setGmailEmail('');
      showToast('Google account disconnected');
    } catch { showToast('Error disconnecting'); }
    setGmailWorking(false);
  }

  return (
    <View style={styles.root}>
      {!!toast && (
        <Animated.View style={[styles.toast, { opacity: toastAnim }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={20} strokeWidth={1.5} color={DARK} />
          </TouchableOpacity>
          <Text style={styles.eyebrow}>YOUR STUDIO</Text>
          <Text style={styles.title}>Tips & Features</Text>
          <Text style={styles.subtitle}>Everything TDW can do for your business.</Text>
        </View>

        {/* Google Account */}
        <View style={styles.section}>
          <View style={styles.gmailCard}>
            <View style={styles.gmailRow}>
              <View style={styles.gmailLeft}>
                <Text style={styles.gmailIcon}>✉</Text>
                <View>
                  <Text style={styles.gmailTitle}>Google Account</Text>
                  <Text style={styles.gmailSub}>Send contracts via Gmail</Text>
                </View>
              </View>
              {gmailLoading ? (
                <View style={styles.gmailLoadingPill} />
              ) : gmailConnected ? (
                <TouchableOpacity style={styles.gmailDisconnectBtn} onPress={disconnectGmail} disabled={gmailWorking} activeOpacity={0.7}>
                  <Text style={styles.gmailDisconnectText}>{gmailWorking ? '…' : 'Disconnect'}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.gmailConnectBtn} onPress={() => Linking.openURL(`${API}/api/v2/vendor/gmail/connect/${vendorId}`)} activeOpacity={0.85}>
                  <Text style={styles.gmailConnectText}>Connect</Text>
                </TouchableOpacity>
              )}
            </View>
            {gmailConnected && gmailEmail ? (
              <Text style={styles.gmailConnectedLabel}>✓ Connected · {gmailEmail}</Text>
            ) : null}
          </View>
        </View>

        {/* Tip cards */}
        <View style={styles.section}>
          {TIPS.map(tip => (
            <View key={tip.id} style={styles.tipCard}>
              <View style={styles.tipHeader}>
                <Text style={styles.tipIcon}>{tip.icon}</Text>
                <Text style={styles.tipTitle}>{tip.title}</Text>
              </View>
              <Text style={styles.tipDesc}>{tip.description}</Text>
              <View style={styles.tipExample}>
                <Text style={styles.tipExampleLabel}>EXAMPLE</Text>
                <Text style={styles.tipExampleText}>{tip.example}</Text>
              </View>
              <TouchableOpacity
                style={styles.tipCta}
                activeOpacity={0.85}
                onPress={() => tip.external ? Linking.openURL(tip.href) : router.push(tip.href as any)}
              >
                <Text style={styles.tipCtaText}>{tip.cta}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  toast: { position: 'absolute', top: 16, left: 24, right: 24, zIndex: 100, backgroundColor: DARK, borderRadius: 8, padding: 12, alignItems: 'center' },
  toastText: { fontFamily: DM300, fontSize: 12, color: '#F8F7F5' },

  header:   { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28 },
  backBtn:  { marginBottom: 20, alignSelf: 'flex-start' },
  eyebrow:  { fontFamily: JOST, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: MUTED, marginBottom: 6 },
  title:    { fontFamily: CG300, fontSize: 28, color: DARK, lineHeight: 32 },
  subtitle: { fontFamily: DM300, fontSize: 13, color: MUTED, marginTop: 8 },

  section: { paddingHorizontal: 20, marginBottom: 20 },

  gmailCard:           { backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER, borderRadius: 14, padding: 20 },
  gmailRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gmailLeft:           { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gmailIcon:           { fontSize: 16, color: GOLD },
  gmailTitle:          { fontFamily: CG300, fontSize: 18, color: DARK },
  gmailSub:            { fontFamily: DM300, fontSize: 12, color: MUTED, marginTop: 2 },
  gmailLoadingPill:    { width: 44, height: 24, borderRadius: 100, backgroundColor: BORDER },
  gmailDisconnectBtn:  { height: 28, paddingHorizontal: 14, borderWidth: 0.5, borderColor: BORDER, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  gmailDisconnectText: { fontFamily: JOST, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: MUTED },
  gmailConnectBtn:     { height: 28, paddingHorizontal: 14, backgroundColor: DARK, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  gmailConnectText:    { fontFamily: JOST, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: '#F8F7F5' },
  gmailConnectedLabel: { fontFamily: DM300, fontSize: 11, color: GREEN, marginTop: 8 },

  tipCard:         { backgroundColor: CARD, borderWidth: 0.5, borderColor: BORDER, borderRadius: 14, padding: 20, marginBottom: 12 },
  tipHeader:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tipIcon:         { fontSize: 16, color: GOLD, flexShrink: 0 },
  tipTitle:        { fontFamily: CG300, fontSize: 20, color: DARK },
  tipDesc:         { fontFamily: DM300, fontSize: 13, color: '#555250', lineHeight: 20, marginBottom: 12 },
  tipExample:      { backgroundColor: BG, borderRadius: 8, padding: 12, marginBottom: 14 },
  tipExampleLabel: { fontFamily: JOST, fontSize: 8, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, marginBottom: 4 },
  tipExampleText:  { fontFamily: DM300, fontSize: 13, fontStyle: 'italic', color: '#555250', lineHeight: 18 },
  tipCta:          { height: 40, backgroundColor: DARK, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  tipCtaText:      { fontFamily: JOST, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: '#F8F7F5' },
});
