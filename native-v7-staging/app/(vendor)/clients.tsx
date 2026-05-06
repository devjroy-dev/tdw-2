import { View, Text } from 'react-native';
import { Colors, Fonts } from '../../constants/tokens';

export default function VendorClientsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background,
      alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: Fonts.body,
        color: Colors.muted, fontSize: 13 }}>Clients — coming soon</Text>
    </View>
  );
}
