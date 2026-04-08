import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
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
        <Stack.Screen name="filter" />
        <Stack.Screen name="swipe" />
        <Stack.Screen name="vendor-profile" />
        <Stack.Screen name="moodboard" />
        <Stack.Screen name="bts-planner" />
        <Stack.Screen name="profile" />
      </Stack>
    </>
  );
}