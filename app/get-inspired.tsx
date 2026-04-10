import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Image, ScrollView, Animated
} from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const INSPIRED_PHOTOS = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800',
    vendor: 'Sabyasachi Mukherjee',
    category: 'Bridal Designer',
    city: 'Kolkata',
    caption: 'The Bengal Bride Collection',
    tag: 'Designer',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    vendor: 'Hazoorilal Legacy',
    category: 'Jewellery',
    city: 'Delhi NCR',
    caption: 'Polki & Kundan Bridal Set',
    tag: 'Jewellery',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
    vendor: 'Namrata Soni',
    category: 'Makeup Artist',
    city: 'Mumbai',
    caption: 'The Dewy Bridal Look',
    tag: 'Makeup',
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
    vendor: 'Anita Dongre',
    category: 'Bridal Designer',
    city: 'Mumbai',
    caption: 'Rajasthani Bridal Couture',
    tag: 'Designer',
  },
  {
    id: '5',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    vendor: 'Tanishq Bridal',
    category: 'Jewellery',
    city: 'Mumbai',
    caption: 'The Grand Bridal Collection',
    tag: 'Jewellery',
  },
  {
    id: '6',
    image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
    vendor: 'Bianca Louzado',
    category: 'Makeup Artist',
    city: 'Mumbai',
    caption: 'Luminous Bridal Glow',
    tag: 'Makeup',
  },
];

const FILTERS = ['All', 'Designer', 'Jewellery', 'Makeup'];

export default function GetInspiredScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('All');
  const [currentIndex, setCurrentIndex] = useState(0);

  const filtered = activeFilter === 'All'
    ? INSPIRED_PHOTOS
    : INSPIRED_PHOTOS.filter(p => p.tag === activeFilter);

  const current = filtered[currentIndex];

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Get Inspired</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
            onPress={() => { setActiveFilter(f); setCurrentIndex(0); }}
          >
            <Text style={[styles.filterPillText, activeFilter === f && styles.filterPillTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Full page photo */}
      {current && (
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: current.image }}
            style={styles.photo}
            resizeMode="cover"
          />

          {/* Dark overlay */}
          <View style={styles.overlay} />

          {/* Counter */}
          <View style={styles.counter}>
            <Text style={styles.counterText}>{currentIndex + 1} of {filtered.length}</Text>
          </View>

          {/* Premium badge */}
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>✦ Premium</Text>
          </View>

          {/* Info */}
          <View style={styles.photoInfo}>
            <Text style={styles.photoCaption}>{current.caption}</Text>
            <Text style={styles.photoVendor}>{current.vendor}</Text>
            <Text style={styles.photoCategory}>{current.category} · {current.city}</Text>

            <TouchableOpacity
              style={styles.viewVendorBtn}
              onPress={() => router.push('/home')}
            >
              <Text style={styles.viewVendorBtnText}>View Vendor Profile →</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation arrows */}
          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
              onPress={() => currentIndex > 0 && setCurrentIndex(prev => prev - 1)}
            >
              <Text style={styles.navBtnText}>‹</Text>
            </TouchableOpacity>

            {/* Dots */}
            <View style={styles.dots}>
              {filtered.map((_, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dot, currentIndex === i && styles.dotActive]}
                  onPress={() => setCurrentIndex(i)}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.navBtn, currentIndex === filtered.length - 1 && styles.navBtnDisabled]}
              onPress={() => currentIndex < filtered.length - 1 && setCurrentIndex(prev => prev + 1)}
            >
              <Text style={styles.navBtnText}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Upgrade banner */}
      <View style={styles.upgradeBanner}>
        <Text style={styles.upgradeText}>✦ Unlock unlimited inspiration with Premium</Text>
        <TouchableOpacity>
          <Text style={styles.upgradeLink}>Upgrade →</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0605' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16 },
  backBtn: { fontSize: 22, color: '#F5F0E8' },
  title: { fontSize: 17, color: '#F5F0E8', fontWeight: '400', letterSpacing: 1 },
  filterScroll: { maxHeight: 44, marginBottom: 12 },
  filterContent: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  filterPill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  filterPillActive: { backgroundColor: '#C9A84C', borderColor: '#C9A84C' },
  filterPillText: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  filterPillTextActive: { color: '#2C2420', fontWeight: '600' },
  photoContainer: { flex: 1, position: 'relative' },
  photo: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', backgroundColor: 'rgba(10,6,3,0.85)' },
  counter: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5 },
  counterText: { fontSize: 12, color: '#F5F0E8', letterSpacing: 0.5 },
  premiumBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: '#C9A84C', borderRadius: 50, paddingHorizontal: 12, paddingVertical: 5 },
  premiumBadgeText: { fontSize: 11, color: '#2C2420', fontWeight: '700', letterSpacing: 1 },
  photoInfo: { position: 'absolute', bottom: 80, left: 24, right: 24, gap: 6 },
  photoCaption: { fontSize: 24, color: '#F5F0E8', fontWeight: '300', letterSpacing: 0.5 },
  photoVendor: { fontSize: 15, color: '#C9A84C', fontWeight: '500' },
  photoCategory: { fontSize: 12, color: '#8C7B6E' },
  viewVendorBtn: { marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start' },
  viewVendorBtnText: { fontSize: 13, color: '#F5F0E8', letterSpacing: 0.3 },
  navRow: { position: 'absolute', bottom: 24, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  navBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 24, color: '#F5F0E8' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 20, backgroundColor: '#C9A84C' },
  upgradeBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, backgroundColor: '#1A1008' },
  upgradeText: { fontSize: 12, color: '#8C7B6E', flex: 1 },
  upgradeLink: { fontSize: 13, color: '#C9A84C', fontWeight: '600' },
});