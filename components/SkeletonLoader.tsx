import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

function ShimmerBlock({ w, h, radius = 8, style = {} }: { w: number | string; h: number; radius?: number; style?: any }) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View style={[{
      width: w as any,
      height: h,
      borderRadius: radius,
      backgroundColor: '#E8E0D5',
      opacity,
    }, style]} />
  );
}

export function CardSkeleton() {
  return (
    <View style={sk.card}>
      <ShimmerBlock w="100%" h={180} radius={16} />
      <View style={sk.cardBody}>
        <ShimmerBlock w="60%" h={16} />
        <ShimmerBlock w="40%" h={12} />
        <ShimmerBlock w="80%" h={12} />
      </View>
    </View>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <View style={sk.listCard}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i}>
          <View style={sk.listRow}>
            <ShimmerBlock w={36} h={36} radius={10} />
            <View style={sk.listText}>
              <ShimmerBlock w="70%" h={14} />
              <ShimmerBlock w="45%" h={11} />
            </View>
            <ShimmerBlock w={50} h={14} />
          </View>
          {i < rows - 1 && <View style={sk.divider} />}
        </View>
      ))}
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={sk.profileWrap}>
      <ShimmerBlock w={64} h={64} radius={32} />
      <View style={sk.profileText}>
        <ShimmerBlock w="50%" h={18} />
        <ShimmerBlock w="35%" h={12} />
      </View>
    </View>
  );
}

export function GridSkeleton() {
  return (
    <View style={sk.grid}>
      <ShimmerBlock w={(width - 62) / 2} h={(width - 62) / 2} radius={16} />
      <ShimmerBlock w={(width - 62) / 2} h={(width - 62) / 2} radius={16} />
      <ShimmerBlock w={(width - 62) / 2} h={(width - 62) / 2} radius={16} />
      <ShimmerBlock w={(width - 62) / 2} h={(width - 62) / 2} radius={16} />
    </View>
  );
}

export function VendorDashSkeleton() {
  return (
    <View style={sk.dashWrap}>
      <View style={sk.kpiRow}>
        <ShimmerBlock w="30%" h={80} radius={12} />
        <ShimmerBlock w="30%" h={80} radius={12} />
        <ShimmerBlock w="30%" h={80} radius={12} />
      </View>
      <ShimmerBlock w="100%" h={140} radius={12} style={{ marginTop: 16 }} />
      <ShimmerBlock w="100%" h={100} radius={12} style={{ marginTop: 12 }} />
      <ShimmerBlock w="100%" h={100} radius={12} style={{ marginTop: 12 }} />
    </View>
  );
}

export default function SkeletonScreen() {
  return (
    <View style={sk.screen}>
      <View style={sk.header}>
        <ShimmerBlock w={36} h={36} radius={18} />
        <ShimmerBlock w={150} h={18} />
        <ShimmerBlock w={36} h={36} radius={18} />
      </View>
      <ListSkeleton rows={6} />
    </View>
  );
}

const sk = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F0E8', paddingTop: 60, paddingHorizontal: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  card: { marginHorizontal: 24, marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8E0D5', overflow: 'hidden' },
  cardBody: { padding: 16, gap: 8 },
  listCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8E0D5', overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18 },
  listText: { flex: 1, gap: 6 },
  divider: { height: 1, backgroundColor: '#E8E0D5', marginHorizontal: 18 },
  profileWrap: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#E8E0D5', marginBottom: 16 },
  profileText: { flex: 1, gap: 8 },
  grid: { paddingHorizontal: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  dashWrap: { paddingHorizontal: 24 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
