import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { clearCoupleSession } from '../../utils/session';
import { Colors, Fonts } from '../../constants/tokens';

export default function CoupleTodayScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <Text style={{ fontFamily: Fonts.body, color: Colors.muted, fontSize: 13 }}>Today — coming in V2</Text>
      <TouchableOpacity onPress={async () => { await clearCoupleSession(); router.replace('/'); }}>
        <Text style={{ fontFamily: Fonts.body, color: Colors.gold, fontSize: 11, letterSpacing: 2 }}>SIGN OUT</Text>
      </TouchableOpacity>
    </View>
  );
}
