import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Image, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getVendor } from '../services/api';

const { width, height } = Dimensions.get('window');

export default function VendorProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [vendor, setVendor] = useState<any>(null);
  const [hearted, setHearted] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVendor();
  }, [id]);

  const loadVendor = async () => {
    try {
      setLoading(true);
      const result = await getVendor(id as string);
      if (result.success) {
        setVendor(result.data);
      }
    } catch (error) {
      console.log('Error loading vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C9A84C" />
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Vendor not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const images = vendor.portfolio_images || [];

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
        {images.length > 0 ? (
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
            {images.map((img: string, i: number) => (
              <Image key={i} source={{ uri: img }} style={styles.galleryImage} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderText}>{vendor.name[0]}</Text>
          </View>
        )}

        {/* Dots */}
        {images.length > 1 && (
          <View style={styles.dots}>
            {images.map((_: any, i: number) => (
              <View key={i} style={[styles.dot, activeImage === i && styles.dotActive]} />
            ))}
          </View>
        )}

        <View style={styles.content}>

          <View style={styles.nameRow}>
            <View style={styles.nameCol}>
              <View style={styles.nameWithBadge}>
                <Text style={styles.vendorName}>{vendor.name}</Text>
                {vendor.is_verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={styles.vendorMeta}>{vendor.category} · {vendor.city}</Text>
            </View>
            <View style={styles.ratingBox}>
              <Text style={styles.ratingScore}>★ {vendor.rating}</Text>
              <Text style={styles.ratingCount}>{vendor.review_count} reviews</Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.price}>
              ₹{(vendor.starting_price / 100000).toFixed(0)}L onwards
            </Text>
            <View style={styles.vibeTags}>
              {vendor.vibe_tags?.map((v: string) => (
                <View key={v} style={styles.vibeTag}>
                  <Text style={styles.vibeTagText}>{v}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>About</Text>
            <Text style={styles.sectionText}>{vendor.about}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Details</Text>
            <View style={styles.detailsList}>
              {vendor.equipment && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Equipment</Text>
                    <Text style={styles.detailVal}>{vendor.equipment}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                </>
              )}
              {vendor.delivery_time && (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailKey}>Delivery</Text>
                    <Text style={styles.detailVal}>{vendor.delivery_time}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                </>
              )}
              {vendor.instagram_url && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailKey}>Instagram</Text>
                  <Text style={[styles.detailVal, styles.instagram]}>{vendor.instagram_url}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Find Similar</Text>
            <TouchableOpacity
              style={styles.lookalikeBtn}
              onPress={() => router.push(`/lookalike?vendorName=${vendor.name}&category=${vendor.category}`)}
            >
              <Text style={styles.lookalikeBtnText}>Find similar style in my budget →</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F0E8',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8C7B6E',
  },
  backLink: {
    fontSize: 14,
    color: '#C9A84C',
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
  placeholderImage: {
    width,
    height: height * 0.48,
    backgroundColor: '#2C2420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 80,
    color: '#C9A84C',
    fontWeight: '300',
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
  lookalikeBtn: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
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