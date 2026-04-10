import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Image, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const PHOTOS = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800',
    caption: 'Umaid Bhawan Palace',
    location: 'Jodhpur, Rajasthan',
    tag: 'Rajasthan',
    desc: 'The world\'s most spectacular wedding venue',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800',
    caption: 'Taj Falaknuma Palace',
    location: 'Hyderabad',
    tag: 'Hyderabad',
    desc: 'A Nizam era palace perched atop a hill',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800',
    caption: 'Beachside Wedding',
    location: 'Goa',
    tag: 'Goa',
    desc: 'Sun, sand and forever',
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
    caption: 'Mountain Retreat',
    location: 'Shimla, Himachal',
    tag: 'Hills',
    desc: 'Snow capped peaks and eternal vows',
  },
  {
    id: '5',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800',
    caption: 'Heritage Haveli',
    location: 'Jaipur, Rajasthan',
    tag: 'Rajasthan',
    desc: 'Royal Rajasthani grandeur',
  },
  {
    id: '6',
    image: 'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=800',
    caption: 'Backwater Wedding',
    location: 'Kerala',
    tag: 'Kerala',
    desc: 'Serene backwaters and lush greenery',
  },
  {
    id: '7',
    image: 'https://images.unsplash.com/photo-1610641818989-c2051b5e2cfd?w=800',
    caption: 'Lake Palace',
    location: 'Udaipur, Rajasthan',
    tag: 'Rajasthan',
    desc: 'The city of lakes and romance',
  },
];

const FILTERS = ['All', 'Rajasthan', 'Goa', 'Kerala', 'Hills', 'Hyderabad'];

export default function DestinationWeddingsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentIndex, setCurrentIndex] = useState(0);

  const filtered = activeFilter === 'All' ? PHOTOS : PHOTOS.filter(p => p.tag === activeFilter);
  const current = filtered[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Destination Weddings</Text>
          <Text style={styles.subtitle}>India's most breathtaking venues</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} style={[styles.filterPill, activeFilter === f && styles.filterPillActive]} onPress={() => { setActiveFilter(f); setCurrentIndex(0); }}>
            <Text style={[styles.filterPillText, activeFilter === f && styles.filterPillTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {current && (
        <View style={styles.photoWrapper}>
          <Image source={{ uri: current.image }} style={styles.photo} resizeMode="cover" />
          <View style={styles.overlay} />
          <View style={styles.counter}>
            <Text style={styles.counterText}>{currentIndex + 1} of {filtered.length}</Text>
          </View>
          <View style={styles.photoInfo}>
            <Text style={styles.photoCaption}>{current.caption}</Text>
            <Text style={styles.photoLocation}>📍 {current.location}</Text>
            <Text style={styles.photoDesc}>{current.desc}</Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => router.push(`/filter?category=venues`)}
            >
              <Text style={styles.exploreBtnText}>Explore Venues →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.navRow}>
            <TouchableOpacity style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]} onPress={() => currentIndex > 0 && setCurrentIndex(p => p - 1)}>
              <Text style={styles.navBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.dots}>
              {filtered.map((_, i) => (
                <TouchableOpacity key={i} style={[styles.dot, currentIndex === i && styles.dotActive]} onPress={() => setCurrentIndex(i)} />
              ))}
            </View>
            <TouchableOpacity style={[styles.navBtn, currentIndex === filtered.length - 1 && styles.navBtnDisabled]} onPress={() => currentIndex < filtered.length - 1 && setCurrentIndex(p => p + 1)}>
              <Text style={styles.navBtnText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.bottomCard}>
        <View style={styles.bottomLeft}>
          <Text style={styles.premiumTitle}>✦ Plan Your Destination Wedding</Text>
          <Text style={styles.premiumSub}>Connect with venues & planners across India</Text>
        </View>
        <TouchableOpacity style={styles.exploreVenuesBtn} onPress={() => router.push('/filter?category=venues')}>
          <Text style={styles.exploreVenuesBtnText}>Explore</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 16 },
  backBtn: { fontSize: 22, color: '#2C2420', width: 24 },
  headerCenter: { alignItems: 'center', gap: 3 },
  title: { fontSize: 18, color: '#2C2420', fontWeight: '400', letterSpacing: 0.5 },
  subtitle: { fontSize: 11, color: '#8C7B6E', letterSpacing: 0.5 },
  filterScroll: { maxHeight: 44, marginBottom: 16 },
  filterContent: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  filterPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 50, borderWidth: 1, borderColor: '#E8E0D5', backgroundColor: '#FFFFFF' },
  filterPillActive: { backgroundColor: '#2C2420', borderColor: '#2C2420' },
  filterPillText: { fontSize: 13, color: '#2C2420' },
  filterPillTextActive: { color: '#F5F0E8', fontWeight: '500' },
  photoWrapper: { flex: 1, marginHorizontal: 24, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  photo: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(20,12,4,0.80)' },
  counter: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(245,240,232,0.85)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5 },
  counterText: { fontSize: 11, color: '#2C2420', fontWeight: '500', letterSpacing: 0.5 },
  photoInfo: { position: 'absolute', bottom: 72, left: 20, right: 20, gap: 6 },
  photoCaption: { fontSize: 22, color: '#F5F0E8', fontWeight: '300', letterSpacing: 0.5 },
  photoLocation: { fontSize: 13, color: '#C9A84C', fontWeight: '500' },
  photoDesc: { fontSize: 12, color: '#B8A99A' },
  exploreBtn: { marginTop: 8, borderWidth: 1, borderColor: 'rgba(245,240,232,0.5)', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start' },
  exploreBtnText: { fontSize: 13, color: '#F5F0E8' },
  navRow: { position: 'absolute', bottom: 16, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  navBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245,240,232,0.85)', justifyContent: 'center', alignItems: 'center' },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 22, color: '#2C2420' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(44,36,32,0.2)' },
  dotActive: { width: 20, backgroundColor: '#C9A84C' },
  bottomCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 24, marginTop: 14, marginBottom: 24, padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E8E0D5' },
  bottomLeft: { flex: 1, gap: 3 },
  premiumTitle: { fontSize: 14, color: '#2C2420', fontWeight: '500' },
  premiumSub: { fontSize: 12, color: '#8C7B6E' },
  exploreVenuesBtn: { borderWidth: 1, borderColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  exploreVenuesBtnText: { fontSize: 13, color: '#C9A84C', fontWeight: '500' },
});