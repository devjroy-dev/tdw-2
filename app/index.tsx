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
          if (vs?.vendorId || vs?.id) { router.replace('/vendor-dashboard' as any); return; }
        }
        const coupleRaw = await AsyncStorage.getItem('couple_session');
        if (coupleRaw) {
          const cs = JSON.parse(coupleRaw);
          if (cs?.id || cs?.userId) {
            if (cs?.dreamer_type === 'co_planner') { router.replace('/(circle)/landing' as any); return; }
            if (cs?.pin_set) { router.replace('/couple-pin-login' as any); } 
            else { router.replace('/(frost)/landing' as any); }
            return;
          }
        }
        router.replace('/couple-login' as any);
      } catch { router.replace('/couple-login' as any); }
    })();
  }, []);
  return <View style={{ flex: 1, backgroundColor: '#F4F2EE' }} />;
}
