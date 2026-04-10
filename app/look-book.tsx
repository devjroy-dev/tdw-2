import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Image, ScrollView, Alert
} from 'react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

const PHOTOS = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800',
    caption: 'The Bengal Bride',
    vendor: 'Sabyasachi Mukherjee',
    category: 'Bridal Designer',
    city: 'Kolkata',
    tag: 'Designer',
    vendorId: '',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
    caption: 'Rajasthani Bridal Couture',
    vendor: 'Anita Dongre',
    category: 'Bridal Designer',
    city: 'Mumbai',
    tag: 'Designer',
    vendorId: '',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800',
    caption: 'Heritage Bridal Collection',
    vendor: 'Ritu Kumar',
    category: 'Bridal Designer',
    city: 'Delhi NCR',
    tag: 'Designer',
    vendorId: '',
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
    caption: 'The Dewy Bridal Look',
    vendor: 'Namrata Soni',
    category: 'Makeup Artist',
    city: 'Mumbai',
    tag: 'Makeup',
    vendorId: '',
  },
  {
    id: '5',
    image: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
    caption: 'Luminous Bridal Glow',
    vendor: 'Bianca Louzado',
    category: 'Makeup Artist',
    city: 'Mumbai',
    tag: 'Makeup',
    vendorId: '',
  },
  {
    id: '6',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    caption: 'Polki & Kundan Bridal Set',
    vendor: 'Hazoorilal Legacy',
    category: 'Jewellery',
    city: 'Delhi NCR',
    tag: 'Jewellery',
    vendorId: '',
  },
  {
    id: '7',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800',
    caption: 'Grand Bridal Jewellery',
    vendor: 'Tanishq Bridal',
    category: 'Jewellery',
    city: 'Mumbai',
    tag: 'Jewellery',
    vendorId: '',
  },
  {
    id: '8',
    image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800',
    caption: 'Contemporary Bridal Wear',
    vendor: 'Manish Malhotra',
    category: 'Bridal Designer',
    city: 'Mumbai',
    tag: 'Designer',
    vendorId: '',
  },
];

const FILTERS = ['All', 'Designer', 'Makeup', 'Jewellery'];

export default function LookBookScreen() {
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
          <Text style={styles.title}>Look Book</Text>
          <Text style={styles.subtitle}>India's finest designers & artists</Text>
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
            <Text style={styles.photoVendor}>{current.vendor}</Text>
            <Text style={styles.photoCategory}>{current.category} · {current.city}</Text>
            <TouchableOpacity
              style={styles.enquireBtn}
              onPress={() => router.push(`/inquiry?id=${current.vendorId}&type=inquiry`)}
            >
              <Text style={styles.enquireBtnText}>Send Enquiry →</Text>
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
          <Text style={styles.premiumTitle}>✦ Featured Collections</Text>
          <Text style={styles.premiumSub}>Upgrade to see all designer lookbooks</Text>
        </View>
        <TouchableOpacity style={styles.upgradeBtn}>
          <Text style={styles.upgradeBtnText}>Upgrade</Text>
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
  title: { fontSize: 18, color: '#2C2420', fontWeight: '400', letterSpacing: 1 },
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
  photoVendor: { fontSize: 15, color: '#C9A84C', fontWeight: '500' },
  photoCategory: { fontSize: 11, color: '#B8A99A' },
  enquireBtn: { marginTop: 8, backgroundColor: '#C9A84C', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 18, alignSelf: 'flex-start' },
  enquireBtnText: { fontSize: 13, color: '#2C2420', fontWeight: '600' },
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
  upgradeBtn: { borderWidth: 1, borderColor: '#C9A84C', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  upgradeBtnText: { fontSize: 13, color: '#C9A84C', fontWeight: '500' },
});