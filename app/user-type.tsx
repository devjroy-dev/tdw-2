import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const USER_TYPES = [
  {
    id: 'couple',
    label: 'We are a Couple',
    sub: 'Planning our dream wedding',
    route: '/onboarding',
  },
  {
    id: 'parent',
    label: 'I am a Parent',
    sub: 'Planning my son or daughter\'s wedding',
    route: '/onboarding',
  },
  {
    id: 'vendor',
    label: 'I am a Vendor',
    sub: 'Photographer, venue, MUA or other professional',
    route: '/vendor-onboarding',
  },
];

export default function UserTypeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>DreamWedding</Text>
        <View style={styles.logoDivider} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Who are you?</Text>
        <Text style={styles.subtitle}>Help us personalise your experience</Text>

        <View style={styles.list}>
          {USER_TYPES.map((type, index) => (
            <View key={type.id}>
              <TouchableOpacity
                style={styles.row}
                onPress={() => router.replace(type.route as any)}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{type.label}</Text>
                  <Text style={styles.rowSub}>{type.sub}</Text>
                </View>
                <Text style={styles.rowArrow}>›</Text>
              </TouchableOpacity>
              {index < USER_TYPES.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    paddingTop: 80,
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    gap: 14,
    marginBottom: 64,
  },
  logo: {
    fontSize: 28,
    color: '#C9A84C',
    fontWeight: '300',
    letterSpacing: 8,
  },
  logoDivider: {
    width: 36,
    height: 1,
    backgroundColor: '#C9A84C',
    opacity: 0.5,
  },
  content: {
    flex: 1,
    gap: 24,
  },
  title: {
    fontSize: 34,
    color: '#1C1C1C',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#8C7B6E',
    marginTop: -16,
  },
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    overflow: 'hidden',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  rowText: {
    gap: 4,
  },
  rowLabel: {
    fontSize: 16,
    color: '#1C1C1C',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  rowSub: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  rowArrow: {
    fontSize: 22,
    color: '#C9A84C',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8DDD4',
    marginHorizontal: 20,
  },
});