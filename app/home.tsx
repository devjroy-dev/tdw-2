import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, TextInput
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 2;

const CATEGORIES = [
  { id: 'venues', label: 'Venues', sub: 'Palaces, farmhouses & luxury hotels' },
  { id: 'photographers', label: 'Photographers', sub: 'Candid, traditional & cinematic' },
  { id: 'mua', label: 'Makeup Artists', sub: 'Bridal & party makeup' },
  { id: 'designers', label: 'Designers', sub: 'Bridal & groom wear' },
  { id: 'choreographers', label: 'Choreographers', sub: 'Sangeet & performance prep' },
  { id: 'content-creators', label: 'Content Creators', sub: 'BTS Reels & short films' },
  { id: 'dj', label: 'DJ & Music', sub: 'Live music & DJ services' },
  { id: 'event-managers', label: 'Event Managers', sub: 'Luxury & destination weddings' },
  { id: 'jewellery', label: 'Jewellery Designers', sub: 'Bridal & custom jewellery' },
  { id: 'bridal-wellness', label: 'Bridal Wellness', sub: 'Skin, hair, health & dermatology' },
];

const QUICK_CARDS = [
  {
    id: 'get-inspired',
    title: 'Get Inspired',
    sub: 'Décor, candid & more',
    emoji: '✨',
    route: '/get-inspired',
    bg: '#FFF8EC',
    border: '#E8D9B5',
  },
  {
    id: 'look-book',
    title: 'Look Book',
    sub: 'Designers & artists',
    emoji: '👗',
    route: '/look-book',
    bg: '#F5F0E8',
    border: '#E8E0D5',
  },
  {
    id: 'destination-weddings',
    title: 'Destination',
    sub: 'Exotic locations',
    emoji: '🌏',
    route: '/destination-weddings',
    bg: '#F0F5F5',
    border: '#D5E8E8',
  },
  {
    id: 'special-offers',
    title: 'Special Offers',
    sub: 'Deals from vendors',
    emoji: '🎁',
    route: '/special-offers',
    bg: '#FFF0F5',
    border: '#E8D5DF',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [userName, setUserName] = useState('there');

  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const session = await AsyncStorage.getItem('user_session');
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed.name) setUserName(parsed.name.split(' ')[0]);
      }
    } catch (e) {}
  };

  const filteredCategories = CATEGORIES.filter(cat =>
    cat.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {userName}</Text>
          <Text style={styles.subGreeting}>Find your dream wedding team</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push('/notifications')} style={styles.notifBtn}>
            <Text style={styles.notifIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/profile')} style={styles.avatar}>
            <Text style={styles.avatarText}>{userName[0]?.toUpperCase() || 'D'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>

        {/* Search — thin and sleek */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search vendors, categories..."
            placeholderTextColor="#8C7B6E"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 4 Square Cards */}
        <View style={styles.cardGrid}>
          {QUICK_CARDS.map(card => (
            <TouchableOpacity
              key={card.id}
              style={[styles.quickCard, { backgroundColor: card.bg, borderColor: card.border }]}
              onPress={() => router.push(card.route as any)}
            >
              <Text style={styles.quickCardEmoji}>{card.emoji}</Text>
              <Text style={styles.quickCardTitle}>{card.title}</Text>
              <Text style={styles.quickCardSub}>{card.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {filteredCategories.map((cat, index) => (
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
              {index < filteredCategories.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navDot} />
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
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
  greeting: { fontSize: 26, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  subGreeting: { fontSize: 12, color: '#8C7B6E', marginTop: 3, letterSpacing: 0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8E0D5' },
  notifIcon: { fontSize: 15 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2C2420', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#C9A84C', fontSize: 15, fontWeight: '500' },
  scroll: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 16,
    gap: 8,
  },
  searchIcon: { fontSize: 16, color: '#8C7B6E' },
  searchInput: { flex: 1, fontSize: 13, color: '#2C2420' },
  searchClear: { fontSize: 11, color: '#8C7B6E', padding: 4 },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 24,
  },
  quickCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    justifyContent: 'flex-end',
    gap: 4,
  },
  quickCardEmoji: { fontSize: 24, marginBottom: 4 },
  quickCardTitle: { fontSize: 15, color: '#2C2420', fontWeight: '500', letterSpacing: 0.3 },
  quickCardSub: { fontSize: 11, color: '#8C7B6E', letterSpacing: 0.2 },
  categoriesSection: { paddingHorizontal: 24, marginBottom: 16 },
  sectionTitle: { fontSize: 11, color: '#8C7B6E', letterSpacing: 2, textTransform: 'uppercase', fontWeight: '500', marginBottom: 16 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 },
  categoryText: { gap: 4 },
  categoryLabel: { fontSize: 19, color: '#2C2420', fontWeight: '300', letterSpacing: 0.5 },
  categorySub: { fontSize: 11, color: '#8C7B6E', letterSpacing: 0.2 },
  categoryArrow: { fontSize: 20, color: '#C9A84C' },
  rowDivider: { height: 1, backgroundColor: '#E8E0D5' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingBottom: 28, borderTopWidth: 1, borderTopColor: '#E8E0D5', backgroundColor: '#F5F0E8', position: 'absolute', bottom: 0, width: '100%' },
  navItem: { alignItems: 'center', gap: 4 },
  navDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C9A84C' },
  navLabel: { fontSize: 12, color: '#8C7B6E', letterSpacing: 0.3 },
  navActive: { color: '#2C2420', fontWeight: '600' },
});