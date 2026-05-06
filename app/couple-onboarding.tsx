import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Radius, RAILWAY_URL } from '../constants/tokens';
import { getCoupleSession, setCoupleSession } from '../utils/session';
import { isBiometricAvailable, setBiometricEnabled } from '../utils/biometric';

type LocationOption = 'India' | 'Outside India';
type WeddingLocationOption = 'India' | 'Outside India' | 'Not sure';

function detectSegment(liveIn: LocationOption, weddingIn: WeddingLocationOption): string {
  if (liveIn === 'India' && weddingIn === 'India') return 'india';
  if (liveIn === 'Outside India') return 'nri';
  return 'nri'; // India + Not sure / India + Outside India → treat as NRI for now
}

export default function CoupleOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [weddingDate, setWeddingDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [liveIn, setLiveIn] = useState<LocationOption>('India');
  const [weddingIn, setWeddingIn] = useState<WeddingLocationOption>('India');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showBiometricOffer, setShowBiometricOffer] = useState(false);
  const [coupleId, setCoupleIdState] = useState<string | null>(null);

  const today = new Date();

  async function handleSubmit() {
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!partnerName.trim()) {
      setError("Please enter your partner's name.");
      return;
    }
    if (!weddingDate) {
      setError('Please select your wedding date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const session = await getCoupleSession();
      if (!session) throw new Error('Session expired — please log in again.');

      const segment = detectSegment(liveIn, weddingIn);

      // Update couple profile
      const res = await fetch(`${RAILWAY_URL}/api/v2/couple/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token || ''}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          partnerName: partnerName.trim(),
          weddingDate: weddingDate.toISOString().split('T')[0],
          segment,
          liveIn,
          weddingIn,
          coupleId: session.coupleId || session.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Could not save your details. Please try again.');
      }

      // Update session with new data
      await setCoupleSession({ ...session, ...data });
      const resolvedCoupleId = data.coupleId || session.coupleId || session.id;
      setCoupleIdState(resolvedCoupleId);

      // Seed checklist (52 preset tasks)
      try {
        await fetch(`${RAILWAY_URL}/api/couple/checklist/seed/${resolvedCoupleId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (seedErr) {
        console.warn('[onboarding] checklist seed failed — non-blocking:', seedErr);
      }

      // Seed default events (Mehendi, Haldi, Sangeet, Ceremony, Reception)
      try {
        await fetch(`${RAILWAY_URL}/api/couple/events/seed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coupleId: resolvedCoupleId }),
        });
      } catch (evtErr) {
        console.warn('[onboarding] events seed failed — non-blocking:', evtErr);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Offer biometric
      const bioAvailable = await isBiometricAvailable();
      if (bioAvailable) {
        setShowBiometricOffer(true);
      } else {
        router.replace('/(couple)/today');
      }
    } catch (err: any) {
      console.error('[onboarding] error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricEnable() {
    await setBiometricEnabled(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(couple)/today');
  }

  if (showBiometricOffer) {
    return (
      <View style={[styles.container, styles.biometricContainer]}>
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
        <TouchableOpacity onPress={() => router.replace('/(couple)/today')}>
          <Text style={styles.biometricLaterText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 40 }]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <Text style={styles.sparkle}>✦</Text>
      <Text style={styles.heading}>Let's get started.</Text>
      <Text style={styles.subheading}>A few details to personalise your experience.</Text>

      {/* Your name */}
      <Text style={styles.fieldLabel}>YOUR NAME</Text>
      <TextInput
        style={styles.textInput}
        value={name}
        onChangeText={setName}
        placeholder="Priya"
        placeholderTextColor={Colors.border}
        autoCapitalize="words"
        returnKeyType="next"
      />
      <View style={styles.inputUnderline} />

      <View style={{ height: 28 }} />

      {/* Partner's name */}
      <Text style={styles.fieldLabel}>YOUR PARTNER'S NAME</Text>
      <TextInput
        style={styles.textInput}
        value={partnerName}
        onChangeText={setPartnerName}
        placeholder="Arjun"
        placeholderTextColor={Colors.border}
        autoCapitalize="words"
        returnKeyType="next"
      />
      <View style={styles.inputUnderline} />

      <View style={{ height: 28 }} />

      {/* Wedding date */}
      <Text style={styles.fieldLabel}>WEDDING DATE</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={[styles.dateButtonText, !weddingDate && styles.datePlaceholder]}>
          {weddingDate
            ? weddingDate.toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : 'Select date'}
        </Text>
      </TouchableOpacity>
      <View style={styles.inputUnderline} />

      {showDatePicker && (
        <DateTimePicker
          value={weddingDate ?? today}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={today}
          onChange={(_, selectedDate) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (selectedDate) setWeddingDate(selectedDate);
          }}
          themeVariant="light"
          accentColor={Colors.gold}
        />
      )}

      <View style={{ height: 32 }} />

      {/* Where do you live */}
      <Text style={styles.fieldLabel}>WHERE DO YOU LIVE?</Text>
      <View style={styles.segmentRow}>
        {(['India', 'Outside India'] as LocationOption[]).map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.segmentOption, liveIn === opt && styles.segmentOptionActive]}
            onPress={() => setLiveIn(opt)}
          >
            <Text style={[styles.segmentText, liveIn === opt && styles.segmentTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 24 }} />

      {/* Where will your wedding be */}
      <Text style={styles.fieldLabel}>WHERE WILL YOUR WEDDING BE?</Text>
      <View style={styles.segmentRow}>
        {(['India', 'Outside India', 'Not sure'] as WeddingLocationOption[]).map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[styles.segmentOption, weddingIn === opt && styles.segmentOptionActive]}
            onPress={() => setWeddingIn(opt)}
          >
            <Text style={[styles.segmentText, weddingIn === opt && styles.segmentTextActive]}>
              {opt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={{ height: 40 }} />

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color={Colors.background} size="small" />
        ) : (
          <Text style={styles.submitButtonText}>BEGIN PLANNING</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  sparkle: {
    fontSize: 20,
    color: Colors.gold,
    marginBottom: 20,
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
  fieldLabel: {
    fontFamily: Fonts.label,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  textInput: {
    fontFamily: Fonts.label,
    fontSize: 18,
    color: Colors.ink,
    paddingBottom: 8,
  },
  inputUnderline: {
    height: 1,
    backgroundColor: Colors.border,
  },
  dateButton: {
    paddingBottom: 8,
  },
  dateButtonText: {
    fontFamily: Fonts.label,
    fontSize: 18,
    color: Colors.ink,
  },
  datePlaceholder: {
    color: Colors.border,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segmentOption: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: Colors.card,
  },
  segmentOptionActive: {
    borderColor: Colors.ink,
    backgroundColor: Colors.ink,
  },
  segmentText: {
    fontFamily: Fonts.body,
    fontSize: 13,
    color: Colors.muted,
  },
  segmentTextActive: {
    color: Colors.background,
  },
  errorText: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.error,
    marginTop: 16,
  },
  submitButton: {
    backgroundColor: Colors.ink,
    height: 52,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.background,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  // Biometric offer
  biometricContainer: {
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
