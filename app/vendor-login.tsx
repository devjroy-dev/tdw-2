import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, TextInput
} from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function VendorLoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOTP = () => {
    if (phone.length === 10) setOtpSent(true);
  };

  const handleVerify = () => {
    if (otp.length === 6) router.replace('/vendor-onboarding');
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.logo}>DreamWedding</Text>
        <Text style={styles.tag}>Vendor Portal</Text>

        <View style={styles.divider} />

        {!otpSent ? (
          <>
            <Text style={styles.title}>Welcome,{'\n'}Wedding Professional</Text>
            <Text style={styles.subtitle}>Enter your phone number to continue</Text>

            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="10 digit mobile number"
                placeholderTextColor="#8C7B6E"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, phone.length !== 10 && styles.buttonDisabled]}
              onPress={handleSendOTP}
              disabled={phone.length !== 10}
            >
              <Text style={styles.buttonText}>Send OTP</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Verify your{'\n'}number</Text>
            <Text style={styles.subtitle}>OTP sent to +91 {phone}</Text>

            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6 digit OTP"
              placeholderTextColor="#8C7B6E"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.button, otp.length !== 6 && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={otp.length !== 6}
            >
              <Text style={styles.buttonText}>Verify & Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setOtpSent(false)}>
              <Text style={styles.resendText}>← Change number</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.customerLink}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.customerLinkText}>Looking to plan a wedding? →</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    paddingTop: 60,
    paddingHorizontal: 30,
  },
  header: {
    marginBottom: 40,
  },
  backBtn: {
    fontSize: 22,
    color: '#1C1C1C',
  },
  content: {
    flex: 1,
    gap: 16,
  },
  logo: {
    fontSize: 30,
    color: '#C9A84C',
    fontWeight: '300',
    letterSpacing: 6,
  },
  tag: {
    fontSize: 11,
    color: '#8C7B6E',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginTop: -8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8DDD4',
    marginVertical: 8,
  },
  title: {
    fontSize: 32,
    color: '#1C1C1C',
    fontWeight: '300',
    letterSpacing: 0.5,
    lineHeight: 42,
  },
  subtitle: {
    fontSize: 13,
    color: '#8C7B6E',
    letterSpacing: 0.5,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  countryCode: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  countryCodeText: {
    fontSize: 14,
    color: '#1C1C1C',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1C1C1C',
    backgroundColor: '#FFFFFF',
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 8,
    paddingVertical: 16,
    fontSize: 24,
    color: '#1C1C1C',
    backgroundColor: '#FFFFFF',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#C9A84C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#FAF6F0',
    fontSize: 14,
    letterSpacing: 1,
    fontWeight: '500',
  },
  resendText: {
    color: '#C9A84C',
    fontSize: 13,
    textAlign: 'center',
  },
  customerLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  customerLinkText: {
    color: '#8C7B6E',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});