/**
 * app/index.tsx — TEMPORARY FROST PREVIEW REDIRECT
 *
 * This file is the regular app entry point. The original landing/login flow is
 * preserved in git history — to restore the real index.tsx after previewing:
 *
 *     git checkout app/index.tsx
 *
 * To preview Frost: keep this file as-is. App boot → straight to Frost landing.
 * To resume normal app development: run the git checkout above.
 *
 * Do NOT commit this file in this state.
 */

import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';

export default function FrostPreviewRedirect() {
  useEffect(() => {
    // One-shot redirect on mount.
    const t = setTimeout(() => {
      router.replace('/(frost)/landing');
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Render nothing while the redirect fires
  return <View style={{ flex: 1, backgroundColor: '#F4F2EE' }} />;
}
