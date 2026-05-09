import { Stack } from 'expo-router';
import {
  CormorantGaramond_300Light,
  CormorantGaramond_300Light_Italic,
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';
import {
  Jost_200ExtraLight,
  Jost_300Light,
  Jost_400Regular,
} from '@expo-google-fonts/jost';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

try { SplashScreen.preventAutoHideAsync(); } catch (_) {}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_300Light_Italic,
    CormorantGaramond_400Regular,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_600SemiBold,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    Jost_200ExtraLight,
    Jost_300Light,
    Jost_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar style="dark" backgroundColor="#F8F7F5" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </>
  );
}
