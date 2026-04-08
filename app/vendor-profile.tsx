import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Image
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

const MOCK_VENDOR_DETAILS: Record<string, any> = {
  '1': {
    id: '1',
    name: 'Arjun Mehta Photography',
    category: 'Photographer',
    city: 'Delhi NCR',
    price: '₹80,000 onwards',
    vibe: ['Candid', 'Cinematic'],
    rating: 4.9,
    reviews: 124,
    instagram: '@arjunmehta.photos',
    about: 'Award-winning wedding photographer with 8 years of experience capturing candid, emotional moments. Specialising in cinematic films and editorial photography across India.',
    equipment: 'Sony A7IV, Canon R5, DJI Drone',
    delivery: '4–6 weeks post wedding',
    images: [
      'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800',
    ],
    videoReviews: [
      { id: '1', client: 'Priya & Rahul', rating: 5, thumbnail: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400' },
      { id: '2', client: 'Sneha & Arjun', rating: 5, thumbnail: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=400' },
    ],
  },
  '2': {
    id: '2',
    name: 'The Grand Celebration',
    category: 'Venue',
    city: 'Delhi NCR',
    price: '₹5,00,000 onwards',
    vibe: ['Luxury', 'Royal'],
    rating: 4.8,
    reviews: 89,
    instagram: '@thegrandcelebration',
    about: 'A luxury banquet and farmhouse venue spread across 5 acres in South Delhi. Capacity for up to 2000 guests with in-house catering and décor services.',
    equipment: 'Capacity: 500–2000 guests · Indoor & Outdoor',
    delivery: 'In-house catering included',
    images: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
      'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800',
      'https://images.unsplash.com/photo-1510076857177-7470076d4098?w=800',
    ],
    videoReviews: [
      { id: '1', client: 'Ananya & Dev', rating: 5, thumbnail: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400' },
    ],
  },
  '3': {
    id: '3',
    name: 'Priya Bridal Studio',
    category: 'MUA',
    city: 'Delhi NCR',
    price: '₹25,000 onwards',
    vibe: ['Traditional', 'Luxury'],
    rating: 4.7,
    reviews: 203,
    instagram: '@priyabridalstudio',
    about: 'Delhi\'s most sought-after bridal makeup artist with over 500 brides. Specialising in HD bridal, airbrush, and traditional looks using luxury international brands.',
    equipment: 'MAC, Huda Beauty, Charlotte Tilbury, NARS',
    delivery: 'Trial session included',
    images: [
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
      'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=800',
      'https://images.unsplash.com/photo-1616683693504-3ea7e9ad6fec?w=800',
    ],
    videoReviews: [
      { id: '1', client: 'Riya & Karan', rating: 5, thumbnail: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400' },
    ],
  },
};

export default function VendorProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [hearted, setHearted] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const vendor = MOCK_VENDOR_DETAILS[id as string] || MOCK_VENDOR_DETAILS['1'];

  return (
    <View style={styles.container}>

      {/* Floating Back & Heart */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>←</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.heartBtn, hearted && styles.heartBtnActive]}
        onPress={() => setHearted(!hearted)}
      >
        <Text style={[styles.heartBtnText, hearted && styles.heartBtnTextActive]}>
          {hearted ? '♥' : '♡'}
        </Text>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Image Gallery */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={e => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setActiveImage(index);
          }}
          scrollEventThrottle={16}
        >
          {vendor.images.map((img: string, i: number) => (
            <Image key={i} source={{ uri: img }} style={styles.galleryImage} />
          ))}
        </ScrollView>

        {/* Dots */}
        <View style={styles.dots}>
          {vendor.images.map((_: any, i: number) => (
            <View key={i} style={[styles.dot, activeImage === i && styles.dotActive]} />
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>

          {/* Name & Rating */}
          <View style={styles.nameRow}>
            <View style={styles.nameCol}>
              <Text style={styles.vendorName}>{vendor.name}</Text>
              <Text style={styles.vendorMeta}>{vendor.category} · {vendor.city}</Text>
            </View>
            <View style={styles.ratingBox}>
              <Text style={styles.ratingScore}>★ {vendor.rating}</Text>
              <Text style={styles.ratingCount}>{vendor.reviews} reviews</Text>
            </View>
          </View>

          {/* Price & Vibe */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{vendor.price}</Text>
            <View style={styles.vibeTags}>
              {vendor.vibe.map((v: string) => (
                <View key={v} style={styles.vibeTag}>
                  <Text style={styles.vibeTagText}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.sectionText}>{vendor.about}</Text>
          </View>

          <View style={styles.divider} />

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Details</Text>
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Equipment</Text>
                <Text style={styles.detailVal}>{vendor.equipment}</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Delivery</Text>
                <Text style={styles.detailVal}>{vendor.delivery}</Text>
              </View>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Instagram</Text>
                <Text style={[styles.detailVal, styles.instagram]}>{vendor.instagram}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Reviews */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Client Reviews</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.reviewRow}>
                {vendor.videoReviews.map((review: any) => (
                  <TouchableOpacity key={review.id} style={styles.reviewCard}>
                    <Image source={{ uri: review.thumbnail }} style={styles.reviewThumb} />
                    <View style={styles.playBtn}>
                      <Text style={styles.playBtnText}>▶</Text>
                    </View>
                    <View style={styles.reviewInfo}>
                      <Text style={styles.reviewClient}>{review.client}</Text>
                      <Text style={styles.reviewRating}>{'★'.repeat(review.rating)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Look-alike */}
          <TouchableOpacity style={styles.lookalikeBtn}>
            <Text style={styles.lookalikeBtnText}>Find similar style in my budget →</Text>
          </TouchableOpacity>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.inquiryBtn}>
          <Text style={styles.inquiryBtnText}>Send Inquiry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.lockBtn}>
          <Text style={styles.lockBtnText}>Lock the Date</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(250,246,240,0.92)',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 18,
    color: '#1C1C1C',
  },
  heartBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(250,246,240,0.92)',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBtnActive: {
    backgroundColor: '#1C1C1C',
  },
  heartBtnText: {
    fontSize: 16,
    color: '#8C7B6E',
  },
  heartBtnTextActive: {
    color: '#C9A84C',
  },
  galleryImage: {
    width,
    height: height * 0.48,
    resizeMode: 'cover',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 12,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E8DDD4',
  },
  dotActive: {
    backgroundColor: '#C9A84C',
    width: 16,
  },
  content: {
    paddingHorizontal: 24,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  nameCol: {
    flex: 1,
    gap: 4,
  },
  vendorName: {
    fontSize: 22,
    color: '#1C1C1C',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  vendorMeta: {
    fontSize: 13,
    color: '#8C7B6E',
  },
  ratingBox: {
    alignItems: 'flex-end',
    gap: 2,
  },
  ratingScore: {
    fontSize: 15,
    color: '#C9A84C',
    fontWeight: '600',
  },
  ratingCount: {
    fontSize: 11,
    color: '#8C7B6E',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  price: {
    fontSize: 16,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  vibeTags: {
    flexDirection: 'row',
    gap: 6,
  },
  vibeTag: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  vibeTagText: {
    fontSize: 11,
    color: '#8C7B6E',
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#EDE8E3',
  },
  section: {
    paddingVertical: 20,
    gap: 12,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  sectionText: {
    fontSize: 14,
    color: '#1C1C1C',
    lineHeight: 22,
  },
  detailsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E8DDD4',
    marginHorizontal: 16,
  },
  detailKey: {
    fontSize: 13,
    color: '#8C7B6E',
  },
  detailVal: {
    fontSize: 13,
    color: '#1C1C1C',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  instagram: {
    color: '#C9A84C',
  },
  reviewRow: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewCard: {
    width: 140,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DDD4',
  },
  reviewThumb: {
    width: 140,
    height: 100,
    resizeMode: 'cover',
  },
  playBtn: {
    position: 'absolute',
    top: 36,
    left: 56,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playBtnText: {
    color: '#FAF6F0',
    fontSize: 10,
  },
  reviewInfo: {
    padding: 10,
    gap: 3,
  },
  reviewClient: {
    fontSize: 12,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  reviewRating: {
    fontSize: 10,
    color: '#C9A84C',
  },
  lookalikeBtn: {
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#FFFFFF',
  },
  lookalikeBtnText: {
    fontSize: 13,
    color: '#C9A84C',
    letterSpacing: 0.3,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 32,
    backgroundColor: '#FAF6F0',
    borderTopWidth: 1,
    borderTopColor: '#EDE8E3',
  },
  inquiryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8DDD4',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  inquiryBtnText: {
    fontSize: 14,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  lockBtn: {
    flex: 1,
    backgroundColor: '#1C1C1C',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
  },
  lockBtnText: {
    fontSize: 14,
    color: '#FAF6F0',
    fontWeight: '500',
  },
});