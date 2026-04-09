import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput } from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function OTPScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  const handleSendOTP = () => {
    if (phone.length === 10) setOtpSent(true);
  };

  const handleVerify = () => {
    if (otp.length === 6) router.replace('/user-type');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.logo}>DreamWedding</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {!otpSent ? (
          <>
            <Text style={styles.title}>Your phone{'\n'}number</Text>
            <Text style={styles.subtitle}>We'll send a verification code</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
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
              <Text style={styles.buttonText}>Send Code</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Enter the{'\n'}code</Text>
            <Text style={styles.subtitle}>Sent to +91 {phone}</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              placeholderTextColor="#C9B99A"
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
              <Text style={styles.buttonText}>Verify</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOtpSent(false)}>
              <Text style={styles.changeNumber}>Change number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    paddingTop: 60,
    paddingHorizontal: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 52,
  },
  backBtn: {
    fontSize: 22,
    color: '#2C2420',
    width: 24,
  },
  logo: {
    fontSize: 16,
    color: '#C9A84C',
    fontWeight: '400',
    letterSpacing: 4,
  },
  content: {
    flex: 1,
    gap: 20,
  },
  title: {
    fontSize: 36,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 0.5,
    lineHeight: 46,
  },
  subtitle: {
    fontSize: 14,
    color: '#8C7B6E',
    marginTop: -8,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  countryCode: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 15,
    color: '#2C2420',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#2C2420',
    backgroundColor: '#FFFFFF',
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 10,
    paddingVertical: 18,
    fontSize: 28,
    color: '#2C2420',
    backgroundColor: '#FFFFFF',
    letterSpacing: 12,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.3,
  },
  buttonText: {
    color: '#F5F0E8',
    fontSize: 15,
    letterSpacing: 0.5,
    fontWeight: '500',
  },
  changeNumber: {
    color: '#C9A84C',
    fontSize: 14,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});