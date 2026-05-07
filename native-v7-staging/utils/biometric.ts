import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Sign in to The Dream Wedding',
    fallbackLabel: 'Use phone number instead',
    cancelLabel: 'Cancel',
  });
  return result.success;
}

export async function setBiometricEnabled(enabled: boolean) {
  await AsyncStorage.setItem('biometric_enabled', enabled ? 'true' : 'false');
}

export async function isBiometricEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem('biometric_enabled');
  return val === 'true';
}
