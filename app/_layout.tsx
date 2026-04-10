import { CormorantGaramond_300Light, CormorantGaramond_400Regular, CormorantGaramond_500Medium, CormorantGaramond_600SemiBold, useFonts } from '@expo-google-fonts/cormorant-garamond';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const user = await AsyncStorage.getItem('user_session');
      const inAuthGroup = ['login', 'otp', 'splash', 'user-type', 'vendor-login', 'vendor-onboarding'].includes(segments[0] as string);

      if (!user && !inAuthGroup) {
        router.replace('/login');
      } else if (user && inAuthGroup && segments[0] !== 'splash') {
        const parsed = JSON.parse(user);
        if (parsed.userType === 'vendor') {
          router.replace('/vendor-dashboard');
        } else {
          router.replace('/home');
        }
      }
    } catch (e) {
      router.replace('/login');
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#C9A84C" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F0E8', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#C9A84C" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="splash" />
          <Stack.Screen name="login" />
          <Stack.Screen name="otp" />
          <Stack.Screen name="user-type" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="home" />
          <Stack.Screen name="vendor-login" />
          <Stack.Screen name="vendor-onboarding" />
          <Stack.Screen name="vendor-dashboard" />
          <Stack.Screen name="vendor-preview" />
          <Stack.Screen name="filter" />
          <Stack.Screen name="swipe" />
          <Stack.Screen name="vendor-profile" />
          <Stack.Screen name="moodboard" />
          <Stack.Screen name="bts-planner" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="inquiry" />
          <Stack.Screen name="payment" />
          <Stack.Screen name="payment-success" />
          <Stack.Screen name="messaging" />
          <Stack.Screen name="compare" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="lookalike" />
          <Stack.Screen name="wedding-website" />
        </Stack>
      </AuthGate>
    </>
  );
}