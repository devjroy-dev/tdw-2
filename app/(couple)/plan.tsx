import { View, Text } from 'react-native';
import { Colors, Fonts } from '../../constants/tokens';

export default function CouplePlanScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background,
      alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: Fonts.body,
        color: Colors.muted, fontSize: 13 }}>Plan — coming soon</Text>
    </View>
  );
}
