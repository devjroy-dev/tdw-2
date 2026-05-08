/**
 * Circle · Join · [token]
 *
 * Landing page for Circle member invite links.
 * URL: thedreamwedding.in/circle/join/[token]
 *
 * Flow: validate token → enter phone → OTP → set PIN → Circle home
 * The token is consumed server-side. Member never sees invite code.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostRadius,
} from '../../../constants/frost';
import FrostedSurface from '../../../components/frost/FrostedSurface';
import { RAILWAY_URL } from '../../../constants/tokens';

const API = RAILWAY_URL;
const OTP_LENGTH = 6;

type Step = 'loading' | 'welcome' | 'phone' | 'otp' | 'pin' | 'error';

export default function CircleJoin() {
  const { token } = useLocalSearchParams<{ token: string }>();

  const [step, setStep] = useState<Step>('loading');
  const [brideName, setBrideName] = useState('');
  const [inviteeName, setInviteeName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const [pin, setPin] = useState(['', '', '', '']);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const pinRefs = useRef<(TextInput | null)[]>([]);

  // Validate token on mount
  useEffect(() => {
    if (!token) { setStep('error'); setErrorMsg('Invalid invite link.'); return; }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const r = await fetch(`${API}/api/v2/circle/join/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (!d.success) { setStep('error'); setErrorMsg(d.error || 'Invalid invite link.'); return; }
      setBrideName(d.data.bride_name);
      setInviteeName(d.data.invitee_name);
      setStep('welcome');
    } catch {
      setStep('error');
      setErrorMsg('Could not load invite. Check your connection and try again.');
    }
  };

  const sendOtp = async () => {
    if (phone.replace(/\D/g, '').length < 10) return;
    setLoading(true);
    try {
      await fetch(`${API}/api/v2/couple/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      setStep('otp');
      setTimeout(() => otpRefs.current[0]?.focus(), 300);
    } catch { setErrorMsg('Could not send OTP. Try again.'); }
    setLoading(false);
  };

  const verifyOtp = async (code: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/circle/join/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, phone, otp: code }),
      });
      const d = await r.json();
      if (!d.success) { setErrorMsg(d.error || 'Verification failed.'); setLoading(false); return; }
      setUserId(d.data.user_id);
      if (d.data.pin_set) {
        await saveSession(d.data);
        router.replace('/(circle)/landing' as any);
      } else {
        setStep('pin');
        setTimeout(() => pinRefs.current[0]?.focus(), 300);
      }
    } catch { setErrorMsg('Something went wrong. Try again.'); }
    setLoading(false);
  };

  const setUserPin = async (pinStr: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/circle/join/set-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, pin: pinStr }),
      });
      const d = await r.json();
      if (!d.success) { setErrorMsg(d.error || 'Could not set PIN.'); setLoading(false); return; }
      // Fetch full session
      const sr = await fetch(`${API}/api/v2/circle/session/${userId}`);
      const sd = await sr.json();
      if (sd.success) await saveSession(sd.data);
      router.replace('/(circle)/landing' as any);
    } catch { setErrorMsg('Something went wrong.'); }
    setLoading(false);
  };

  const saveSession = async (data: any) => {
    await AsyncStorage.setItem('circle_session', JSON.stringify(data));
  };

  const handleOtpDigit = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
    if (newOtp.every(d => d) && newOtp.join('').length === OTP_LENGTH) {
      verifyOtp(newOtp.join(''));
    }
  };

  const handlePinDigit = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    if (digit && index < 3) pinRefs.current[index + 1]?.focus();
    if (newPin.every(d => d)) setUserPin(newPin.join(''));
  };

  if (step === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={FrostColors.goldTrue} />
      </View>
    );
  }

  if (step === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Hmm.</Text>
        <Text style={styles.errorSub}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.outer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.brandEyebrow}>THE DREAM WEDDING</Text>
          <Text style={styles.goldDivider}>✦</Text>
        </View>

        {step === 'welcome' && (
          <View style={styles.section}>
            <Text style={styles.welcomeTitle}>{brideName} has invited you.</Text>
            <Text style={styles.welcomeSub}>
              You've been added to her wedding Circle{inviteeName ? `, ${inviteeName}` : ''}. Enter your phone number to join.
            </Text>
            <FrostedSurface mode="button" radius={FrostRadius.box} style={styles.inputCard}>
              <View style={styles.inputInner}>
                <Text style={styles.inputPrefix}>+91</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  placeholderTextColor={FrostColors.muted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoFocus
                />
              </View>
            </FrostedSurface>
            <Pressable
              onPress={sendOtp}
              disabled={loading || phone.replace(/\D/g, '').length < 10}
              style={[styles.ctaBtn, (loading || phone.replace(/\D/g, '').length < 10) && styles.ctaDisabled]}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Send OTP</Text>}
            </Pressable>
          </View>
        )}

        {step === 'otp' && (
          <View style={styles.section}>
            <Text style={styles.welcomeTitle}>Enter the code.</Text>
            <Text style={styles.welcomeSub}>We sent a 6-digit code to +91 {phone}</Text>
            <View style={styles.otpRow}>
              {otp.map((d, i) => (
                <TextInput
                  key={i}
                  ref={r => { otpRefs.current[i] = r; }}
                  style={[styles.otpBox, d && styles.otpBoxFilled]}
                  value={d}
                  onChangeText={v => handleOtpDigit(i, v)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>
            {loading && <ActivityIndicator color={FrostColors.goldTrue} style={{ marginTop: 16 }} />}
            {errorMsg ? <Text style={styles.errorInline}>{errorMsg}</Text> : null}
          </View>
        )}

        {step === 'pin' && (
          <View style={styles.section}>
            <Text style={styles.welcomeTitle}>Set your PIN.</Text>
            <Text style={styles.welcomeSub}>You'll use this to open the app each time.</Text>
            <View style={styles.pinRow}>
              {pin.map((d, i) => (
                <TextInput
                  key={i}
                  ref={r => { pinRefs.current[i] = r; }}
                  style={[styles.pinBox, d && styles.pinBoxFilled]}
                  value={d ? '●' : ''}
                  onChangeText={v => handlePinDigit(i, v)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  secureTextEntry
                />
              ))}
            </View>
            {loading && <ActivityIndicator color={FrostColors.goldTrue} style={{ marginTop: 16 }} />}
            {errorMsg ? <Text style={styles.errorInline}>{errorMsg}</Text> : null}
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer:        { flex: 1, backgroundColor: '#F4F2EE' },
  scroll:       { flexGrow: 1, paddingHorizontal: FrostSpace.xxl, paddingTop: 60, paddingBottom: 40 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F2EE', padding: 32 },
  header:       { alignItems: 'center', marginBottom: 48 },
  brandEyebrow: { fontFamily: FrostFonts.label, fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', color: FrostColors.muted },
  goldDivider:  { color: FrostColors.goldTrue, fontSize: 18, marginTop: 8 },
  section:      { flex: 1 },
  welcomeTitle: { fontFamily: FrostFonts.display, fontSize: 28, fontStyle: 'italic', color: '#1A1815', lineHeight: 34, marginBottom: 12 },
  welcomeSub:   { fontFamily: FrostFonts.body, fontSize: 15, color: '#5A5650', lineHeight: 22, marginBottom: 32 },
  inputCard:    { marginBottom: 16 },
  inputInner:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: FrostSpace.l, paddingVertical: FrostSpace.l },
  inputPrefix:  { fontFamily: FrostFonts.bodyMedium, fontSize: 16, color: '#1A1815', marginRight: 8 },
  input:        { flex: 1, fontFamily: FrostFonts.bodyMedium, fontSize: 16, color: '#1A1815' },
  ctaBtn:       { backgroundColor: FrostColors.goldTrue, borderRadius: FrostRadius.pill, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  ctaDisabled:  { opacity: 0.5 },
  ctaText:      { fontFamily: FrostFonts.labelMedium, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: '#FFFFFF' },
  otpRow:       { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 8 },
  otpBox:       { width: 44, height: 52, borderRadius: FrostRadius.md, borderWidth: 1, borderColor: FrostColors.hairline, textAlign: 'center', fontSize: 20, fontFamily: FrostFonts.displayMedium, color: '#1A1815', backgroundColor: 'rgba(255,253,248,0.6)' },
  otpBoxFilled: { borderColor: FrostColors.goldTrue },
  pinRow:       { flexDirection: 'row', gap: 16, justifyContent: 'center', marginTop: 16 },
  pinBox:       { width: 52, height: 52, borderRadius: FrostRadius.md, borderWidth: 1, borderColor: FrostColors.hairline, textAlign: 'center', fontSize: 22, color: '#1A1815', backgroundColor: 'rgba(255,253,248,0.6)' },
  pinBoxFilled: { borderColor: FrostColors.goldTrue },
  errorTitle:   { fontFamily: FrostFonts.display, fontSize: 28, fontStyle: 'italic', color: '#1A1815', marginBottom: 12 },
  errorSub:     { fontFamily: FrostFonts.body, fontSize: 15, color: '#5A5650', textAlign: 'center', lineHeight: 22 },
  errorInline:  { fontFamily: FrostFonts.body, fontSize: 13, color: '#C0392B', textAlign: 'center', marginTop: 12 },
});
