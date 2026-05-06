import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts } from '../../constants/tokens';
import { clearVendorSession } from '../../utils/session';

export default function VendorTodayScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, paddingTop: insets.top }}>
      {/* DEV ONLY — remove this block when done testing */}
      <TouchableOpacity style={{ alignItems: 'flex-end', paddingHorizontal: 20, paddingVertical: 10 }} onPress={async () => { await clearVendorSession(); router.replace('/'); }}>
        <Text style={{ fontFamily: Fonts.body, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.muted }}>SIGN OUT</Text>
      </TouchableOpacity>
      {/* END DEV ONLY */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: Fonts.body, color: Colors.muted, fontSize: 13 }}>Vendor today — coming soon</Text>
      </View>
    </View>
  );
}