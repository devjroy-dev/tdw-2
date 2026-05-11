/**
 * Frost · Journey · Circle · Invite
 *
 * Bride picks a role, types a name (+ optional relationship + phone), hits
 * Send. We POST to /api/v2/frost/circle/invite, receive a join_link from the
 * backend, and open the WhatsApp share sheet with a pre-filled invite
 * message. If WhatsApp isn't installed, fall back to the native share sheet.
 *
 * Routes here from circle.tsx (the "+ Invite" button in Threads zone).
 *
 * Backend contract (POST /api/v2/frost/circle/invite):
 *   request:  { user_id, role, invitee_name, phone | null }
 *   response: { success: true, data: { join_link: string, ... } } or
 *             { success: false, error: string }
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Haptics from 'expo-haptics';
import { ChevronLeft } from 'lucide-react-native';
import FrostCanvasShell from '../../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostFonts, FrostSpace, FrostRadius,
} from '../../../../../constants/frost';
import { MUSE_LOOKS } from '../../../../../constants/museTokens';
import { useMuseLook } from '../../../../../hooks/useMuseLook';
import { RAILWAY_URL } from '../../../../../constants/tokens';
import { getCoupleSession } from '../../../../../utils/session';

// ─── Constants ───────────────────────────────────────────────────────────────

type Role = 'Partner' | 'inner_circle' | 'circle';

interface RoleOption {
  value: Role;
  label: string;
  sub: string;
}

// Backend role values are case-sensitive: capital P for "Partner", snake_case
// for the other two (matches the existing backend convention).
const ROLES: RoleOption[] = [
  { value: 'Partner',      label: 'Partner',       sub: 'Your other half. Full access.' },
  { value: 'inner_circle', label: 'Inner Circle',  sub: 'Mom, sister, planner. They help.' },
  { value: 'circle',       label: 'Circle',        sub: 'Cousins, friends. They cheer.' },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CircleInvite() {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const canSend = !!role && name.trim().length > 0 && !sending;

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  function pickRole(r: Role) {
    Haptics.selectionAsync();
    setRole(r);
  }

  async function handleSend() {
    if (!canSend || !role) return;
    setSending(true);
    try {
      const session = await getCoupleSession();
      if (!session?.id) {
        showToast('Sign in to invite people.');
        setSending(false);
        return;
      }

      const r = await fetch(`${RAILWAY_URL}/api/v2/frost/circle/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.id,
          role,
          invitee_name: name.trim(),
          phone: phone.trim() || null,
        }),
      });
      const data = await r.json();

      if (!data?.success) {
        showToast(data?.error || 'Could not create invite. Try again.');
        setSending(false);
        return;
      }

      const joinLink: string | undefined = data?.data?.join_link;
      if (!joinLink) {
        showToast('Invite created but join link missing. Try again.');
        setSending(false);
        return;
      }

      const message =
        `Hi ${name.trim()} — I'd love you to be part of my wedding planning ` +
        `on TDW. Tap to join my Circle: ${joinLink}`;

      // Prefer WhatsApp deep link; fall back to native share sheet
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      try {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
        } else {
          await Share.share({ message });
        }
      } catch {
        try { await Share.share({ message }); } catch {}
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      showToast(e?.message || 'Network hiccup. Try again.');
      setSending(false);
    }
  }

  return (
    <FrostCanvasShell eyebrow="CIRCLE · INVITE" mode="frost">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back chevron */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={16}
            style={styles.backBtn}
          >
            <ChevronLeft size={24} color={tokens.ink} strokeWidth={1.5} />
          </Pressable>

          {/* Heading */}
          <Text style={[styles.heading, { color: tokens.ink }]}>Bring someone in.</Text>
          <Text style={[styles.sub, { color: tokens.soft }]}>
            They&apos;ll see your wedding, in their own quiet way.
          </Text>

          {/* ── Role picker ─────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WHO ARE THEY</Text>
            <View style={styles.roleColumn}>
              {ROLES.map((opt) => {
                const selected = role === opt.value;
                return (
                  <FrostedSurface
                    key={opt.value}
                    mode="button"
                    onPress={() => pickRole(opt.value)}
                    radius={FrostRadius.md}
                    style={[
                      styles.roleOuter,
                      selected && styles.roleOuterSelected,
                    ]}
                  >
                    <View style={styles.roleInner}>
                      <Text style={[
                        styles.roleLabel,
                        selected && styles.roleLabelSelected,
                        { color: selected ? tokens.brass : tokens.soft },
                      ]}>
                        {opt.label}
                      </Text>
                      <Text style={[styles.roleSub, { color: tokens.soft }]}>
                        {opt.sub}
                      </Text>
                    </View>
                  </FrostedSurface>
                );
              })}
            </View>
          </View>

          {/* ── Name ─────────────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>NAME</Text>
            <FrostedSurface mode="button" radius={FrostRadius.md} style={styles.inputOuter}>
              <View style={styles.inputInner}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Their name"
                  placeholderTextColor={tokens.soft}
                  style={[styles.input, { color: tokens.ink }]}
                  keyboardAppearance={look === 'E1' ? 'dark' : 'light'}
                  returnKeyType="next"
                  editable={!sending}
                />
              </View>
            </FrostedSurface>
          </View>

          {/* ── Relationship (optional) ──────────────────────────────────── */}
          <View style={styles.sectionTight}>
            <Text style={styles.sectionLabel}>RELATIONSHIP</Text>
            <FrostedSurface mode="button" radius={FrostRadius.md} style={styles.inputOuter}>
              <View style={styles.inputInner}>
                <TextInput
                  value={relationship}
                  onChangeText={setRelationship}
                  placeholder="Mother / Sister / Best friend"
                  placeholderTextColor={tokens.soft}
                  style={[styles.input, { color: tokens.ink }]}
                  keyboardAppearance={look === 'E1' ? 'dark' : 'light'}
                  returnKeyType="next"
                  editable={!sending}
                />
              </View>
            </FrostedSurface>
          </View>

          {/* ── Phone (optional) ─────────────────────────────────────────── */}
          <View style={styles.sectionTight}>
            <Text style={styles.sectionLabel}>PHONE</Text>
            <FrostedSurface mode="button" radius={FrostRadius.md} style={styles.inputOuter}>
              <View style={styles.inputInner}>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 — optional"
                  placeholderTextColor={tokens.soft}
                  style={[styles.input, { color: tokens.ink }]}
                  keyboardAppearance={look === 'E1' ? 'dark' : 'light'}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  editable={!sending}
                />
              </View>
            </FrostedSurface>
          </View>

          {/* ── Send button ──────────────────────────────────────────────── */}
          <FrostedSurface
            mode="button"
            onPress={handleSend}
            disabled={!canSend}
            radius={FrostRadius.pill}
            style={styles.sendOuter}
          >
            <View style={styles.sendInner}>
              {sending ? (
                <>
                  <ActivityIndicator size="small" color={FrostColors.white} />
                  <Text style={styles.sendText}>Sending&hellip;</Text>
                </>
              ) : (
                <Text style={styles.sendText}>Send invite</Text>
              )}
            </View>
          </FrostedSurface>

          {/* Toast */}
          {toast ? (
            <View style={styles.toast} pointerEvents="none">
              <Text style={styles.toastText}>{toast}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </FrostCanvasShell>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: FrostSpace.xl,
    paddingBottom: FrostSpace.huge,
  },

  backBtn: {
    width: 32,
    height: 32,
    marginLeft: -FrostSpace.s,
    marginBottom: FrostSpace.l,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  heading: {
    ...FrostType.displayM,
    fontStyle: 'italic',
    fontFamily: FrostFonts.display,
    color: FrostColors.ink,
  },
  sub: {
    ...FrostType.bodyMedium,
    fontStyle: 'italic',
    color: FrostColors.muted,
    marginTop: FrostSpace.xs,
    marginBottom: FrostSpace.xl,
  },

  section: {
    marginBottom: FrostSpace.xl,
  },
  sectionTight: {
    marginBottom: FrostSpace.l,
  },
  sectionLabel: {
    ...FrostType.eyebrowSmall,
    letterSpacing: 1.6,
    marginBottom: FrostSpace.s,
  },

  roleColumn: {
    gap: FrostSpace.s,
  },
  roleOuter: {
    // FrostedSurface base — neutral hairline border via its internal layer.
    // Selected state overlays a brass border below.
  },
  roleOuterSelected: {
    borderWidth: 1.5,
    borderColor: FrostColors.goldTrue,
  },
  roleInner: {
    paddingVertical: FrostSpace.m,
    paddingHorizontal: FrostSpace.l,
  },
  roleLabel: {
    fontFamily: FrostFonts.bodyMedium,
    fontSize: 15,
    color: FrostColors.soft,
    marginBottom: 2,
  },
  roleLabelSelected: {
    color: FrostColors.goldTrue,
    fontFamily: FrostFonts.bodyMedium,
  },
  roleSub: {
    fontFamily: FrostFonts.body,
    fontSize: 12,
    color: FrostColors.muted,
  },
  roleSubSelected: {
    color: FrostColors.soft,
  },

  inputOuter: {
    // FrostedSurface as a static input frame (no onPress)
  },
  inputInner: {
    paddingVertical: FrostSpace.s + 2,
    paddingHorizontal: FrostSpace.l,
  },
  input: {
    ...FrostType.bodyLarge,
    color: FrostColors.ink,
    padding: 0,
    minHeight: 32,
  },

  sendOuter: {
    marginTop: FrostSpace.xl,
    backgroundColor: FrostColors.ink,
  },
  sendInner: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FrostSpace.s,
  },
  sendText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: FrostColors.white,
  },

  toast: {
    alignSelf: 'center',
    marginTop: FrostSpace.l,
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.s,
    borderRadius: FrostRadius.pill,
    backgroundColor: FrostColors.muted,
  },
  toastText: {
    fontFamily: FrostFonts.body,
    fontSize: 12,
    color: FrostColors.white,
  },
});
