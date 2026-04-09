import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Image
} from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const FUNCTIONS = ['All', 'Roka', 'Haldi', 'Mehendi', 'Sangeet', 'Cocktail', 'Wedding', 'Reception'];

const MOCK_SAVED = [
  {
    id: '1',
    vendorId: '1',
    vendorName: 'Joseph Radhik',
    category: 'Photographer',
    image: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800',
    function: 'Wedding',
    note: '',
  },
  {
    id: '2',
    vendorId: '2',
    vendorName: 'The Leela Palace',
    category: 'Venue',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800',
    function: 'Wedding',
    note: 'Check availability for December',
  },
  {
    id: '3',
    vendorId: '3',
    vendorName: 'Namrata Soni',
    category: 'MUA',
    image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
    function: 'Mehendi',
    note: '',
  },
  {
    id: '4',
    vendorId: '4',
    vendorName: 'Reel Moments',
    category: 'Content Creator',
    image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800',
    function: 'Sangeet',
    note: 'Love their reels style',
  },
  {
    id: '5',
    vendorId: '5',
    vendorName: 'Sabyasachi Mukherjee',
    category: 'Designer',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
    function: 'Wedding',
    note: '',
  },
  {
    id: '6',
    vendorId: '8',
    vendorName: 'Umaid Bhawan Palace',
    category: 'Venue',
    image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
    function: 'Reception',
    note: 'Destination wedding option',
  },
];

const IMAGE_SIZE = (width - 48 - 12) / 2;

export default function MoodboardScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [saved, setSaved] = useState(MOCK_SAVED);

  const filtered = activeFilter === 'All'
    ? saved
    : saved.filter(s => s.function === activeFilter);

  const removeItem = (id: string) => {
    setSaved(prev => prev.filter(s => s.id !== id));
  };

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <Text style={styles.title}>Moodboard</Text>
        <Text style={styles.count}>{saved.length} saved</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FUNCTIONS.map(fn => (
          <TouchableOpacity
            key={fn}
            style={[styles.filterTab, activeFilter === fn && styles.filterTabActive]}
            onPress={() => setActiveFilter(fn)}
          >
            <Text style={[styles.filterTabText, activeFilter === fn && styles.filterTabTextActive]}>
              {fn}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptySubtitle}>Heart vendors while swiping to save them here</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/home')}>
            <Text style={styles.emptyBtnText}>Start Discovering</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.grid}
        >
          {filtered.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => router.push(`/vendor-profile?id=${item.vendorId}`)}
            >
              <Image source={{ uri: item.image }} style={styles.cardImage} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.id)}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.functionTag}>
                <Text style={styles.functionTagText}>{item.function}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>{item.vendorName}</Text>
                <Text style={styles.cardCategory}>{item.category}</Text>
                {item.note ? <Text style={styles.cardNote} numberOfLines={1}>{item.note}</Text> : null}
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 120, width: '100%' }} />
        </ScrollView>
      )}

      {saved.length > 0 && (
        <View style={styles.shareBar}>
          <TouchableOpacity style={styles.compareBtn} onPress={() => router.push('/compare')}>
            <Text style={styles.compareBtnText}>Compare Vendors</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn}>
            <Text style={styles.shareBtnText}>Share</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/home')}>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.navDot} />
          <Text style={[styles.navLabel, styles.navActive]}>Moodboard</Text>
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
    backgroundColor: '#F5F0E8',
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  count: {
    fontSize: 13,
    color: '#8C7B6E',
  },
  filterScroll: {
    maxHeight: 44,
    marginBottom: 16,
  },
  filterContent: {
    paddingHorizontal: 24,
    gap: 8,
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    backgroundColor: '#FFFFFF',
  },
  filterTabActive: {
    backgroundColor: '#2C2420',
    borderColor: '#2C2420',
  },
  filterTabText: {
    fontSize: 13,
    color: '#2C2420',
  },
  filterTabTextActive: {
    color: '#F5F0E8',
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 12,
  },
  card: {
    width: IMAGE_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  cardImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    resizeMode: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: {
    color: '#F5F0E8',
    fontSize: 9,
    fontWeight: '700',
  },
  functionTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#2C2420',
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  functionTagText: {
    fontSize: 9,
    color: '#F5F0E8',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  cardInfo: {
    padding: 10,
    gap: 3,
  },
  cardName: {
    fontSize: 12,
    color: '#2C2420',
    fontWeight: '500',
  },
  cardCategory: {
    fontSize: 11,
    color: '#8C7B6E',
  },
  cardNote: {
    fontSize: 11,
    color: '#C9A84C',
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    color: '#2C2420',
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8C7B6E',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  emptyBtnText: {
    fontSize: 14,
    color: '#F5F0E8',
    fontWeight: '500',
  },
  shareBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 90,
    paddingTop: 12,
  },
  compareBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  compareBtnText: {
    fontSize: 13,
    color: '#2C2420',
    fontWeight: '500',
  },
  shareBtn: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  shareBtnText: {
    fontSize: 13,
    color: '#8C7B6E',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
    backgroundColor: '#F5F0E8',
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C9A84C',
  },
  navLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 0.3,
  },
  navActive: {
    color: '#2C2420',
    fontWeight: '600',
  },
});