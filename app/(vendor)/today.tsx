import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors, Fonts } from '../../constants/tokens';
import { clearVendorSession } from '../../utils/session';

export default function VendorTodayScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background,
      alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: Fonts.body,
        color: Colors.muted, fontSize: 13 }}>Vendor today — coming soon</Text>

      {/* DEV ONLY — remove this block when done testing */}
      <TouchableOpacity
        style={{ marginTop: 24 }}
        onPress={async () => { await clearVendorSession(); router.replace('/'); }}
      >
        <Text style={{ fontFamily: Fonts.body, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.muted }}>SIGN OUT</Text>
      </TouchableOpacity>
      {/* END DEV ONLY */}
    </View>
  );
}