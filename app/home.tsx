import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'venues', label: 'Venues', sub: 'Palaces, farmhouses & more' },
  { id: 'photographers', label: 'Photographers', sub: 'Candid, traditional & cinematic' },
  { id: 'mua', label: 'Makeup Artists', sub: 'Bridal & party makeup' },
  { id: 'designers', label: 'Designers', sub: 'Bridal & groom wear' },
  { id: 'choreographers', label: 'Choreographers', sub: 'Sangeet & performance prep' },
  { id: 'content-creators', label: 'Content Creators', sub: 'BTS Reels & short films' },
  { id: 'dj', label: 'DJ & Music', sub: 'Live music & DJ services' },
];

export default function HomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello</Text>
          <Text style={styles.subGreeting}>Find your dream wedding team</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/profile')}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>D</Text>
        </TouchableOpacity>
      </View>

      {/* Genie Budget Gauge */}
      <TouchableOpacity style={styles.genieBar} onPress={() => router.push('/bts-planner')}>
        <View style={styles.genieLeft}>
          <Text style={styles.genieTitle}>Genie Budget</Text>
          <Text style={styles.genieSubtitle}>Heart vendors to track your estimated spend</Text>
        </View>
        <Text style={styles.genieArrow}>›</Text>
      </TouchableOpacity>

      {/* Category List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.sectionTitle}>Categories</Text>

        {CATEGORIES.map((cat, index) => (
          <View key={cat.id}>
            <TouchableOpacity
              style={styles.categoryRow}
              onPress={() => router.push(`/filter?category=${cat.id}`)}
            >
              <View style={styles.categoryText}>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
                <Text style={styles.categorySub}>{cat.sub}</Text>
              </View>
              <Text style={styles.categoryArrow}>›</Text>
            </TouchableOpacity>
            {index < CATEGORIES.length - 1 && <View style={styles.rowDivider} />}
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navLabel, styles.navActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/moodboard')}>
          <Text style={styles.navLabel}>Moodboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/bts-planner')}>
          <Text style={styles.navLabel}>Planner</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/profile')}>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    color: '#1C1C1C',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  subGreeting: {
    fontSize: 13,
    color: '#8C7B6E',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#C9A84C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FAF6F0',
    fontSize: 16,
    fontWeight: '500',
  },
  genieBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 28,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: '#FFF8EC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8D9B5',
  },
  genieLeft: {
    gap: 3,
  },
  genieTitle: {
    fontSize: 14,
    color: '#1C1C1C',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  genieSubtitle: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  genieArrow: {
    fontSize: 20,
    color: '#C9A84C',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  categoryText: {
    gap: 3,
  },
  categoryLabel: {
    fontSize: 16,
    color: '#1C1C1C',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  categorySub: {
    fontSize: 12,
    color: '#8C7B6E',
  },
  categoryArrow: {
    fontSize: 20,
    color: '#C9A84C',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#EDE8E3',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#EDE8E3',
    backgroundColor: '#FAF6F0',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  navItem: {
    alignItems: 'center',
  },
  navLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 0.3,
  },
  navActive: {
    color: '#C9A84C',
    fontWeight: '600',
  },
});