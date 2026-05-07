import { View, Text, StyleSheet } from 'react-native';
const BG   = '#F8F7F5';
const MUTED = '#8C8480';
const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
export default function Screen() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Coming soon</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: CG300, fontSize: 22, color: MUTED, fontStyle: 'italic' },
});
