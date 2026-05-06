import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Radius, RAILWAY_URL } from '../constants/tokens';
import { setCoupleSession } from '../utils/session';
import { isBiometricAvailable, setBiometricEnabled } from '../utils/biometric';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function CoupleOtpScreen() {
  const insets = useSafeAreaInsets();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendSeconds, setResendSeconds] = useState(RESEND_SECONDS);
  const [showBiometricOffer, setShowBiometricOffer] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));
  const shakeX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // Resend countdown
  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setTimeout(() => setResendSeconds(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSeconds]);

  function triggerShake() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    shakeX.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 }),
    );
  }

  function handleDigitChange(index: number, value: string) {
    if (!value) return;
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    if (!digit) return;

    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError('');

    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    } else {
      // Last digit — auto-submit
      inputRefs.current[index]?.blur();
      submitOtp(newDigits.join(''));
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace') {
      const newDigits = [...digits];
      if (newDigits[index]) {
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
        setActiveIndex(index - 1);
      }
    }
  }

  const submitOtp = useCallback(async (code: string) => {
    if (code.length !== OTP_LENGTH) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${RAILWAY_URL}/api/v2/couple/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp: code }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle Twilio 404 — surface gracefully
        if (res.status === 404) {
          throw new Error('Verification failed — please try again.');
        }
        throw new Error(data.message || 'Verification failed — please try again.');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await setCoupleSession(data);

      // Check biometric offer
      const bioAvailable = await isBiometricAvailable();

      if (data.isNewUser) {
        if (bioAvailable) {
          // Offer biometric on the onboarding screen instead — cleaner UX
          router.replace('/couple-onboarding');
        } else {
          router.replace('/couple-onboarding');
        }
      } else {
        if (bioAvailable) {
          setShowBiometricOffer(true);
        } else {
          router.replace('/(couple)/today');
        }
      }
    } catch (err: any) {
      console.error('[couple-otp] verify error:', err);
      setError(err.message || 'Verification failed — please try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      setActiveIndex(0);
      inputRefs.current[0]?.focus();
      triggerShake();
    } finally {
      setLoading(false);
    }
  }, [phone]);

  async function handleResend() {
    if (resendSeconds > 0) return;
    try {
      await fetch(`${RAILWAY_URL}/api/v2/couple/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      setResendSeconds(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
      setActiveIndex(0);
      inputRefs.current[0]?.focus();
      setError('');
    } catch {
      setError('Could not resend — please try again.');
    }
  }

  async function handleBiometricEnable() {
    await setBiometricEnabled(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(couple)/today');
  }

  // Biometric offer bottom sheet (inline — no external library needed yet)
  if (showBiometricOffer) {
    return (
      <View style={styles.container}>
        <View style={styles.biometricSheet}>
          <Text style={styles.biometricSparkle}>✦</Text>
          <Text style={styles.biometricTitle}>Sign in faster next time</Text>
          <Text style={styles.biometricBody}>
            Use Face ID or fingerprint to open The Dream Wedding instantly.
          </Text>
          <TouchableOpacity
            style={styles.biometricEnableBtn}
            onPress={handleBiometricEnable}
            activeOpacity={0.85}
          >
            <Text style={styles.biometricEnableText}>ENABLE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace('/(couple)/today')}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.biometricLaterText}>Maybe later</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.heading}>Enter the code.</Text>
        <Text style={styles.subheading}>Sent to +91 {phone}</Text>

        {/* 6-box OTP input */}
        <Animated.View style={[styles.otpRow, animatedStyle]}>
          {digits.map((digit, index) => (
            <View
              key={index}
              style={[
                styles.digitBox,
                activeIndex === index && styles.digitBoxActive,
                !!digit && styles.digitBoxFilled,
              ]}
            >
              <TextInput
                ref={ref => { inputRefs.current[index] = ref; }}
                style={styles.digitInput}
                value={digit}
                onChangeText={(v) => handleDigitChange(index, v)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                onFocus={() => setActiveIndex(index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                caretHidden
                selectTextOnFocus
              />
            </View>
          ))}
        </Animated.View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/* Resend */}
        <View style={styles.resendRow}>
          {resendSeconds > 0 ? (
            <Text style={styles.resendCountdown}>
              Resend code in {resendSeconds}s
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendLink}>Resend code</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading overlay hint */}
      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.gold} size="small" />
          <Text style={styles.loadingText}>Verifying…</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backArrow: {
    fontSize: 22,
    color: Colors.ink,
    fontFamily: Fonts.body,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  heading: {
    fontFamily: Fonts.display,
    fontSize: 34,
    color: Colors.ink,
    marginBottom: 8,
    lineHeight: 40,
  },
  subheading: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    marginBottom: 40,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  digitBox: {
    width: 48,
    height: 56,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
  },
  digitBoxActive: {
    borderColor: Colors.gold,
    backgroundColor: '#FFFDF7',
  },
  digitBoxFilled: {
    borderColor: Colors.muted,
  },
  digitInput: {
    fontFamily: Fonts.label,
    fontSize: 24,
    color: Colors.ink,
    width: '100%',
    height: '100%',
    textAlign: 'center',
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.error,
    marginTop: 4,
    marginBottom: 8,
  },
  resendRow: {
    marginTop: 24,
  },
  resendCountdown: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
  },
  resendLink: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.ink,
    textDecorationLine: 'underline',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 40,
  },
  loadingText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
  },
  // Biometric offer
  biometricSheet: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  biometricSparkle: {
    fontSize: 24,
    color: Colors.gold,
    marginBottom: 24,
  },
  biometricTitle: {
    fontFamily: Fonts.display,
    fontSize: 28,
    color: Colors.ink,
    textAlign: 'center',
    marginBottom: 12,
  },
  biometricBody: {
    fontFamily: Fonts.body,
    fontSize: 14,
    color: Colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  biometricEnableBtn: {
    backgroundColor: Colors.gold,
    height: 52,
    borderRadius: Radius.pill,
    paddingHorizontal: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  biometricEnableText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.card,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  biometricLaterText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
    textDecorationLine: 'underline',
  },
});
