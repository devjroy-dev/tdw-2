import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function FrostLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#E8E5E0' },
        }}
      />
    </>
  );
}
