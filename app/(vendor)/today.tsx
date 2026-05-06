import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors, Fonts } from '../../constants/tokens';
import { clearVendorSession, getVendorSession } from '../../utils/session';
import { useState, useEffect } from 'react';

const INK = '#0C0A09';
const CREAM = '#F8F7F5';
const BG = '#F8F7F5';
const BORDER = '#E2DED8';
const MUTED = '#8C8480';

export default function VendorTodayScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');

  useEffect(() => {
    getVendorSession().then(s => {
      if (s?.name || s?.vendorName) setName(s.name || s.vendorName);
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>

      {/* Top bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56, backgroundColor: BG, borderBottomWidth: 0.5, borderBottomColor: BORDER }}>
        <Text style={{ fontFamily: 'CormorantGaramond_300Light', fontSize: 20, color: INK, letterSpacing: 1 }}>TDW</Text>
        <Text style={{ fontFamily: Fonts.body, fontSize: 9, letterSpacing: 3, textTransform: 'uppercase', color: MUTED }}>MAKER</Text>
        {/* DEV ONLY — remove when vendor Today is built */}
        <TouchableOpacity onPress={async () => { await clearVendorSession(); router.replace('/'); }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: Fonts.body, fontSize: 12, color: CREAM }}>{name?.[0]?.toUpperCase() || 'M'}</Text>
          </View>
        </TouchableOpacity>
        {/* END DEV ONLY */}
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: Fonts.body, color: MUTED, fontSize: 13 }}>Vendor today — coming soon</Text>
      </View>

    </View>
  );
}