#!/bin/bash
# patch_safe_area.sh
# Adds SafeAreaProvider to root _layout.tsx
# Run from: /workspaces/tdw-2

set -e

FILE="app/_layout.tsx"

echo "=== SAFETY CHECKS ==="

# Check file exists
if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. Are you in /workspaces/tdw-2?"
  exit 1
fi

# Check SafeAreaProvider not already present
if grep -q "SafeAreaProvider" "$FILE"; then
  echo "ERROR: SafeAreaProvider already present in $FILE. Aborting."
  exit 1
fi

echo "Safety checks passed."
echo ""
echo "=== APPLYING PATCH ==="

cat > "$FILE" << 'EOF'
import { Stack } from 'expo-router';
import {
  CormorantGaramond_300Light,
  CormorantGaramond_400Regular,
  CormorantGaramond_600SemiBold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_300Light,
    CormorantGaramond_400Regular,
    CormorantGaramond_600SemiBold,
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#F8F7F5" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </SafeAreaProvider>
  );
}
EOF

echo "Patch applied."
echo ""
echo "=== VERIFICATION ==="
grep -n "SafeAreaProvider" "$FILE"
echo ""
echo "=== FILE PREVIEW ==="
cat "$FILE"
echo ""
echo "=== DONE ==="
echo "Next step: eas update --branch production --message 'fix: add SafeAreaProvider to root layout — crash fix'"
