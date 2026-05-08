/**
 * Frost Gate — Native entry screen for new users.
 *
 * Mirrors thedreamwedding.in PWA landing exactly:
 *   - Full-bleed cover photo carousel (from /api/v2/cover-photos)
 *   - Frosted bottom sheet, tap to expand
 *   - I HAVE AN INVITE → invite code → phone → OTP
 *   - REQUEST AN INVITE → simple confirmation message
 *   - SIGN IN → phone → OTP (returning user)
 *   - JUST EXPLORING → Discover canvas
 *
 * Uses FrostColors, FrostFonts, FrostSpace from constants/frost.ts
 * Uses FrostedSurface for the bottom panel (same as Frost landing page)
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image, StatusBar,
  TextInput, TouchableOpacity, ActivityIndicator, Animated,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { FrostColors, FrostFonts, FrostSpace, FrostRadius } from '../constants/frost';
import { setCoupleSession } from '../utils/session';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// Android API 31+ supports dimezisBlurView
const ANDROID_BLUR_SUPPORTED =
  Platform.OS === 'android' &&
  typeof Platform.Version === 'number' &&
  (Platform.Version as number) >= 31;

type Screen =
  | 'entry'
  | 'invite_code'
  | 'invite_phone'
  | 'invite_otp'
  | 'signin_phone'
  | 'signin_otp'
  | 'request_done';

// ─── Bottom frosted panel ─────────────────────────────────────────────────────
function FrostPanel({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[panelStyles.outer, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      ) : ANDROID_BLUR_SUPPORTED ? (
        <BlurView
          intensity={60}
          tint="dark"
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12,10,9,0.82)' }]} />
      )}
      <View style={[StyleSheet.absoluteFill, {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 0,
      }]} pointerEvents="none" />
      <View style={{ position: 'relative', zIndex: 2 }}>{children}</View>
    </View>
  );
}

const panelStyles = StyleSheet.create({
  outer: {
    overflow: 'hidden',
    position: 'relative',
  },
});

// ─── Gold primary button ──────────────────────────────────────────────────────
function GoldBtn({ label, onPress, disabled, loading }: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      disabled={disabled || loading}
      style={[btnStyles.gold, (disabled || loading) && btnStyles.goldDisabled]}
    >
      {loading
        ? <ActivityIndicator color={FrostColors.ink} />
        : <Text style={btnStyles.goldText}>{label}</Text>}
    </TouchableOpacity>
  );
}

// ─── Ghost button ─────────────────────────────────────────────────────────────
function GhostBtn({ label, onPress, small }: { label: string; onPress: () => void; small?: boolean }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={[btnStyles.ghost, small && btnStyles.ghostSmall]}>
      <Text style={[btnStyles.ghostText, small && btnStyles.ghostSmallText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const btnStyles = StyleSheet.create({
  gold: {
    height: 52, backgroundColor: FrostColors.goldTrue,
    borderRadius: 100, alignItems: 'center', justifyContent: 'center',
    marginBottom: FrostSpace.m,
  },
  goldDisabled: { opacity: 0.45 },
  goldText: {
    fontFamily: FrostFonts.label, fontSize: 10,
    letterSpacing: 2.2, textTransform: 'uppercase', color: FrostColors.ink,
  },
  ghost: {
    height: 48, borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(248,247,245,0.25)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: FrostSpace.s,
  },
  ghostSmall: { height: 42, borderColor: 'rgba(248,247,245,0.12)' },
  ghostText: {
    fontFamily: FrostFonts.label, fontSize: 9,
    letterSpacing: 1.8, textTransform: 'uppercase', color: '#F8F7F5',
  },
  ghostSmallText: {
    fontSize: 8, letterSpacing: 1.6,
    color: 'rgba(248,247,245,0.45)',
  },
});

// ─── OTP digit input row ──────────────────────────────────────────────────────
function OtpRow({ value, onChange, onComplete }: {
  value: string[]; onChange: (v: string[]) => void; onComplete: () => void;
}) {
  const refs = useRef<Array<TextInput | null>>([]);
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: FrostSpace.l }}>
      {value.map((d, i) => (
        <TextInput
          key={i}
          ref={r => { refs.current[i] = r; }}
          value={d}
          keyboardType="numeric"
          maxLength={1}
          style={otpStyles.box}
          onChangeText={t => {
            const digits = t.replace(/\D/g, '');
            if (digits.length > 1) {
              // Handle paste
              const next = ['', '', '', '', '', ''];
              digits.split('').slice(0, 6).forEach((ch, idx) => { next[idx] = ch; });
              onChange(next);
              refs.current[Math.min(digits.length - 1, 5)]?.focus();
              if (digits.length >= 6) onComplete();
              return;
            }
            const next = [...value]; next[i] = digits.slice(-1); onChange(next);
            if (digits && i < 5) refs.current[i + 1]?.focus();
            if (i === 5 && digits) onComplete();
          }}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !value[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
          onFocus={() => refs.current[i]?.setNativeProps({ selection: { start: 0, end: 1 } })}
        />
      ))}
    </View>
  );
}

const otpStyles = StyleSheet.create({
  box: {
    flex: 1, height: 52, borderRadius: FrostRadius.box,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(201,168,76,0.4)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#F8F7F5', textAlign: 'center',
    fontFamily: FrostFonts.display, fontSize: 22,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CoupleLoginScreen() {
  const insets = useSafeAreaInsets();

  // Cover photo carousel
  const [slides, setSlides] = useState<string[]>([]);
  const [slideIdx, setSlideIdx] = useState(0);

  // Panel state
  const [expanded, setExpanded] = useState(false);
  const [screen, setScreen] = useState<Screen>('entry');

  // Form state
  const [role, setRole] = useState<'Dreamer' | 'Maker' | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Fetch cover photos on mount
  useEffect(() => {
    fetch(`${API}/api/v2/cover-photos`)
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setSlides(d.photos.map((p: any) => p.image_url)); })
      .catch(() => {});
  }, []);

  // Carousel rotation — separate effect to avoid stale closure bug
  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setSlideIdx(p => (p + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  // ── API calls ───────────────────────────────────────────────────────────────

  const validateInvite = async () => {
    if (!inviteCode.trim() || !role) {
      setInviteError('Select Dreamer or Maker and enter your code.'); return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/invite/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.trim(), role: role === 'Dreamer' ? 'dreamer' : 'vendor' }),
      });
      const d = await r.json();
      if (d.valid) { setScreen('invite_phone'); setInviteError(''); }
      else setInviteError(d.error || 'Invalid or expired code.');
    } catch { setInviteError('Could not verify. Try again.'); }
    setLoading(false);
  };

  const sendOtp = async (isInvite: boolean) => {
    const bare = phone.replace(/\D/g, '').slice(-10);
    if (bare.length < 10) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/couple/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: bare }),
      });
      const d = await r.json();
      if (d.success) {
        setScreen(isInvite ? 'invite_otp' : 'signin_otp');
        setOtp(['', '', '', '', '', '']);
        setOtpError('');
        setResendTimer(60);
      } else {
        setOtpError(d.error || 'Could not send code.');
      }
    } catch { setOtpError('Could not send code. Try again.'); }
    setLoading(false);
  };

  const verifyOtp = async () => {
    const bare = phone.replace(/\D/g, '').slice(-10);
    const code = otp.join('');
    if (code.length < 6) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/couple/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: bare, code }),
      });
      const d = await r.json();
      if (!d.success) {
        const err = d.error || '';
        if (err.toLowerCase().includes('no account') || err.toLowerCase().includes('not found')) {
          setOtpError('No account found. Request an invite to join.');
        } else {
          setOtpError(err || 'Incorrect code. Try again.');
        }
        setLoading(false);
        return;
      }
      // Response shape: { success: true, user: { id, name, pin_set, couple_tier } }
      const userData = d.user || d;
      await setCoupleSession({ ...userData, phone: '+91' + bare });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (userData.isNewUser || !userData.name) {
        router.replace('/couple-onboarding');
      } else if (!userData.pin_set) {
        router.replace('/(frost)/landing' as any);
      } else {
        router.replace('/couple-pin-login');
      }
    } catch (e) {
      // Log the actual error — silent catches cost us hours debugging the wrong layer.
      console.error('[verifyOtp]', e);
      setOtpError('Verification failed. Try again.');
    }
    setLoading(false);
  };

  // ── Render helpers ──────────────────────────────────────────────────────────

  const inputStyle = {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 10, paddingHorizontal: 0,
    fontFamily: FrostFonts.body, fontSize: 16,
    color: '#F8F7F5', marginBottom: FrostSpace.m,
  };

  const labelStyle = {
    fontFamily: FrostFonts.label, fontSize: 8,
    letterSpacing: 2, textTransform: 'uppercase' as const,
    color: 'rgba(248,247,245,0.4)', marginBottom: 6,
  };

  const titleStyle = {
    fontFamily: FrostFonts.display, fontStyle: 'italic' as const,
    fontSize: 24, color: '#F8F7F5', marginBottom: 4,
  };

  const subtitleStyle = {
    fontFamily: FrostFonts.body, fontSize: 13,
    color: 'rgba(248,247,245,0.5)', marginBottom: FrostSpace.l,
  };

  const back = (to: Screen) => {
    setInviteError(''); setOtpError(''); setScreen(to);
  };

  // ── Panel content by screen ─────────────────────────────────────────────────

  const renderPanelContent = () => {
    if (!expanded) return null;

    if (screen === 'entry') {
      return (
        <View style={{ paddingTop: FrostSpace.l }}>
          <GoldBtn label="I HAVE AN INVITE" onPress={() => setScreen('invite_code')} />
          <GhostBtn label="REQUEST AN INVITE" onPress={() => setScreen('request_done')} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[btnStyles.ghost, btnStyles.ghostSmall, { flex: 1, marginBottom: 0 }]}
              onPress={() => setScreen('signin_phone')}
              activeOpacity={0.75}
            >
              <Text style={btnStyles.ghostSmallText}>SIGN IN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[btnStyles.ghost, btnStyles.ghostSmall, { flex: 1, marginBottom: 0 }]}
              onPress={() => router.push('/(frost)/canvas/discover' as any)}
              activeOpacity={0.75}
            >
              <Text style={btnStyles.ghostSmallText}>JUST EXPLORING</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (screen === 'invite_code') {
      return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity onPress={() => back('entry')} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={titleStyle}>Enter your invite.</Text>
          <Text style={subtitleStyle}>Your code unlocks access.</Text>

          <Text style={labelStyle}>Are you a</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: FrostSpace.m }}>
            {(['Dreamer', 'Maker'] as const).map(r => (
              <TouchableOpacity
                key={r}
                onPress={() => setRole(r)}
                style={[s.roleBtn, role === r && s.roleBtnActive]}
                activeOpacity={0.8}
              >
                <Text style={[s.roleBtnText, role === r && s.roleBtnTextActive]}>{r.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={labelStyle}>Invite code</Text>
          <TextInput
            value={inviteCode}
            onChangeText={t => { setInviteCode(t.toUpperCase()); setInviteError(''); }}
            placeholder="XXXXXX"
            placeholderTextColor="rgba(248,247,245,0.25)"
            autoCapitalize="characters"
            maxLength={8}
            style={[inputStyle, { textAlign: 'center', letterSpacing: 6, fontSize: 24 }]}
          />
          {inviteError ? <Text style={s.errorText}>{inviteError}</Text> : null}
          <GoldBtn
            label="Continue →"
            onPress={validateInvite}
            disabled={!inviteCode.trim() || !role}
            loading={loading}
          />
        </KeyboardAvoidingView>
      );
    }

    if (screen === 'invite_phone') {
      return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity onPress={() => back('invite_code')} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={titleStyle}>Welcome. Let's begin.</Text>
          <Text style={subtitleStyle}>Enter your number. We'll send a code.</Text>

          <Text style={labelStyle}>Phone number</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: FrostSpace.m,
            borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.25)' }}>
            <Text style={{ fontFamily: FrostFonts.body, fontSize: 15, color: 'rgba(248,247,245,0.5)',
              paddingRight: 10, borderRightWidth: StyleSheet.hairlineWidth,
              borderRightColor: 'rgba(255,255,255,0.2)', marginRight: 10 }}>🇮🇳 +91</Text>
            <TextInput
              value={phone}
              onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
              placeholder="00000 00000"
              placeholderTextColor="rgba(248,247,245,0.25)"
              keyboardType="phone-pad"
              maxLength={10}
              style={{ flex: 1, fontFamily: FrostFonts.body, fontSize: 16,
                color: '#F8F7F5', paddingVertical: 10 }}
            />
          </View>
          {otpError ? <Text style={s.errorText}>{otpError}</Text> : null}
          <GoldBtn
            label="Send code →"
            onPress={() => sendOtp(true)}
            disabled={phone.length < 10}
            loading={loading}
          />
        </KeyboardAvoidingView>
      );
    }

    if (screen === 'signin_phone') {
      return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity onPress={() => back('entry')} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={titleStyle}>Welcome back.</Text>
          <Text style={subtitleStyle}>Enter your number to sign in.</Text>

          <Text style={labelStyle}>Phone number</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: FrostSpace.m,
            borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.25)' }}>
            <Text style={{ fontFamily: FrostFonts.body, fontSize: 15, color: 'rgba(248,247,245,0.5)',
              paddingRight: 10, borderRightWidth: StyleSheet.hairlineWidth,
              borderRightColor: 'rgba(255,255,255,0.2)', marginRight: 10 }}>🇮🇳 +91</Text>
            <TextInput
              value={phone}
              onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
              placeholder="00000 00000"
              placeholderTextColor="rgba(248,247,245,0.25)"
              keyboardType="phone-pad"
              maxLength={10}
              style={{ flex: 1, fontFamily: FrostFonts.body, fontSize: 16,
                color: '#F8F7F5', paddingVertical: 10 }}
            />
          </View>
          {otpError ? <Text style={s.errorText}>{otpError}</Text> : null}
          <GoldBtn
            label="Send code →"
            onPress={() => sendOtp(false)}
            disabled={phone.length < 10}
            loading={loading}
          />
        </KeyboardAvoidingView>
      );
    }

    if (screen === 'invite_otp' || screen === 'signin_otp') {
      return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity
            onPress={() => back(screen === 'invite_otp' ? 'invite_phone' : 'signin_phone')}
            style={s.backBtn}
          >
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={titleStyle}>Check your messages.</Text>
          <Text style={subtitleStyle}>Enter the 6-digit code sent to +91 {phone}</Text>

          <OtpRow value={otp} onChange={setOtp} onComplete={verifyOtp} />
          {otpError ? <Text style={s.errorText}>{otpError}</Text> : null}

          <GoldBtn
            label="Verify →"
            onPress={verifyOtp}
            disabled={otp.join('').length < 6}
            loading={loading}
          />

          <TouchableOpacity
            onPress={() => sendOtp(screen === 'invite_otp')}
            disabled={resendTimer > 0}
            style={{ alignItems: 'center', marginTop: FrostSpace.s }}
          >
            <Text style={{ fontFamily: FrostFonts.body, fontSize: 12,
              color: resendTimer > 0 ? 'rgba(248,247,245,0.25)' : 'rgba(248,247,245,0.5)',
              textDecorationLine: resendTimer > 0 ? 'none' : 'underline' }}>
              {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      );
    }

    if (screen === 'request_done') {
      return (
        <View>
          <TouchableOpacity onPress={() => back('entry')} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={[titleStyle, { marginBottom: FrostSpace.m }]}>We'll be in touch.</Text>
          <Text style={{ fontFamily: FrostFonts.body, fontSize: 14,
            color: 'rgba(248,247,245,0.6)', lineHeight: 22, marginBottom: FrostSpace.l }}>
            The Dream Wedding is invite-only for now. We'll reach out when a spot opens for you.
          </Text>
          <GhostBtn label="Back to start" onPress={() => { setScreen('entry'); }} />
        </View>
      );
    }

    return null;
  };

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Full-bleed cover photo carousel */}
      {slides.length > 0 ? (
        <Image
          source={{ uri: slides[slideIdx] }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: FrostColors.black }]} />
      )}

      {/* Subtle dark gradient scrim */}
      <View style={[StyleSheet.absoluteFill, s.scrim]} pointerEvents="none" />

      {/* Bottom frosted panel */}
      <FrostPanel style={[s.panel, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Brand row — always visible, tap to expand */}
        <Pressable
          onPress={() => {
            if (!expanded) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setExpanded(true);
            }
          }}
          style={s.brandRow}
        >
          <View>
            <Text style={s.brandName}>The Dream Wedding</Text>
            <Text style={s.brandTagline}>THE CURATED WEDDING OS</Text>
          </View>
          {!expanded && (
            <Text style={s.tapHint}>tap</Text>
          )}
        </Pressable>

        {/* Expandable content */}
        {expanded && (
          <ScrollView
            style={{ maxHeight: 480 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ paddingHorizontal: FrostSpace.l, paddingBottom: FrostSpace.m }}>
              {renderPanelContent()}
            </View>
          </ScrollView>
        )}
      </FrostPanel>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: FrostColors.black },
  scrim: {
    background: undefined,
    backgroundColor: 'transparent',
    // Gradient scrim via solid at bottom
  },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
  },
  brandRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: FrostSpace.l,
    paddingTop: 20, paddingBottom: 16,
  },
  brandName: {
    fontFamily: FrostFonts.display,
    fontStyle: 'italic',
    fontSize: 22,
    color: '#F8F7F5',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  brandTagline: {
    fontFamily: FrostFonts.label,
    fontSize: 7,
    letterSpacing: 3.2,
    textTransform: 'uppercase',
    color: FrostColors.goldTrue,
  },
  tapHint: {
    fontFamily: FrostFonts.label,
    fontSize: 8, letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: 'rgba(248,247,245,0.28)',
  },
  backBtn: { marginBottom: FrostSpace.m, alignSelf: 'flex-start' },
  backText: {
    fontFamily: FrostFonts.body, fontSize: 13,
    color: 'rgba(248,247,245,0.45)',
  },
  errorText: {
    fontFamily: FrostFonts.body, fontSize: 11,
    color: '#E57373', marginBottom: FrostSpace.m, textAlign: 'center',
  },
  roleBtn: {
    flex: 1, height: 40, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  roleBtnActive: { backgroundColor: FrostColors.goldTrue },
  roleBtnText: {
    fontFamily: FrostFonts.label, fontSize: 9,
    letterSpacing: 1.5, textTransform: 'uppercase',
    color: 'rgba(248,247,245,0.6)',
  },
  roleBtnTextActive: { color: FrostColors.ink },
});
