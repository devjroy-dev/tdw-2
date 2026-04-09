import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

const COMPARE_VENDORS = [
  {
    id: '1',
    name: 'Joseph Radhik',
    category: 'Photographer',
    city: 'Mumbai',
    price: '₹3,00,000',
    rating: 5.0,
    reviews: 312,
    verified: true,
    vibe: ['Candid', 'Luxury'],
    delivery: '8–12 weeks',
    experience: '15 years',
    teamSize: '4 people',
  },
  {
    id: '7',
    name: 'Kapoor Wedding Films',
    category: 'Photographer',
    city: 'Mumbai',
    price: '₹1,20,000',
    rating: 4.9,
    reviews: 91,
    verified: true,
    vibe: ['Cinematic', 'Luxury'],
    delivery: '6–8 weeks',
    experience: '8 years',
    teamSize: '3 people',
  },
];

const COMPARE_FIELDS = [
  { key: 'price', label: 'Starting Price' },
  { key: 'rating', label: 'Rating' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'experience', label: 'Experience' },
  { key: 'teamSize', label: 'Team Size' },
  { key: 'city', label: 'City' },
];

export default function CompareScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Compare</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Vendor Names */}
        <View style={styles.vendorRow}>
          <View style={styles.labelCol} />
          {COMPARE_VENDORS.map(vendor => (
            <View key={vendor.id} style={styles.vendorCol}>
              <View style={styles.vendorAvatar}>
                <Text style={styles.vendorAvatarText}>{vendor.name[0]}</Text>
              </View>
              <Text style={styles.vendorName} numberOfLines={2}>{vendor.name}</Text>
              {vendor.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>✓ Verified</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* Comparison Fields */}
        {COMPARE_FIELDS.map((field, fIndex) => (
          <View key={field.key}>
            <View style={styles.compareRow}>
              <View style={styles.labelCol}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
              </View>
              {COMPARE_VENDORS.map(vendor => (
                <View key={vendor.id} style={styles.valueCol}>
                  <Text style={styles.fieldValue}>
                    {field.key === 'rating'
                      ? `★ ${vendor[field.key as keyof typeof vendor]}`
                      : String(vendor[field.key as keyof typeof vendor])}
                  </Text>
                </View>
              ))}
            </View>
            {fIndex < COMPARE_FIELDS.length - 1 && <View style={styles.rowDivider} />}
          </View>
        ))}

        {/* Vibe Tags */}
        <View style={styles.divider} />
        <View style={styles.compareRow}>
          <View style={styles.labelCol}>
            <Text style={styles.fieldLabel}>Vibe</Text>
          </View>
          {COMPARE_VENDORS.map(vendor => (
            <View key={vendor.id} style={styles.valueCol}>
              {vendor.vibe.map(v => (
                <View key={v} style={styles.vibeTag}>
                  <Text style={styles.vibeTagText}>{v}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.divider} />
        <View style={styles.compareRow}>
          <View style={styles.labelCol} />
          {COMPARE_VENDORS.map(vendor => (
            <View key={vendor.id} style={styles.valueCol}>
              <TouchableOpacity
                style={styles.selectBtn}
                onPress={() => router.push(`/vendor-profile?id=${vendor.id}`)}
              >
                <Text style={styles.selectBtnText}>View Profile</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

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
    marginBottom: 24,
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
  vendorRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  labelCol: {
    width: 90,
  },
  vendorCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  vendorAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#2C2420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vendorAvatarText: {
    fontSize: 22,
    color: '#C9A84C',
    fontWeight: '300',
  },
  vendorName: {
    fontSize: 13,
    color: '#2C2420',
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  verifiedBadge: {
    backgroundColor: '#C9A84C',
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  verifiedText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 24,
  },
  compareRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
    alignItems: 'center',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#E8E0D5',
    marginHorizontal: 24,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#8C7B6E',
    width: 90,
  },
  valueCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  fieldValue: {
    fontSize: 14,
    color: '#2C2420',
    fontWeight: '500',
    textAlign: 'center',
  },
  vibeTag: {
    borderWidth: 1,
    borderColor: '#E8E0D5',
    borderRadius: 50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 4,
  },
  vibeTagText: {
    fontSize: 11,
    color: '#8C7B6E',
  },
  selectBtn: {
    backgroundColor: '#2C2420',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  selectBtnText: {
    fontSize: 12,
    color: '#F5F0E8',
    fontWeight: '500',
  },
});