import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { getCoupleSession, getVendorSession } from '../utils/session';
import { isBiometricEnabled, authenticateWithBiometric } from '../utils/biometric';
import { Colors, Fonts } from '../constants/tokens';

const { height } = Dimensions.get('window');

export default function LandingScreen() {
  const insets = useSafeAreaInsets();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkExistingSession();
  }, []);

  async function checkExistingSession() {
    try {
      const [coupleSession, vendorSession] = await Promise.all([
        getCoupleSession(),
        getVendorSession(),
      ]);

      if (coupleSession) {
        // Check if biometric is enabled for returning user
        const bioEnabled = await isBiometricEnabled();
        if (bioEnabled) {
          const success = await authenticateWithBiometric();
          if (success) {
            router.replace('/(couple)/today');
            return;
          }
          // Bio failed — fall through to landing so user can log in manually
        } else {
          router.replace('/(couple)/today');
          return;
        }
      }

      if (vendorSession) {
        const bioEnabled = await isBiometricEnabled();
        if (bioEnabled) {
          const success = await authenticateWithBiometric();
          if (success) {
            router.replace('/(vendor)/today');
            return;
          }
        } else {
          router.replace('/(vendor)/today');
          return;
        }
      }
    } catch (e) {
      // Session check failed — show landing
    }
    setChecking(false);
  }

  if (checking) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={Colors.gold} size="small" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Brand mark — top third */}
      <View style={styles.brandSection}>
        <Text style={styles.sparkle}>✦</Text>
        <Text style={styles.wordmark}>The Dream Wedding</Text>
        <Text style={styles.tagline}>THE CURATED WEDDING OS</Text>
      </View>

      {/* CTA buttons — bottom */}
      <View style={[styles.buttonSection, { paddingBottom: insets.bottom + 48 }]}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/couple-login');
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>I'M A BRIDE</Text>
        </TouchableOpacity>

        <View style={{ height: 16 }} />

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/vendor-login');
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryButtonText}>I'M A VENDOR</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  brandSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -height * 0.08, // Push slightly above center for visual balance
  },
  sparkle: {
    fontSize: 20,
    color: Colors.gold,
    marginBottom: 20,
    fontFamily: Fonts.label,
  },
  wordmark: {
    fontFamily: Fonts.display,
    fontSize: 32,
    color: Colors.ink,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  tagline: {
    fontFamily: Fonts.body,
    fontSize: 9,
    color: Colors.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  buttonSection: {
    paddingHorizontal: 24,
  },
  primaryButton: {
    backgroundColor: Colors.ink,
    height: 52,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.background,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    height: 52,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: Fonts.body,
    fontSize: 10,
    color: Colors.ink,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
