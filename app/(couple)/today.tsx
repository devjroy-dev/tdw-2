import { View, Text } from 'react-native';
import { Colors, Fonts } from '../../constants/tokens';

export default function CoupleTodayScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background,
      alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: Fonts.body,
        color: Colors.muted, fontSize: 13 }}>Today — coming in V2</Text>
    </View>
  );
}
