import { useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  useEffect(() => {
    (async () => {
      try {
        const vendorRaw = await AsyncStorage.getItem('vendor_session');
        if (vendorRaw) {
          const vs = JSON.parse(vendorRaw);
          if (vs?.vendorId || vs?.id) { router.replace('/(vendor)/today' as any); return; }
        }
        const coupleRaw = await AsyncStorage.getItem('couple_session');
        if (coupleRaw) {
          const cs = JSON.parse(coupleRaw);
          if (cs?.id || cs?.userId) {
            // Co-planner shortcut
            if (cs?.dreamer_type === 'co_planner') {
              router.replace('/(circle)/landing' as any);
              return;
            }
            // Fully set up — go to PIN login (which then routes to Frost)
            if (cs?.pin_set && cs?.name) {
              router.replace('/couple-pin-login' as any);
              return;
            }
            // Partial account (no PIN, or no name) — send back to login to finish setup
            router.replace('/couple-login' as any);
            return;
          }
        }
        router.replace('/couple-login' as any);
      } catch { router.replace('/couple-login' as any); }
    })();
  }, []);
  return <View style={{ flex: 1, backgroundColor: '#F4F2EE' }} />;
}
