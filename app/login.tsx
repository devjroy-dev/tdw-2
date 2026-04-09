import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>

      {/* Logo Section */}
      <View style={styles.logoSection}>
        <Text style={styles.logo}>DreamWedding</Text>
        <View style={styles.logoDivider} />
        <Text style={styles.logoTagline}>India's Premium Wedding Platform</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonSection}>
        <Text style={styles.welcomeText}>Welcome</Text>
        <Text style={styles.subText}>Sign in to continue planning your dream wedding</Text>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton}>
            <Text style={styles.socialButtonText}>Continue with Instagram</Text>
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

          <Text style={styles.verifyNote}>
            Phone verification required for all sign ins
          </Text>
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
    paddingTop: 80,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 34,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 8,
  },
  logoDivider: {
    width: 36,
    height: 1,
    backgroundColor: '#C9A84C',
    opacity: 0.7,
  },
  logoTagline: {
    fontSize: 11,
    color: '#8C7B6E',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  buttonSection: {
    gap: 24,
  },
  welcomeText: {
    fontSize: 32,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 1,
  },
  subText: {
    fontSize: 14,
    color: '#8C7B6E',
    marginTop: -16,
    lineHeight: 22,
  },
  buttons: {
    gap: 12,
  },
  socialButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  socialButtonText: {
    color: '#2C2420',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8E0D5',
  },
  dividerText: {
    color: '#8C7B6E',
    fontSize: 13,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#F5F0E8',
    fontSize: 15,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  verifyNote: {
    fontSize: 11,
    color: '#8C7B6E',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  vendorLink: {
    color: '#C9A84C',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});