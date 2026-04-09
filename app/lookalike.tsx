import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width } = Dimensions.get('window');

const SIMILAR_VENDORS = [
  {
    id: '7',
    name: 'Kapoor Wedding Films',
    category: 'Photographer',
    city: 'Mumbai',
    price: '₹1,20,000 onwards',
    vibe: ['Cinematic', 'Luxury'],
    rating: 4.9,
    reviews: 91,
    verified: true,
    image: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
    matchScore: 94,
  },
  {
    id: '1',
    name: 'Arjun Mehta Photography',
    category: 'Photographer',
    city: 'Delhi NCR',
    price: '₹80,000 onwards',
    vibe: ['Candid', 'Cinematic'],
    rating: 4.9,
    reviews: 124,
    verified: true,
    image: 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800',
    matchScore: 89,
  },
  {
    id: '14',
    name: 'Frames by Riya',
    category: 'Photographer',
    city: 'Delhi NCR',
    price: '₹60,000 onwards',
    vibe: ['Candid', 'Boho'],
    rating: 4.7,
    reviews: 56,
    verified: false,
    image: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800',
    matchScore: 82,
  },
  {
    id: '15',
    name: 'The Wedding Story',
    category: 'Photographer',
    city: 'Mumbai',
    price: '₹95,000 onwards',
    vibe: ['Cinematic', 'Traditional'],
    rating: 4.8,
    reviews: 78,
    verified: true,
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
    matchScore: 78,
  },
];

export default function LookAlikeScreen() {
  const router = useRouter();
  const { vendorName, category } = useLocalSearchParams();

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Similar Style</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderText}>
          Vendors with similar vibe to{'\n'}
          <Text style={styles.subHeaderBold}>{vendorName || 'Joseph Radhik'}</Text>
          {' '}within your budget
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {SIMILAR_VENDORS.map(vendor => (
          <TouchableOpacity
            key={vendor.id}
            style={styles.vendorCard}
            onPress={() => router.push(`/vendor-profile?id=${vendor.id}`)}
          >
            <Image source={{ uri: vendor.image }} style={styles.vendorImage} />

            <View style={styles.matchBadge}>
              <Text style={styles.matchBadgeText}>{vendor.matchScore}% match</Text>
            </View>

            {vendor.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            )}

            <View style={styles.vendorInfo}>
              <View style={styles.vendorInfoTop}>
                <View>
                  <Text style={styles.vendorName}>{vendor.name}</Text>
                  <Text style={styles.vendorCity}>{vendor.city}</Text>
                </View>
                <View style={styles.ratingBadge}>
                  <Text style={styles.ratingText}>★ {vendor.rating}</Text>
                </View>
              </View>
              <View style={styles.vendorInfoBottom}>
                <Text style={styles.vendorPrice}>{vendor.price}</Text>
                <View style={styles.vibeTags}>
                  {vendor.vibe.slice(0, 2).map(v => (
                    <View key={v} style={styles.vibeTag}>
                      <Text style={styles.vibeTagText}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  backBtn: {
    fontSize: 22,
    color: '#2C2420',
    width: 24,
  },
  title: {
    fontSize: 17,
    color: '#2C2420',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  subHeader: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  subHeaderText: {
    fontSize: 14,
    color: '#8C7B6E',
    lineHeight: 22,
  },
  subHeaderBold: {
    color: '#2C2420',
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  vendorCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  vendorImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  matchBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#2C2420',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  matchBadgeText: {
    fontSize: 11,
    color: '#C9A84C',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  verifiedBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#C9A84C',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  vendorInfo: {
    padding: 16,
    gap: 10,
  },
  vendorInfoTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  vendorName: {
    fontSize: 16,
    color: '#2C2420',
    fontWeight: '500',
  },
  vendorCity: {
    fontSize: 12,
    color: '#8C7B6E',
    marginTop: 2,
  },
  ratingBadge: {
    backgroundColor: '#C9A84C',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  vendorInfoBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorPrice: {
    fontSize: 14,
    color: '#2C2420',
    fontWeight: '500',
  },
  vibeTags: {
    flexDirection: 'row',
    gap: 6,
  },
  vibeTag: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  vibeTagText: {
    fontSize: 11,
    color: '#8C7B6E',
  },
});