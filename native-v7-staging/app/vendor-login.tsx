import { useState, useRef } from 'react';
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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Radius, RAILWAY_URL } from '../constants/tokens';

export default function VendorLoginScreen() {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const shakeX = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

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

  async function handleSendCode() {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      triggerShake();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${RAILWAY_URL}/api/v2/vendor/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send code. Please try again.');
      }

      router.push({ pathname: '/vendor-otp', params: { phone: cleaned } });
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
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
        <Text style={styles.heading}>Enter your number.</Text>
        <Text style={styles.subheading}>We'll send you a one-time code.</Text>

        <Animated.View style={[styles.inputRow, animatedStyle]}>
          <View style={[styles.prefixPill, inputFocused && styles.prefixPillActive]}>
            <Text style={styles.prefixText}>+91</Text>
          </View>
          <View style={styles.inputWrap}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={phone}
              onChangeText={(t) => {
                setPhone(t.replace(/[^0-9]/g, '').slice(0, 10));
                if (error) setError('');
              }}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              keyboardType="phone-pad"
              placeholder="98765 43210"
              placeholderTextColor={Colors.border}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSendCode}
            />
            <View style={[styles.inputUnderline, inputFocused && styles.inputUnderlineActive]} />
          </View>
        </Animated.View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/* Maker tagline — subtle brand moment */}
        <Text style={styles.makerTagline}>Pay for the OS. Earn the catalogue.</Text>
      </View>

      <View style={[styles.buttonWrap, { paddingBottom: insets.bottom + 32 }]}>
        <TouchableOpacity
          style={[styles.sendButton, loading && styles.sendButtonDisabled]}
          onPress={handleSendCode}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.background} size="small" />
          ) : (
            <Text style={styles.sendButtonText}>SEND CODE</Text>
          )}
        </TouchableOpacity>
      </View>
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
    marginBottom: 48,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  prefixPill: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 2,
  },
  prefixPillActive: {
    borderColor: Colors.gold,
  },
  prefixText: {
    fontFamily: Fonts.label,
    fontSize: 15,
    color: Colors.ink,
  },
  inputWrap: {
    flex: 1,
  },
  input: {
    fontFamily: Fonts.label,
    fontSize: 22,
    color: Colors.ink,
    paddingBottom: 8,
    paddingTop: 0,
  },
  inputUnderline: {
    height: 1,
    backgroundColor: Colors.border,
  },
  inputUnderlineActive: {
    backgroundColor: Colors.gold,
    height: 1.5,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.error,
    marginTop: 12,
  },
  makerTagline: {
    fontFamily: Fonts.display,
    fontSize: 15,
    color: Colors.muted,
    marginTop: 40,
    fontStyle: 'italic',
  },
  buttonWrap: {
    paddingHorizontal: 24,
  },
  sendButton: {
    backgroundColor: Colors.ink,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.background,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
