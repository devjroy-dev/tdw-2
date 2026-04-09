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
    name: 'Joseph Radhik',
    category: 'Photographer',
    city: 'Mumbai',
    price: '₹3,00,000 onwards',
    vibe: ['Candid', 'Luxury'],
    rating: 5.0,
    reviews: 312,
    verified: true,
    instagram: '@josephradhik',
    about: 'One of India\'s most celebrated wedding photographers. Known for capturing raw, emotional moments with a cinematic touch. Has shot weddings across India, Europe and Southeast Asia for some of the country\'s most prominent families.',
    equipment: 'Leica, Nikon D6, DJI Inspire 2',
    delivery: '8–12 weeks post wedding',
    images: [
      'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800',
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800',
    ],
    videoReviews: [
      { id: '1', client: 'Priya & Rahul', rating: 5, thumbnail: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400' },
      { id: '2', client: 'Ananya & Dev', rating: 5, thumbnail: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=400' },
    ],
  },
  '2': {
    id: '2',
    name: 'The Leela Palace',
    category: 'Venue',
    city: 'Delhi NCR',
    price: '₹15,00,000 onwards',
    vibe: ['Luxury', 'Royal'],
    rating: 4.9,
    reviews: 189,
    verified: true,
    instagram: '@theleela',
    about: 'The Leela Palace New Delhi is one of India\'s finest luxury hotels offering spectacular wedding venues. From grand ballrooms to lush gardens, every space is designed to make your celebration truly unforgettable.',
    equipment: 'Capacity: 50–2000 guests · Indoor & Outdoor · In-house catering',
    delivery: 'In-house catering & décor included',
    images: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
      'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=800',
      'https://images.unsplash.com/photo-1510076857177-7470076d4098?w=800',
    ],
    videoReviews: [
      { id: '1', client: 'Sneha & Arjun', rating: 5, thumbnail: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=400' },
    ],
  },
  '3': {
    id: '3',
    name: 'Namrata Soni',
    category: 'MUA',
    city: 'Mumbai',
    price: '₹1,50,000 onwards',
    vibe: ['Luxury', 'Cinematic'],
    rating: 4.9,
    reviews: 445,
    verified: true,
    instagram: '@namratasoni',
    about: 'Celebrity makeup artist to Bollywood\'s finest. Namrata Soni has worked with Deepika Padukone, Sonam Kapoor and countless brides seeking that perfect, camera-ready look. Known for her flawless skin finish and editorial eye.',
    equipment: 'Charlotte Tilbury, La Mer, Armani Beauty, NARS',
    delivery: 'Trial session included · Team available for full wedding party',
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

        {/* Gallery */}
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

        <View style={styles.content}>

          {/* Name & Rating */}
          <View style={styles.nameRow}>
            <View style={styles.nameCol}>
              <View style={styles.nameWithBadge}>
                <Text style={styles.vendorName}>{vendor.name}</Text>
                {vendor.verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓</Text>
                  </View>
                )}
              </View>
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
        <TouchableOpacity
          style={styles.quoteBtn}
          onPress={() => router.push(`/inquiry?id=${vendor.id}&type=quote`)}
        >
          <Text style={styles.quoteBtnText}>Request Quote</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.inquiryBtn}
          onPress={() => router.push(`/inquiry?id=${vendor.id}&type=inquiry`)}
        >
          <Text style={styles.inquiryBtnText}>Send Inquiry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.lockBtn}
          onPress={() => router.push(`/payment?id=${vendor.id}`)}
        >
          <Text style={styles.lockBtnText}>Lock the Date</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F0E8',
  },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(245,240,232,0.92)',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 18,
    color: '#2C2420',
  },
  heartBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(245,240,232,0.92)',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBtnActive: {
    backgroundColor: '#2C2420',
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
    backgroundColor: '#E8E0D5',
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
  nameWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vendorName: {
    fontSize: 22,
    color: '#2C2420',
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  verifiedBadge: {
    backgroundColor: '#C9A84C',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
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
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E0D5',
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
    color: '#2C2420',
    lineHeight: 24,
  },
  detailsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E0D5',
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
    backgroundColor: '#E8E0D5',
    marginHorizontal: 16,
  },
  detailKey: {
    fontSize: 13,
    color: '#8C7B6E',
  },
  detailVal: {
    fontSize: 13,
    color: '#2C2420',
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
    borderColor: '#E8E0D5',
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
    color: '#F5F0E8',
    fontSize: 10,
  },
  reviewInfo: {
    padding: 10,
    gap: 3,
  },
  reviewClient: {
    fontSize: 12,
    color: '#2C2420',
    fontWeight: '500',
  },
  reviewRating: {
    fontSize: 10,
    color: '#C9A84C',
  },
  lookalikeBtn: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#F5F0E8',
    borderTopWidth: 1,
    borderTopColor: '#E8E0D5',
  },
  quoteBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  quoteBtnText: {
    fontSize: 12,
    color: '#2C2420',
    fontWeight: '500',
  },
  inquiryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  inquiryBtnText: {
    fontSize: 12,
    color: '#2C2420',
    fontWeight: '500',
  },
  lockBtn: {
    flex: 1,
    backgroundColor: '#2C2420',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  lockBtnText: {
    fontSize: 12,
    color: '#F5F0E8',
    fontWeight: '500',
  },
});