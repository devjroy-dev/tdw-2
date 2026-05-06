import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSequence, withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { RAILWAY_URL } from '../../constants/tokens';
import { getVendorSession, setVendorSession } from '../../utils/session';

const GOLD = '#C9A84C';
const API = RAILWAY_URL;

export default function VendorPinScreen() {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirm, setConfirm] = useState(['', '', '', '']);
  const [stage, setStage] = useState<'pin' | 'confirm'>('pin');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [slides, setSlides] = useState<string[]>([]);
  const [slide, setSlide] = useState(0);

  const pinRefs = useRef<(TextInput | null)[]>([]);
  const confirmRefs = useRef<(TextInput | null)[]>([]);
  const shakeX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  function triggerShake() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shakeX.value = withSequence(
      withTiming(-8, { duration: 60 }), withTiming(8, { duration: 60 }),
      withTiming(-5, { duration: 60 }), withTiming(5, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  }

  useEffect(() => {
    // If PIN already set — go to today
    getVendorSession().then(s => {
      if (s?.pin_set) router.replace('/(vendor)/today');
    });
    fetch(`${API}/api/v2/cover-photos`)
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setSlides(d.photos.map((p: any) => p.image_url)); })
      .catch(() => {});
    const t = setInterval(() => setSlide(p => (p + 1) % Math.max(slides.length, 1)), 4500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (stage === 'pin') setTimeout(() => pinRefs.current[0]?.focus(), 150);
    if (stage === 'confirm') setTimeout(() => confirmRefs.current[0]?.focus(), 60);
  }, [stage]);

  const submit = useCallback(async () => {
    const pinStr = pin.join('');
    const confirmStr = confirm.join('');
    if (pinStr.length < 4 || confirmStr.length < 4) return;
    if (pinStr !== confirmStr) {
      triggerShake();
      showToast("PINs don't match — try again");
      setConfirm(['', '', '', '']);
      setStage('pin');
      setPin(['', '', '', '']);
      return;
    }
    setLoading(true);
    try {
      const session = await getVendorSession();
      const r = await fetch(`${API}/api/v2/auth/set-pin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.vendorId || session?.id,
          pin: pinStr,
          role: 'vendor',
          phone: session?.phone,
        }),
      });
      const d = await r.json();
      if (d.success) {
        await setVendorSession({ ...session, pin_set: true });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(vendor)/today');
      } else { showToast('Could not set PIN. Try again.'); }
    } catch { showToast('Network error. Try again.'); }
    finally { setLoading(false); }
  }, [pin, confirm]);

  useEffect(() => {
    if (confirm.every(d => d) && stage === 'confirm') submit();
  }, [confirm, stage, submit]);

  const handlePinInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const v = val.slice(-1);
    const n = [...pin]; n[idx] = v; setPin(n);
    if (v && idx < 3) pinRefs.current[idx + 1]?.focus();
    if (v && idx === 3) setTimeout(() => { setStage('confirm'); }, 60);
  };

  const handleConfirmInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const v = val.slice(-1);
    const n = [...confirm]; n[idx] = v; setConfirm(n);
    if (v && idx < 3) confirmRefs.current[idx + 1]?.focus();
  };

  const handlePinBackspace = (idx: number, key: string) => {
    if (key === 'Backspace' && !pin[idx] && idx > 0) {
      const n = [...pin]; n[idx - 1] = ''; setPin(n);
      pinRefs.current[idx - 1]?.focus();
    }
  };

  const handleConfirmBackspace = (idx: number, key: string) => {
    if (key === 'Backspace' && !confirm[idx] && idx > 0) {
      const n = [...confirm]; n[idx - 1] = ''; setConfirm(n);
      confirmRefs.current[idx - 1]?.focus();
    }
  };

  return (
    <View style={styles.root}>
      {/* Carousel background */}
      {slides.map((src, i) => (
        <Image key={i} source={{ uri: src }} style={[styles.slide, { opacity: i === slide ? 0.55 : 0 }]} resizeMode="cover" />
      ))}
      <View style={styles.darkOverlay} />

      {/* Toast */}
      {!!toast && (
        <View style={[styles.toast, { top: insets.top + 24 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* Glass panel */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.brandName}>The Dream Wedding</Text>
        <Text style={styles.brandTag}>MAKER PORTAL</Text>

        <Text style={styles.heading}>
          {stage === 'pin' ? 'Create your PIN.' : 'Confirm your PIN.'}
        </Text>
        <Text style={styles.subheading}>
          {stage === 'pin' ? 'Four digits. Quick access every time.' : 'Enter the same PIN again.'}
        </Text>

        {/* PIN input */}
        {stage === 'pin' && (
          <View style={styles.pinRow}>
            {pin.map((d, i) => (
              <TextInput
                key={i}
                ref={el => { pinRefs.current[i] = el; }}
                value={d}
                onChangeText={val => handlePinInput(i, val)}
                onKeyPress={({ nativeEvent }) => handlePinBackspace(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                caretHidden
                secureTextEntry
                style={styles.pinBox}
                editable={!loading}
              />
            ))}
          </View>
        )}

        {/* Confirm input */}
        {stage === 'confirm' && (
          <Animated.View style={[styles.pinRow, animatedStyle]}>
            {confirm.map((d, i) => (
              <TextInput
                key={i}
                ref={el => { confirmRefs.current[i] = el; }}
                value={d}
                onChangeText={val => handleConfirmInput(i, val)}
                onKeyPress={({ nativeEvent }) => handleConfirmBackspace(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                caretHidden
                secureTextEntry
                style={styles.pinBox}
                editable={!loading}
              />
            ))}
          </Animated.View>
        )}

        {loading && (
          <Text style={styles.loadingText}>SETTING PIN…</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0C0A09' },
  slide: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  darkOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(12,10,9,0.45)' },
  toast: {
    position: 'absolute', left: '10%', right: '10%', zIndex: 100,
    backgroundColor: 'rgba(201,168,76,0.12)', borderRadius: 100,
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)',
    padding: 10, alignItems: 'center',
  },
  toastText: { fontFamily: 'DMSans_300Light', fontSize: 13, color: GOLD },
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(12,10,9,0.3)',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 32, paddingTop: 28,
  },
  brandName: { fontFamily: 'CormorantGaramond_300Light', fontSize: 15, color: 'rgba(248,247,245,0.5)', fontStyle: 'italic', marginBottom: 2 },
  brandTag: { fontFamily: 'DMSans_300Light', fontSize: 6, letterSpacing: 5, textTransform: 'uppercase', color: GOLD, marginBottom: 24 },
  heading: { fontFamily: 'CormorantGaramond_300Light', fontSize: 26, color: '#F8F7F5', marginBottom: 4, lineHeight: 30 },
  subheading: { fontFamily: 'DMSans_300Light', fontSize: 13, color: 'rgba(248,247,245,0.4)', marginBottom: 28 },
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 32 },
  pinBox: {
    width: 48, height: 58,
    borderBottomWidth: 2, borderBottomColor: GOLD,
    backgroundColor: 'transparent',
    fontFamily: 'DMSans_300Light', fontSize: 26, color: '#F8F7F5',
  },
  loadingText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, textAlign: 'center', marginBottom: 16 },
});
