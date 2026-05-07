/**
 * VendorTopBar — React Native port of web/app/vendor/components/TopBar.tsx
 *
 * TDW wordmark · BUSINESS / ✦ AI / DISCOVERY pill · profile circle
 * Profile sheet: name + tier, Tips & Features, Sign Out
 *
 * Mode is read from ModeContext (owned by _layout.tsx).
 * Navigation:
 *   BUSINESS  → /(vendor)/today
 *   DREAMAI   → /(vendor)/dreamai   (full page, bottom nav hides)
 *   DISCOVERY → /(vendor)/discovery (bottom nav switches to DASH/LEADS/IMAGE HUB/COLLAB)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, Animated, Easing, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Settings, LogOut } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppMode, type AppMode } from '../app/(vendor)/_layout';
import { getVendorSession, clearVendorSession } from '../utils/session';

// ── Constants ─────────────────────────────────────────────────────────────────
const GOLD   = '#C9A84C';
const INK    = '#0C0A09';
const BG     = '#F8F7F5';
const BORDER = '#E2DED8';
const MUTED  = '#8C8480';
const CARD   = '#FFFFFF';
const DARK   = '#111111';
const CG300  = 'CormorantGaramond_300Light';
const DM300  = 'DMSans_300Light';
const JOST   = 'Jost_300Light';

export const TOP_BAR_HEIGHT = 56;

function getInitials(name?: string): string {
  if (!name) return 'M';
  return name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VendorTopBar() {
  const insets             = useSafeAreaInsets();
  const { mode, setMode }  = useAppMode();

  const [profileOpen, setProfileOpen] = useState(false);
  const [vendorName,  setVendorName]  = useState('');
  const [category,    setCategory]    = useState('');
  const [tier,        setTier]        = useState('');

  const sheetAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getVendorSession().then((s: any) => {
      if (!s) return;
      setVendorName(s.vendorName || s.name || '');
      setCategory(s.category || '');
      setTier(s.tier || '');
    });
  }, []);

  useEffect(() => {
    Animated.timing(sheetAnim, {
      toValue: profileOpen ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [profileOpen]);

  const handleModeSwitch = async (m: AppMode) => {
    await setMode(m);
    if (m === 'BUSINESS') {
      await AsyncStorage.removeItem('vendor_last_path');
      router.push('/(vendor)/today');
    } else if (m === 'DREAMAI') {
      router.push('/(vendor)/dreamai');
    } else {
      // DISCOVERY — routes to Discovery Dash; bottom nav handles sub-navigation
      router.push('/(vendor)/discovery');
    }
  };

  const handleSignOut = async () => {
    setProfileOpen(false);
    await clearVendorSession();
    await AsyncStorage.removeItem('vendor_app_mode');
    await AsyncStorage.removeItem('vendor_last_path');
    router.replace('/');
  };

  const initials   = getInitials(vendorName);
  const tierLabel  = tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : '';
  const profileSub = [category, tierLabel].filter(Boolean).join(' · ') || 'Maker';

  const sheetTranslate = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  return (
    <>
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <View style={[styles.bar, { paddingTop: insets.top, height: TOP_BAR_HEIGHT + insets.top }]}>

        <Text style={styles.wordmark}>TDW</Text>

        {/* Mode pill */}
        <View style={styles.pillGroup}>
          {(['BUSINESS', 'DREAMAI', 'DISCOVERY'] as AppMode[]).map((m) => {
            const active     = mode === m;
            const isDreamAi  = m === 'DREAMAI';
            return (
              <TouchableOpacity
                key={m}
                onPress={() => handleModeSwitch(m)}
                style={[
                  styles.pill,
                  active && (isDreamAi ? styles.pillActiveDreamAi : styles.pillActiveDefault),
                ]}
                activeOpacity={0.8}
              >
                {isDreamAi ? (
                  <View style={styles.dreamAiLabel}>
                    <Text style={styles.pillAiText}>✦ AI</Text>
                    <View style={styles.betaBadge}>
                      <Text style={styles.betaText}>beta</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{m}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Profile circle */}
        <TouchableOpacity
          style={styles.profileCircle}
          onPress={() => setProfileOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.profileInitials}>{initials}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Profile sheet ──────────────────────────────────────────────── */}
      <Modal
        visible={profileOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setProfileOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setProfileOpen(false)} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslate }] }]}>
          <View style={styles.dragHandle} />

          {/* Profile row */}
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileAvatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{vendorName || 'Maker'}</Text>
              <Text style={styles.profileSub}>{profileSub}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Tips & Features */}
          <TouchableOpacity
            style={styles.sheetRow}
            onPress={() => { setProfileOpen(false); router.push('/(vendor)/studio'); }}
            activeOpacity={0.7}
          >
            <Settings size={18} color={MUTED} strokeWidth={1.5} />
            <Text style={styles.sheetRowText}>Tips & Features</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Sign out */}
          <TouchableOpacity
            style={styles.sheetRow}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <LogOut size={18} color={MUTED} strokeWidth={1.5} />
            <Text style={styles.sheetRowText}>Sign out</Text>
          </TouchableOpacity>

          <View style={{ height: insets.bottom + 8 }} />
        </Animated.View>
      </Modal>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 10,
    backgroundColor: BG, borderBottomWidth: 0.5, borderBottomColor: BORDER,
    zIndex: 50,
  },
  wordmark: { fontFamily: CG300, fontSize: 20, color: INK, letterSpacing: 1, lineHeight: 24 },

  pillGroup: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(17,17,17,0.06)', borderRadius: 20, padding: 3,
  },
  pill: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: 'transparent' },
  pillActiveDefault: {
    backgroundColor: INK,
  },
  pillActiveDreamAi: {
    backgroundColor: 'transparent',
  },
  pillText:       { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: MUTED },
  pillTextActive: { color: '#F8F7F5' },
  pillTextActiveDreamAi: { color: GOLD },
  pillAiText:     { fontFamily: JOST, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: GOLD },

  dreamAiLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  betaBadge: {
    borderRadius: 100, paddingHorizontal: 5, paddingVertical: 1,
    backgroundColor: 'rgba(201,168,76,0.1)', borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)',
  },
  betaBadgeActive: { backgroundColor: 'rgba(201,168,76,0.1)', borderColor: 'rgba(201,168,76,0.3)' },
  betaText:        { fontFamily: JOST, fontSize: 6, letterSpacing: 1, textTransform: 'uppercase', color: GOLD },
  betaTextActive:  { color: GOLD },

  profileCircle: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: GOLD, backgroundColor: 'rgba(201,168,76,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileInitials: { fontFamily: JOST, fontSize: 12, fontWeight: '400', color: INK, lineHeight: 16 },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(17,17,17,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: CARD, borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  dragHandle: {
    width: 36, height: 4, backgroundColor: BORDER, borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingBottom: 20 },
  profileAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: DARK,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  profileAvatarText: { fontFamily: JOST, fontSize: 16, fontWeight: '300', color: BG },
  profileName: { fontFamily: CG300, fontSize: 20, color: INK, marginBottom: 2 },
  profileSub:  { fontFamily: DM300, fontSize: 12, color: MUTED },
  divider:     { height: 1, backgroundColor: BORDER, marginHorizontal: 24 },
  sheetRow:    { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 24, paddingVertical: 16 },
  sheetRowText: { fontFamily: DM300, fontSize: 14, color: INK },
});
