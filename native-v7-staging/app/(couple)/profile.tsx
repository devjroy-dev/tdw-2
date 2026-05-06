/**
 * TDW Native V7 — Couple Profile + Settings (Basic)
 * Exact port of web/app/couple/me/page.tsx
 *
 * V7 scope (per Manager directive):
 *  - Bride + partner name — display only
 *  - Wedding date — display only
 *  - Tier display — reads couple.couple_tier (NEVER dreamer_type)
 *  - Sign out — clears couple_session + couple_web_session, navigates to /
 *  - Notification preferences — UI toggles only (push wiring is V10)
 *  - Upgrade CTA — toast only (Razorpay V11)
 *
 * Full editable preferences, discovery prefs, budget visibility — V8.
 *
 * Endpoints:
 *   GET /api/v2/couple/profile/:id
 *   GET /api/v2/couple/tokens/:id
 */

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius, RAILWAY_URL } from '../../constants/tokens';

const API = RAILWAY_URL;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return 'D';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getDaysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[styles.toggleTrack, { backgroundColor: on ? Colors.gold : '#D8D4CE' }]}
      activeOpacity={0.8}
    >
      <View style={[styles.toggleThumb, { left: on ? 21 : 3 }]} />
    </TouchableOpacity>
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CoupleProfileScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [tier, setTier] = useState<'lite' | 'signature' | 'platinum'>('lite');
  const [weddingDate, setWeddingDate] = useState<string | null>(null);
  const [tokens, setTokens] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dreamAiHome, setDreamAiHome] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('couple_session') || await AsyncStorage.getItem('couple_web_session') || '';
        if (!raw) { router.replace('/'); return; }
        const s = JSON.parse(raw);
        if (!s?.id) { router.replace('/'); return; }

        // Name from session
        const n = s?.name || s?.dreamer_name || '';
        if (n) setName(n);

        // DreamAi home preference
        const savedHome = await AsyncStorage.getItem('couple_default_home');
        setDreamAiHome(savedHome === 'dreamai');

        const [profileRes, tokenRes] = await Promise.all([
          fetch(`${API}/api/v2/couple/profile/${s.id}`).then(r => r.json()).catch(() => null),
          fetch(`${API}/api/v2/couple/tokens/${s.id}`).then(r => r.json()).catch(() => null),
        ]);

        if (profileRes?.couple) {
          const p = profileRes.couple;
          // Read couple_tier first, fall back to tier (NEVER dreamer_type for tier display)
          const t = p.couple_tier || p.tier || 'lite';
          setTier(t.toLowerCase() as 'lite' | 'signature' | 'platinum');
          if (p.wedding_date) setWeddingDate(p.wedding_date);
          if (!n && p.name) setName(p.name);
        }

        if (tokenRes?.remaining !== undefined) setTokens(tokenRes.remaining);
        else if (tokenRes?.balance !== undefined) setTokens(tokenRes.balance);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const showToast = (msg: string) => { setToast(msg); };

  async function handleHomeToggle() {
    const next = !dreamAiHome;
    setDreamAiHome(next);
    await AsyncStorage.setItem('couple_default_home', next ? 'dreamai' : 'today');
    showToast(next ? 'DreamAi set as home screen.' : 'Today set as home screen.');
  }

  async function handleSignOut() {
    await AsyncStorage.removeItem('couple_session');
    await AsyncStorage.removeItem('couple_web_session');
    router.replace('/');
  }

  const initials = getInitials(name);
  const daysUntil = weddingDate ? getDaysUntil(weddingDate) : null;

  const tierLabel = tier === 'platinum' ? 'Platinum' : tier === 'signature' ? 'Signature' : 'Lite';
  const tierColor = tier === 'platinum' ? Colors.ink : tier === 'signature' ? Colors.gold : Colors.muted;
  const avatarBorder = tier === 'platinum'
    ? { borderWidth: 2, borderColor: Colors.ink }
    : tier === 'signature'
    ? { borderWidth: 2, borderColor: Colors.gold }
    : {};

  const upgradeLabel = tier === 'lite' ? 'Upgrade to Signature' : 'Upgrade to Platinum';
  const upgradePrice = tier === 'lite' ? '₹999 one-time' : '₹2,999 one-time';
  const upgradeSub = tier === 'lite' ? 'Unlock discovery tokens & more' : 'Unlock Couture, DreamAi & Memory Box';
  const upgradeBackground = tier === 'lite' ? Colors.dark : { colors: [Colors.gold, '#a8893a'] };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {toast ? <Toast msg={toast} onDone={() => setToast('')} /> : null}

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 32, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={[styles.avatar, avatarBorder]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Name */}
        <Text style={styles.nameText}>{name || 'Dreamer'}</Text>

        {/* Tier badge */}
        <View style={styles.tierRow}>
          <View style={[styles.tierBadge, { borderColor: tierColor }]}>
            <Text style={[styles.tierBadgeText, { color: tierColor }]}>{tierLabel}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => showToast('Wedding date editing coming soon.')}
            activeOpacity={0.8}
          >
            <Text style={styles.statLabel}>Wedding</Text>
            {weddingDate ? (
              <>
                <Text style={styles.statValue}>
                  {daysUntil !== null && daysUntil > 0 ? `${daysUntil}` : daysUntil === 0 ? 'Today' : '—'}
                </Text>
                <Text style={styles.statSub}>
                  {daysUntil !== null && daysUntil > 0 ? 'days to go' : formatDate(weddingDate)}
                </Text>
              </>
            ) : (
              <Text style={[styles.statSub, { color: Colors.gold }]}>Add date</Text>
            )}
          </TouchableOpacity>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>DreamAi</Text>
            <Text style={styles.statValue}>{loading ? '—' : tokens ?? '—'}</Text>
            <Text style={styles.statSub}>queries left</Text>
          </View>
        </View>

        {/* Upgrade CTA — hidden for Platinum */}
        {tier !== 'platinum' && (
          <TouchableOpacity
            style={[styles.upgradeCard, { backgroundColor: tier === 'lite' ? Colors.dark : Colors.gold }]}
            onPress={() => showToast('Upgrade available soon — Razorpay integration in progress.')}
            activeOpacity={0.85}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeLabel}>{upgradeLabel}</Text>
              <Text style={styles.upgradePrice}>{upgradePrice}</Text>
              <Text style={styles.upgradeSub}>{upgradeSub}</Text>
            </View>
            <Text style={styles.upgradeChevron}>›</Text>
          </TouchableOpacity>
        )}

        {/* Menu rows */}
        <View style={styles.menuCard}>
          {[
            { label: 'My Muse', icon: '♥', onPress: () => showToast('Muse — navigate from Plan tab.') },
            { label: 'My Circle', icon: '○', onPress: () => router.push('/(couple)/circle') },
            { label: 'DreamAi Queries', icon: '✦', onPress: () => showToast('Buy more queries coming soon.') },
            { label: 'Settings', icon: '⚙', onPress: () => setSettingsOpen(true) },
          ].map((row, i, arr) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.menuRow, i < arr.length - 1 && styles.menuRowBorder]}
              onPress={row.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>{row.icon}</Text>
              <Text style={styles.menuLabel}>{row.label}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutRow} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Settings Sheet — V7 basic only */}
      <Modal visible={settingsOpen} animationType="slide" transparent>
        <TouchableOpacity
          style={styles.settingsBackdrop}
          activeOpacity={1}
          onPress={() => setSettingsOpen(false)}
        />
        <View style={[styles.settingsSheet, { paddingBottom: insets.bottom + 32 }]}>
          <View style={styles.settingsHandle} />
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Settings</Text>
            <TouchableOpacity onPress={() => setSettingsOpen(false)}>
              <Text style={{ fontSize: 20, color: Colors.muted }}>×</Text>
            </TouchableOpacity>
          </View>

          {/* Home screen toggle */}
          <Text style={styles.settingsSection}>Home Screen</Text>
          <View style={styles.settingsRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <Text style={{ fontSize: 14, color: dreamAiHome ? Colors.gold : Colors.muted }}>
                  {dreamAiHome ? '✦' : '◎'}
                </Text>
                <Text style={styles.settingsRowLabel}>{dreamAiHome ? 'DreamAi' : 'Today'}</Text>
              </View>
              <Text style={styles.settingsRowSub}>
                {dreamAiHome ? 'App opens to DreamAi by default' : 'App opens to Today screen by default'}
              </Text>
            </View>
            <Toggle on={dreamAiHome} onToggle={handleHomeToggle} />
          </View>

          {/* Notification toggles — UI only, V10 wiring */}
          <Text style={[styles.settingsSection, { marginTop: 24 }]}>Notifications</Text>
          {[
            { label: 'Task reminders', sub: 'Get notified when tasks are due' },
            { label: 'Vendor replies', sub: 'Alerts when vendors respond' },
            { label: 'Morning briefing', sub: 'Daily summary at 9:00 AM' },
          ].map(n => (
            <View key={n.label} style={styles.settingsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsRowLabel}>{n.label}</Text>
                <Text style={styles.settingsRowSub}>{n.sub}</Text>
              </View>
              <Toggle on={false} onToggle={() => showToast('Push notifications coming in V10.')} />
            </View>
          ))}

          <Text style={[styles.settingsCaption, { marginTop: 20 }]}>
            Full preferences — location, discovery, budget visibility — coming in the next update.
          </Text>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  toast: {
    position: 'absolute', top: 60, alignSelf: 'center',
    backgroundColor: Colors.dark, paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, zIndex: 999,
  },
  toastText: { fontFamily: Fonts.body, fontSize: 12, color: Colors.background },

  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.dark, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 12,
  },
  avatarText: { fontFamily: Fonts.display, fontSize: 26, color: Colors.background },
  nameText: { fontFamily: Fonts.display, fontSize: 26, color: Colors.ink, textAlign: 'center', marginBottom: 6 },

  tierRow: { alignItems: 'center', marginBottom: 28 },
  tierBadge: { borderWidth: 0.5, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 5 },
  tierBadgeText: { fontFamily: Fonts.label, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: Colors.card,
    borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border,
    padding: 14,
  },
  statLabel: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: Colors.muted, marginBottom: 6 },
  statValue: { fontFamily: Fonts.display, fontSize: 20, color: Colors.ink, marginBottom: 2, lineHeight: 24 },
  statSub: { fontFamily: Fonts.body, fontSize: 10, color: Colors.muted },

  upgradeCard: {
    borderRadius: 12, padding: 16, marginBottom: 20,
    flexDirection: 'row', alignItems: 'center',
  },
  upgradeLabel: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: 'rgba(248,247,245,0.6)', marginBottom: 4 },
  upgradePrice: { fontFamily: Fonts.display, fontSize: 18, color: Colors.background, marginBottom: 0 },
  upgradeSub: { fontFamily: Fonts.body, fontSize: 11, color: 'rgba(248,247,245,0.55)', marginTop: 4 },
  upgradeChevron: { fontSize: 22, color: 'rgba(248,247,245,0.5)', marginLeft: 8 },

  menuCard: {
    backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 0.5, borderColor: Colors.border, overflow: 'hidden', marginBottom: 16,
  },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  menuRowBorder: { borderBottomWidth: 0.5, borderBottomColor: Colors.border },
  menuIcon: { fontSize: 18, color: Colors.muted, width: 20, textAlign: 'center' },
  menuLabel: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink, flex: 1 },
  menuChevron: { fontSize: 18, color: '#C8C4BE' },

  signOutRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  signOutText: { fontFamily: Fonts.body, fontSize: 14, color: Colors.muted },

  // Settings sheet
  settingsBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(12,10,9,0.5)',
  },
  settingsSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 28, maxHeight: '85%',
  },
  settingsHandle: {
    width: 36, height: 3, borderRadius: 2, backgroundColor: '#D8D4CE',
    alignSelf: 'center', marginBottom: 24,
  },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  settingsTitle: { fontFamily: Fonts.display, fontSize: 22, color: Colors.ink },
  settingsSection: {
    fontFamily: Fonts.label, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase',
    color: Colors.muted, marginBottom: 14,
  },
  settingsRow: {
    backgroundColor: Colors.card, borderRadius: 12, borderWidth: 0.5, borderColor: Colors.border,
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10,
  },
  settingsRowLabel: { fontFamily: Fonts.body, fontSize: 14, color: Colors.ink },
  settingsRowSub: { fontFamily: Fonts.body, fontSize: 11, color: Colors.muted, marginTop: 2 },
  settingsCaption: { fontFamily: Fonts.body, fontSize: 11, color: '#C8C4BE', fontStyle: 'italic', lineHeight: 16 },

  toggleTrack: { width: 44, height: 26, borderRadius: 13, position: 'relative' },
  toggleThumb: { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3 },
});
