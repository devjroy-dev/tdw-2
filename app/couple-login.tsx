/**
 * Frost Gate — Unified Dreamer + Maker landing.
 *
 * Mirrors PWA web/app/page.tsx role-toggle pattern:
 *   entry → role_picked → invite_code | signin_phone | request_form
 *                       → invite_phone → invite_otp → set_pin → done
 *                       → signin_otp → pin_login → done
 *
 * After set_pin success: invite code is consumed via /api/v2/invite/consume.
 * Sessions saved via utils/session.ts canonical helpers (never AsyncStorage direct).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Image, StatusBar,
  TextInput, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { FrostColors, FrostFonts, FrostSpace, FrostRadius } from '../constants/frost';
import { setCoupleSession, setVendorSession } from '../utils/session';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

const ANDROID_BLUR_SUPPORTED =
  Platform.OS === 'android' &&
  typeof Platform.Version === 'number' &&
  (Platform.Version as number) >= 31;

type Role = 'Dreamer' | 'Maker';
type Screen =
  | 'entry'
  | 'role_picked'
  | 'invite_code'
  | 'invite_phone'
  | 'invite_otp'
  | 'signin_phone'
  | 'signin_otp'
  | 'pin_login'
  | 'set_pin'
  | 'request_form'
  | 'request_done';

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
      }]} pointerEvents="none" />
      <View style={{ position: 'relative', zIndex: 2 }}>{children}</View>
    </View>
  );
}

const panelStyles = StyleSheet.create({
  outer: { overflow: 'hidden', position: 'relative' },
});

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
          keyboardAppearance="dark"
          maxLength={1}
          style={otpStyles.box}
          onChangeText={t => {
            const digits = t.replace(/\D/g, '');
            if (digits.length > 1) {
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

function PinRow({ value, onChange, onComplete }: {
  value: string[]; onChange: (v: string[]) => void; onComplete: () => void;
}) {
  const refs = useRef<Array<TextInput | null>>([]);
  return (
    <View style={{ flexDirection: 'row', gap: 10, marginBottom: FrostSpace.l, justifyContent: 'center' }}>
      {value.map((d, i) => (
        <TextInput
          key={i}
          ref={r => { refs.current[i] = r; }}
          value={d}
          keyboardType="numeric"
          keyboardAppearance="dark"
          secureTextEntry
          maxLength={1}
          style={pinStyles.box}
          onChangeText={t => {
            const digits = t.replace(/\D/g, '');
            const next = [...value]; next[i] = digits.slice(-1); onChange(next);
            if (digits && i < 3) refs.current[i + 1]?.focus();
            if (i === 3 && digits) onComplete();
          }}
          onKeyPress={({ nativeEvent }) => {
            if (nativeEvent.key === 'Backspace' && !value[i] && i > 0) {
              refs.current[i - 1]?.focus();
            }
          }}
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

const pinStyles = StyleSheet.create({
  box: {
    width: 56, height: 64, borderRadius: FrostRadius.box,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(201,168,76,0.4)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: '#F8F7F5', textAlign: 'center',
    fontFamily: FrostFonts.display, fontSize: 26,
  },
});

export default function CoupleLoginScreen() {
  const insets = useSafeAreaInsets();

  const [slides, setSlides] = useState<string[]>([]);
  const [slideIdx, setSlideIdx] = useState(0);

  const [expanded, setExpanded] = useState(false);
  const [screen, setScreen] = useState<Screen>('entry');
  const [role, setRole] = useState<Role | null>(null);

  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteUsed, setInviteUsed] = useState(false); // true once code is validated → carry to set_pin
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [pinConfirm, setPinConfirm] = useState(['', '', '', '']);
  const [pinPhase, setPinPhase] = useState<'enter' | 'confirm'>('enter');
  const [pinError, setPinError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [retrievedName, setRetrievedName] = useState<string | null>(null);
  const [retrievedTier, setRetrievedTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Request form
  const [reqName, setReqName] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqInstagram, setReqInstagram] = useState('');
  const [reqCity, setReqCity] = useState('');
  const [reqError, setReqError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/v2/cover-photos`)
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setSlides(d.photos.map((p: any) => p.image_url)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setSlideIdx(p => (p + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, [slides.length]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const apiRole = (r: Role | null) => (r === 'Maker' ? 'vendor' : 'dreamer');

  const validateInvite = async () => {
    if (!inviteCode.trim() || !role) {
      setInviteError('Enter your code to continue.'); return;
    }
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/invite/validate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.trim(), role: apiRole(role) }),
      });
      const d = await r.json();
      if (d.valid) { setScreen('invite_phone'); setInviteError(''); }
      else setInviteError(d.error || 'Invalid or expired code.');
    } catch { setInviteError('Could not verify. Try again.'); }
    setLoading(false);
  };

  const checkPinAndRoute = async () => {
    const bare = phone.replace(/\D/g, '').slice(-10);
    if (bare.length < 10) return;
    setLoading(true);
    setOtpError('');
    try {
      const r = await fetch(
        `${API}/api/v2/auth/pin-status?phone=${bare}&role=${apiRole(role)}`
      );
      const d = await r.json();
      if (!d.found) {
        setOtpError(
          role === 'Maker'
            ? 'No vendor account found. Request an invite to join.'
            : 'No account found. Request an invite to join.'
        );
        setLoading(false);
        return;
      }
      if (d.pin_set) {
        // Returning user with PIN — skip OTP, go straight to PIN entry
        setUserId(d.userId);
        if (d.name) setRetrievedName(d.name);
        if (d.couple_tier) setRetrievedTier(d.couple_tier);
        setScreen('pin_login');
        setPin(['', '', '', '']);
        setPinError('');
      } else {
        // Account exists but PIN not yet set — fall back to OTP path
        // (legacy migration scenario)
        await sendOtp(false);
      }
    } catch (e) {
      setOtpError('Could not verify. Try again.');
    }
    setLoading(false);
  };

  const sendOtp = async (isInvite: boolean) => {
    const bare = phone.replace(/\D/g, '').slice(-10);
    if (bare.length < 10) return;
    setLoading(true);
    try {
      const endpoint = role === 'Maker'
        ? `${API}/api/v2/vendor/auth/send-otp`
        : `${API}/api/v2/couple/auth/send-otp`;
      const r = await fetch(endpoint, {
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
      const isInvitePath = screen === 'invite_otp';
      const isMaker = role === 'Maker';
      const endpoint = isMaker
        ? `${API}/api/v2/vendor/auth/verify-otp`
        : `${API}/api/v2/couple/auth/verify-otp`;
      const body: any = { phone: bare, code };
      if (isInvitePath && inviteCode.trim() && !isMaker) body.invite_code = inviteCode.trim();

      const r = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!d.success) {
        const err = d.error || '';
        if (err.toLowerCase().includes('no account') || err.toLowerCase().includes('not found') || err.toLowerCase().includes('no vendor')) {
          setOtpError(isMaker ? 'No vendor account found. Request an invite to join.' : 'No account found. Request an invite to join.');
        } else {
          setOtpError(err || 'Incorrect code. Try again.');
        }
        setLoading(false);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setInviteUsed(isInvitePath && !!inviteCode.trim());

      if (isMaker) {
        const v = d.vendor || {};
        setUserId(v.id);
        if (v.pin_set) {
          setScreen('pin_login');
        } else {
          setScreen('set_pin'); setPinPhase('enter');
        }
      } else {
        const userData = d.user || d;
        setUserId(userData.id || userData.userId);
        if (userData.pin_set) {
          setScreen('pin_login');
        } else {
          setScreen('set_pin'); setPinPhase('enter');
        }
      }
    } catch (e) {
      console.error('[verifyOtp]', e);
      setOtpError('Verification failed. Try again.');
    }
    setLoading(false);
  };

  const submitPin = async () => {
    setPinError('');
    if (pinPhase === 'enter') {
      if (pin.join('').length !== 4) { setPinError('Enter 4 digits.'); return; }
      setPinPhase('confirm');
      return;
    }
    if (pinConfirm.join('') !== pin.join('')) {
      setPinError('PINs don\'t match. Try again.');
      setPinConfirm(['', '', '', '']);
      return;
    }
    setLoading(true);
    try {
      const bare = phone.replace(/\D/g, '').slice(-10);
      const r = await fetch(`${API}/api/v2/auth/set-pin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: bare, pin: pin.join(''), role: apiRole(role) }),
      });
      const d = await r.json();
      if (!d.success && !d.userId) {
        setPinError(d.error || 'Could not set PIN. Try again.');
        setLoading(false);
        return;
      }
      const finalUserId = d.userId || userId;

      if (inviteUsed && inviteCode.trim() && finalUserId) {
        try {
          await fetch(`${API}/api/v2/invite/consume`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: inviteCode.trim(), user_id: finalUserId }),
          });
        } catch (e) { console.warn('[invite/consume]', e); }
      }

      if (role === 'Maker') {
        await setVendorSession({ vendorId: finalUserId, id: finalUserId, phone: '+91' + bare, name: null });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(vendor)/today' as any);
      } else {
        await setCoupleSession({ id: finalUserId, userId: finalUserId, phone: '+91' + bare, pin_set: true, couple_tier: 'lite' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(frost)/landing' as any);
      }
    } catch (e) {
      console.error('[set-pin]', e);
      setPinError('Could not set PIN. Try again.');
    }
    setLoading(false);
  };

  const verifyPinLogin = async () => {
    if (pin.join('').length !== 4) return;
    setLoading(true); setPinError('');
    try {
      const bare = phone.replace(/\D/g, '').slice(-10);
      const r = await fetch(`${API}/api/v2/auth/verify-pin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: bare, pin: pin.join(''), role: apiRole(role) }),
      });
      const d = await r.json();
      if (!d.success) {
        setPinError(d.error || 'Incorrect PIN.');
        setPin(['', '', '', '']);
        setLoading(false);
        return;
      }
      if (role === 'Maker') {
        await setVendorSession({ vendorId: d.userId, id: d.userId, phone: '+91' + bare, name: d.name, vendor_tier: d.vendor_tier || 'essential' });
        router.replace('/(vendor)/today' as any);
      } else {
        await setCoupleSession({ id: d.userId, userId: d.userId, phone: '+91' + bare, pin_set: true, name: d.name, couple_tier: d.couple_tier || 'lite', dreamer_type: d.dreamer_type });
        router.replace('/(frost)/landing' as any);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error('[verify-pin]', e);
      setPinError('Sign-in failed. Try again.');
    }
    setLoading(false);
  };

  const submitRequest = async () => {
    if (!reqName.trim() || !reqEmail.trim() || !reqPhone.trim()) {
      setReqError('Name, email, and phone are required.'); return;
    }
    setLoading(true); setReqError('');
    try {
      const r = await fetch(`${API}/api/waitlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reqName.trim(),
          email: reqEmail.trim(),
          phone: reqPhone.replace(/\D/g, '').slice(-10),
          instagram: reqInstagram.trim() || null,
          category: reqCity.trim() || null,
          type: role === 'Maker' ? 'vendor' : 'couple',
          source: 'native_couple_login',
        }),
      });
      const d = await r.json();
      if (d.success) { setScreen('request_done'); }
      else setReqError(d.error || 'Could not submit. Try again.');
    } catch { setReqError('Could not submit. Try again.'); }
    setLoading(false);
  };

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

  const goBack = (to: Screen, opts?: { keepRole?: boolean }) => {
    setInviteError(''); setOtpError(''); setPinError(''); setReqError('');
    if (!opts?.keepRole && to === 'entry') setRole(null);
    setScreen(to);
  };

  const pickRole = (r: Role) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRole(r);
    setScreen('role_picked');
  };

  const renderPanelContent = () => {
    if (!expanded) return null;

    if (screen === 'entry') {
      return (
        <View style={{ paddingTop: FrostSpace.l }}>
          <GoldBtn label="I'm a Dreamer" onPress={() => pickRole('Dreamer')} />
          <GoldBtn label="I'm a Maker" onPress={() => pickRole('Maker')} />
          <GhostBtn label="Just exploring" onPress={() => router.push('/(frost)/landing' as any)} small />
        </View>
      );
    }

    if (screen === 'role_picked') {
      return (
        <View style={{ paddingTop: FrostSpace.l }}>
          <TouchableOpacity onPress={() => goBack('entry')} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={[labelStyle, { textAlign: 'center', marginBottom: FrostSpace.m }]}>
            {role === 'Maker' ? 'You are a Maker' : 'You are a Dreamer'}
          </Text>
          <GoldBtn label="I have a code" onPress={() => setScreen('invite_code')} />
          <GhostBtn label="Sign in" onPress={() => setScreen('signin_phone')} />
          <GhostBtn label="Request an invite" onPress={() => setScreen('request_form')} small />
        </View>
      );
    }

    if (screen === 'invite_code') {
      return (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 80 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity onPress={() => goBack('role_picked', { keepRole: true })} style={s.backBtn}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={titleStyle}>Enter your invite.</Text>
            <Text style={subtitleStyle}>Your {role === 'Maker' ? 'Maker' : 'Dreamer'} code unlocks access.</Text>

            <Text style={labelStyle}>Invite code</Text>
            <TextInput
              value={inviteCode}
              onChangeText={t => { setInviteCode(t.toUpperCase()); setInviteError(''); }}
              placeholder="XXXXXX"
              placeholderTextColor="rgba(248,247,245,0.25)"
              autoCapitalize="characters"
              keyboardAppearance="dark"
              maxLength={8}
              style={[inputStyle, { textAlign: 'center', letterSpacing: 6, fontSize: 24 }]}
            />
            {inviteError ? <Text style={s.errorText}>{inviteError}</Text> : null}
            <GoldBtn
              label="Continue →"
              onPress={validateInvite}
              disabled={!inviteCode.trim()}
              loading={loading}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    if (screen === 'invite_phone' || screen === 'signin_phone') {
      const isInvite = screen === 'invite_phone';
      return (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 80 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              onPress={() => goBack(isInvite ? 'invite_code' : 'role_picked', { keepRole: true })}
              style={s.backBtn}
            >
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={titleStyle}>{isInvite ? 'Welcome. Let\'s begin.' : 'Welcome back.'}</Text>
            <Text style={subtitleStyle}>{isInvite ? 'Enter your number. We\'ll send a code.' : 'Enter your number to continue.'}</Text>

            <Text style={labelStyle}>Phone number</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: FrostSpace.m,
              borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.25)' }}>
              <Text style={{ fontFamily: FrostFonts.body, fontSize: 15, color: 'rgba(248,247,245,0.5)',
                paddingRight: 10, borderRightWidth: StyleSheet.hairlineWidth,
                borderRightColor: 'rgba(255,255,255,0.2)', marginRight: 10 }}>+91</Text>
              <TextInput
                value={phone}
                onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                placeholder="00000 00000"
                placeholderTextColor="rgba(248,247,245,0.25)"
                keyboardType="phone-pad"
                keyboardAppearance="dark"
                maxLength={10}
                style={{ flex: 1, fontFamily: FrostFonts.body, fontSize: 16,
                  color: '#F8F7F5', paddingVertical: 10 }}
              />
            </View>
            {otpError ? <Text style={s.errorText}>{otpError}</Text> : null}
            <GoldBtn
              label="Continue →"
              onPress={() => isInvite ? sendOtp(true) : checkPinAndRoute()}
              disabled={phone.length < 10}
              loading={loading}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    if (screen === 'invite_otp' || screen === 'signin_otp') {
      return (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 80 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              onPress={() => goBack(screen === 'invite_otp' ? 'invite_phone' : 'signin_phone', { keepRole: true })}
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
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    if (screen === 'set_pin') {
      const isConfirm = pinPhase === 'confirm';
      return (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 80 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={titleStyle}>{isConfirm ? 'Confirm your PIN.' : 'Set a 4-digit PIN.'}</Text>
            <Text style={subtitleStyle}>
              {isConfirm ? 'Re-enter to confirm.' : 'You\'ll use this to sign in next time.'}
            </Text>

            <PinRow
              value={isConfirm ? pinConfirm : pin}
              onChange={isConfirm ? setPinConfirm : setPin}
              onComplete={submitPin}
            />
            {pinError ? <Text style={s.errorText}>{pinError}</Text> : null}

            <GoldBtn
              label={isConfirm ? 'Save PIN →' : 'Next →'}
              onPress={submitPin}
              disabled={(isConfirm ? pinConfirm : pin).join('').length < 4}
              loading={loading}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    if (screen === 'pin_login') {
      return (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 80 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={titleStyle}>Enter your PIN.</Text>
            <Text style={subtitleStyle}>Welcome back. Sign in with your 4-digit PIN.</Text>

            <PinRow value={pin} onChange={setPin} onComplete={verifyPinLogin} />
            {pinError ? <Text style={s.errorText}>{pinError}</Text> : null}

            <GoldBtn
              label="Sign in →"
              onPress={verifyPinLogin}
              disabled={pin.join('').length < 4}
              loading={loading}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    if (screen === 'request_form') {
      return (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 80 : 0}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity onPress={() => goBack('role_picked', { keepRole: true })} style={s.backBtn}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={titleStyle}>Request an invite.</Text>
            <Text style={subtitleStyle}>
              {role === 'Maker' ? 'Tell us about your craft.' : 'Tell us about your wedding.'}
            </Text>

            <Text style={labelStyle}>Name</Text>
            <TextInput value={reqName} onChangeText={setReqName} style={inputStyle}
              placeholder="Full name" placeholderTextColor="rgba(248,247,245,0.25)" keyboardAppearance="dark" />

            <Text style={labelStyle}>Email</Text>
            <TextInput value={reqEmail} onChangeText={setReqEmail} style={inputStyle}
              placeholder="you@example.com" placeholderTextColor="rgba(248,247,245,0.25)" keyboardAppearance="dark"
              keyboardType="email-address" autoCapitalize="none" />

            <Text style={labelStyle}>Phone</Text>
            <TextInput
              value={reqPhone}
              onChangeText={t => setReqPhone(t.replace(/\D/g, '').slice(0, 10))}
              style={inputStyle}
              placeholder="00000 00000" placeholderTextColor="rgba(248,247,245,0.25)" keyboardAppearance="dark"
              keyboardType="phone-pad" maxLength={10} />

            <Text style={labelStyle}>Instagram</Text>
            <TextInput value={reqInstagram} onChangeText={setReqInstagram} style={inputStyle}
              placeholder="@handle" placeholderTextColor="rgba(248,247,245,0.25)" keyboardAppearance="dark"
              autoCapitalize="none" />

            <Text style={labelStyle}>{role === 'Maker' ? 'City / category' : 'City'}</Text>
            <TextInput value={reqCity} onChangeText={setReqCity} style={inputStyle}
              placeholder={role === 'Maker' ? 'e.g. Mumbai · Photography' : 'e.g. Mumbai'}
              placeholderTextColor="rgba(248,247,245,0.25)" keyboardAppearance="dark" />

            {reqError ? <Text style={s.errorText}>{reqError}</Text> : null}
            <GoldBtn label="Submit →" onPress={submitRequest} loading={loading} />
          </ScrollView>
        </KeyboardAvoidingView>
      );
    }

    if (screen === 'request_done') {
      return (
        <View>
          <Text style={[titleStyle, { marginBottom: FrostSpace.m }]}>We'll be in touch.</Text>
          <Text style={{ fontFamily: FrostFonts.body, fontSize: 14,
            color: 'rgba(248,247,245,0.6)', lineHeight: 22, marginBottom: FrostSpace.l }}>
            The Dream Wedding is invite-only for now. We'll reach out when a spot opens for you.
          </Text>
          <GhostBtn label="Back to start" onPress={() => { goBack('entry'); }} />
        </View>
      );
    }

    return null;
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {slides.length > 0 ? (
        <Image
          source={{ uri: slides[slideIdx] }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: FrostColors.black }]} />
      )}

      <View style={[StyleSheet.absoluteFill, s.scrim]} pointerEvents="none" />

      <FrostPanel style={[s.panel, { paddingBottom: Math.max(insets.bottom, 20) }]}>
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

        {expanded && (
          <ScrollView
            style={{ maxHeight: 520 }}
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

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: FrostColors.black },
  scrim: { backgroundColor: 'transparent' },
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
    color: '#E57373',
    marginBottom: FrostSpace.m, textAlign: 'center',
  },
});
