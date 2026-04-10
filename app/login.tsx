import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../services/firebase';
import { createOrGetUser } from '../services/api';

GoogleSignin.configure({
  webClientId: '707007171164-3uphuoa96s37ur6h76dl09854k8tqa16.apps.googleusercontent.com',
  offlineAccess: true,
});

export default function LoginScreen() {
  const router = useRouter();
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      await GoogleSignin.signIn();
      const { idToken } = await GoogleSignin.getTokens();
      if (!idToken) throw new Error('No ID token received');
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const firebaseUID = result.user.uid;
      const userName = result.user.displayName || '';
      const userEmail = result.user.email || '';
      const userPhone = result.user.phoneNumber || '';
      let userData = null;
      try {
        const userResult = await createOrGetUser(userEmail || firebaseUID, userName, userEmail);
        userData = userResult.data;
      } catch (e) {}
      await AsyncStorage.setItem('user_session', JSON.stringify({
        uid: firebaseUID,
        userId: userData?.id || firebaseUID,
        phone: userPhone,
        email: userEmail,
        name: userName,
        userType: 'couple',
        avatar: result.user.photoURL || '',
      }));
      router.replace('/user-type');
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Please wait', 'Sign in already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available');
      } else {
        Alert.alert('Sign in failed', 'Could not sign in with Google. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.logoSection}>
        <Text style={styles.logoThe}>The</Text>
        <Text style={styles.logoMain}>Dream Wedding</Text>
        <View style={styles.logoDivider} />
        <Text style={styles.logoTagline}>India's Premium Wedding Platform</Text>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.welcomeRow}>
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.subText}>Sign in to begin your journey</Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#2C2420" />
            ) : (
              <View style={styles.googleButtonInner}>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/otp')}
          >
            <Text style={styles.primaryButtonText}>Continue with Phone</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/vendor-login')}>
          <Text style={styles.vendorLink}>Vendor? Sign in here →</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingHorizontal: 28,
    paddingBottom: 52,
    paddingTop: 60,
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  logoThe: {
    fontSize: 14,
    color: '#8C7B6E',
    fontWeight: '300',
    letterSpacing: 10,
    textTransform: 'uppercase',
  },
  logoMain: {
    fontSize: 40,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 2,
    textAlign: 'center',
  },
  logoDivider: {
    width: 32,
    height: 1,
    backgroundColor: '#C9A84C',
    marginVertical: 6,
  },
  logoTagline: {
    fontSize: 9,
    color: '#8C7B6E',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  bottomSection: {
    gap: 24,
  },
  welcomeRow: {
    gap: 6,
  },
  welcomeText: {
    fontSize: 26,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 1,
  },
  subText: {
    fontSize: 13,
    color: '#8C7B6E',
    letterSpacing: 0.3,
  },
  buttons: {
    gap: 12,
  },
  googleButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 1,
  },
  googleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#2C2420',
    fontSize: 14,
    letterSpacing: 0.3,
    fontWeight: '400',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E0D5',
  },
  dividerText: {
    color: '#8C7B6E',
    fontSize: 12,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#F5F0E8',
    fontSize: 14,
    letterSpacing: 0.5,
    fontWeight: '400',
  },
  vendorLink: {
    color: '#C9A84C',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});