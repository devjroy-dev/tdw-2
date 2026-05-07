import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Calendar, Users, BarChart2, Megaphone, Gift,
  FileText, Lightbulb, ChevronRight,
} from 'lucide-react-native';

const GOLD  = '#C9A84C';
const INK   = '#0C0A09';
const BG    = '#F8F7F5';
const CARD  = '#F4F1EC';
const BORDER = '#E2DED8';
const MUTED  = '#8C8480';
const DARK   = '#111111';

const CG300 = 'CormorantGaramond_300Light';
const DM300 = 'DMSans_300Light';
const JOST  = 'Jost_300Light';

const TOOLS = [
  { Icon: Calendar,  title: 'Calendar',        subtitle: 'Your shoots & events',     route: '/(vendor)/studio' },
  { Icon: Users,     title: 'Team',             subtitle: 'Manage your team',         route: '/(vendor)/studio' },
  { Icon: BarChart2, title: 'Analytics',        subtitle: 'Views, saves, enquiries',  route: '/(vendor)/studio' },
  { Icon: Megaphone, title: 'Broadcast',        subtitle: 'Message all clients',      route: '/(vendor)/studio' },
  { Icon: Gift,      title: 'Referrals',        subtitle: 'Earn from referrals',      route: '/(vendor)/studio' },
  { Icon: FileText,  title: 'Contracts',        subtitle: 'Templates & signed docs',  route: '/(vendor)/studio' },
  { Icon: Lightbulb, title: 'Tips & Features',  subtitle: 'What TDW can do for you',  route: '/(vendor)/studio' },
];

export default function VendorStudioScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Page header */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR STUDIO</Text>
        <Text style={styles.title}>Studio</Text>
      </View>

      {/* 2-column tool grid */}
      <View style={styles.grid}>
        {TOOLS.map(({ Icon, title, subtitle, route }) => (
          <TouchableOpacity
            key={title}
            style={styles.toolCard}
            activeOpacity={0.8}
            onPress={() => { Haptics.selectionAsync(); router.push(route as any); }}
          >
            <Icon size={24} strokeWidth={1.5} color={GOLD} />
            <Text style={styles.toolTitle}>{title}</Text>
            <Text style={styles.toolSub}>{subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Discovery preview — dark card */}
      <TouchableOpacity
        style={styles.discoveryCard}
        activeOpacity={0.85}
        onPress={() => { Haptics.selectionAsync(); router.push('/(vendor)/studio' as any); }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.discoveryEyebrow}>DISCOVERY</Text>
          <Text style={styles.discoveryTitle}>See your profile</Text>
          <Text style={styles.discoverySub}>Exactly how couples experience you.</Text>
        </View>
        <ChevronRight size={20} strokeWidth={1.5} color={GOLD} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  header: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 },
  eyebrow: {
    fontFamily: JOST, fontSize: 10, letterSpacing: 4, textTransform: 'uppercase',
    color: MUTED, marginBottom: 8,
  },
  title: { fontFamily: CG300, fontSize: 28, color: INK, lineHeight: 32 },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12,
    paddingHorizontal: 24,
  },
  toolCard: {
    width: '47%',
    backgroundColor: CARD, borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 24,
  },
  toolTitle: { fontFamily: CG300, fontSize: 18, color: INK, marginTop: 16, lineHeight: 22 },
  toolSub: { fontFamily: DM300, fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 17 },

  discoveryCard: {
    marginHorizontal: 24, marginTop: 24,
    backgroundColor: INK, borderRadius: 16, padding: 24,
    flexDirection: 'row', alignItems: 'center',
  },
  discoveryEyebrow: {
    fontFamily: JOST, fontSize: 10, letterSpacing: 4, textTransform: 'uppercase',
    color: MUTED, marginBottom: 6,
  },
  discoveryTitle: { fontFamily: CG300, fontSize: 20, color: '#F8F7F5', marginBottom: 6, lineHeight: 24 },
  discoverySub: { fontFamily: DM300, fontSize: 13, color: MUTED },
});
