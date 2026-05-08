import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, Image, TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSequence, withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { RAILWAY_URL } from '../constants/tokens';
import { getCoupleSession, setCoupleSession, clearCoupleSession } from '../utils/session';

const GOLD = '#C9A84C';
const API = RAILWAY_URL;

export default function CouplePinLoginScreen() {
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [slides, setSlides] = useState<string[]>([]);
  const [slide, setSlide] = useState(0);
  const [name, setName] = useState('');

  const pinRefs = useRef<(TextInput | null)[]>([]);
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
    getCoupleSession().then(s => {
      if (!s?.id && !s?.userId) { router.replace('/'); return; }
      if (!s?.pin_set) { router.replace('/(couple)/pin'); return; }
      if (s?.name) setName(s.name);
    });
    fetch(`${API}/api/v2/cover-photos`)
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setSlides(d.photos.map((p: any) => p.image_url)); })
      .catch(() => {});
    const t = setInterval(() => setSlide(p => (p + 1) % Math.max(slides.length, 1)), 4500);
    setTimeout(() => pinRefs.current[0]?.focus(), 300);
    return () => clearInterval(t);
  }, []);

  const verify = useCallback(async (pinStr: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const session = await getCoupleSession();
      const r = await fetch(`${API}/api/v2/auth/verify-pin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session?.userId || session?.id, pin: pinStr, role: 'couple', phone: session?.phone }),
      });
      const d = await r.json();
      if (d.success) {
        await setCoupleSession({
          ...session,
          id: d.userId || session?.id,
          name: d.name || session?.name || '',
          pin_set: true,
          couple_tier: d.couple_tier || session?.couple_tier || 'lite',
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const isFrost = session?.dreamer_type === 'couple' || !session?.dreamer_type;
        router.replace((isFrost ? '/(frost)/landing' : '/(couple)/today') as any);
      } else {
        const next = attempts + 1;
        setAttempts(next);
        triggerShake();
        setPin(['', '', '', '']);
        pinRefs.current[0]?.focus();
        if (next >= 5) {
          showToast('Too many attempts.');
          setTimeout(async () => {
            await clearCoupleSession();
            router.replace('/');
          }, 1800);
        } else {
          showToast(`Incorrect PIN. ${5 - next} attempt${5 - next === 1 ? '' : 's'} left.`);
        }
      }
    } catch { showToast('Network error. Try again.'); }
    finally { setLoading(false); }
  }, [loading, attempts]);

  const handleInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const v = val.slice(-1);
    const n = [...pin]; n[idx] = v; setPin(n);
    if (v && idx < 3) pinRefs.current[idx + 1]?.focus();
    if (v && idx === 3) setTimeout(() => verify(n.join('')), 80);
  };

  const handleBackspace = (idx: number, key: string) => {
    if (key === 'Backspace' && !pin[idx] && idx > 0) {
      const n = [...pin]; n[idx - 1] = ''; setPin(n);
      pinRefs.current[idx - 1]?.focus();
    }
  };

  const firstName = name?.split(' ')[0] || '';

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
        <Text style={styles.brandTag}>DREAMER PORTAL</Text>

        <Text style={styles.heading}>
          {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        </Text>
        <Text style={styles.subheading}>Enter your PIN to continue.</Text>

        <Animated.View style={[styles.pinRow, animatedStyle]}>
          {pin.map((d, i) => (
            <TextInput
              key={i}
              ref={el => { pinRefs.current[i] = el; }}
              value={d}
              onChangeText={val => handleInput(i, val)}
              onKeyPress={({ nativeEvent }) => handleBackspace(i, nativeEvent.key)}
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

        {loading && (
          <Text style={styles.loadingText}>VERIFYING…</Text>
        )}

        {/* Forgot PIN */}
        <TouchableOpacity
          onPress={async () => {
            await clearCoupleSession();
            router.replace('/');
          }}
          style={styles.forgotWrap}
        >
          <Text style={styles.forgotText}>FORGOT PIN? SIGN IN AGAIN</Text>
        </TouchableOpacity>

        {/* DEV ONLY — sign out button */}
        <TouchableOpacity
          onPress={async () => {
            await clearCoupleSession();
            router.replace('/');
          }}
          style={styles.devSignOut}
        >
          <Text style={styles.devSignOutText}>SIGN OUT</Text>
        </TouchableOpacity>
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
  heading: { fontFamily: 'CormorantGaramond_300Light', fontSize: 28, color: '#F8F7F5', marginBottom: 4, lineHeight: 34 },
  subheading: { fontFamily: 'DMSans_300Light', fontSize: 13, color: 'rgba(248,247,245,0.4)', marginBottom: 28 },
  pinRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 32 },
  pinBox: {
    width: 52, height: 62,
    borderBottomWidth: 2, borderBottomColor: GOLD,
    backgroundColor: 'transparent',
    fontFamily: 'DMSans_300Light', fontSize: 28, color: '#F8F7F5',
  },
  loadingText: { fontFamily: 'DMSans_300Light', fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: GOLD, textAlign: 'center', marginBottom: 20 },
  forgotWrap: { alignItems: 'center', marginBottom: 16 },
  forgotText: { fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(248,247,245,0.25)' },
  devSignOut: { alignItems: 'center', marginTop: 8 },
  devSignOutText: { fontFamily: 'DMSans_300Light', fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: GOLD, opacity: 0.5 },
});
