/**
 * Frost \u00B7 Canvas \u00B7 Discover \u00B7 Blind Swipe
 *
 * Full-bleed gestural feed. Original native discover.tsx swipe grammar:
 *   - Vertical swipe (up/down)   = next/previous VENDOR
 *   - Horizontal swipe (l/r)     = next/previous PHOTO of same vendor
 *   - Single tap                 = toggle detail overlay
 *   - Double tap                 = save to Muse
 *   - Down swipe with overlay    = dismiss overlay
 *
 * v1 stub uses 5 placeholder vendors. Real wiring uses /api/v2/discover/feed
 * (existing) and POST /api/couple/muse/save (existing) in v1.3.
 */

import React, { useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, Pressable, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart } from 'lucide-react-native';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostMotion,
} from '../../../../constants/frost';

const SWIPE_THRESHOLD = FrostMotion.swipeThreshold;
const SWIPE_VELOCITY  = 0.5;
const TAP_MAX_MOVE    = 10;
const TAP_MAX_TIME    = 250;
const DOUBLE_TAP_MS   = 280;

interface Vendor {
  id: string;
  name: string;
  city: string;
  category: string;
  priceLabel: string;
  tagline: string;
  images: string[];
}

const PLACEHOLDER_VENDORS: Vendor[] = [
  {
    id: 'v1', name: 'Arjun Kartha Studio', city: 'New Delhi', category: 'Photography',
    priceLabel: '\u20B92.5L onwards', tagline: 'Light as a love language.',
    images: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=85&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1529636798458-92182e662485?w=1200&q=85&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=85&auto=format&fit=crop',
    ],
  },
  {
    id: 'v2', name: 'Sophia Laurent Artistry', city: 'Mumbai', category: 'Makeup & Hair',
    priceLabel: '\u20B91.8L onwards', tagline: 'South Asian skin is our language.',
    images: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=85&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1200&q=85&auto=format&fit=crop',
    ],
  },
  {
    id: 'v3', name: 'House of Blooms', city: 'Bangalore', category: 'Decor',
    priceLabel: '\u20B91.5L onwards', tagline: 'Every installation, designed once \u2014 for you.',
    images: [
      'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200&q=85&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=85&auto=format&fit=crop',
    ],
  },
];

export default function BlindSwipe() {
  const insets = useSafeAreaInsets();
  const [vendorIdx, setVendorIdx] = useState(0);
  const [imageIdx, setImageIdx] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const tapCount = useRef(0);
  const lastTapTime = useRef(0);
  const tapTimer = useRef<NodeJS.Timeout | null>(null);
  const heartScale = useRef(new Animated.Value(0)).current;

  const vendor = PLACEHOLDER_VENDORS[vendorIdx];

  function goNextVendor() {
    setVendorIdx(i => (i + 1) % PLACEHOLDER_VENDORS.length);
    setImageIdx(0);
    setOverlayVisible(false);
  }
  function goPrevVendor() {
    setVendorIdx(i => (i - 1 + PLACEHOLDER_VENDORS.length) % PLACEHOLDER_VENDORS.length);
    setImageIdx(0);
    setOverlayVisible(false);
  }
  function nextImage() { setImageIdx(i => Math.min(i + 1, vendor.images.length - 1)); }
  function prevImage() { setImageIdx(i => Math.max(i - 1, 0)); }

  function handleDoubleTap() {
    setSaveToast('Saved to Muse \u2665');
    Animated.sequence([
      Animated.timing(heartScale, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(400),
      Animated.timing(heartScale, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setSaveToast(null), 1400);
    // v1.3: POST /api/couple/muse/save { couple_id, vendor_id, event:'general' }
  }
  function handleSingleTap() { setOverlayVisible(v => !v); }

  function onTouchStart(e: any) {
    const t = e.nativeEvent.touches[0];
    touchStart.current = { x: t.pageX, y: t.pageY, t: Date.now() };
  }

  function onTouchEnd(e: any) {
    if (!touchStart.current) return;
    const start = touchStart.current;
    touchStart.current = null;
    const end = e.nativeEvent.changedTouches[0];
    const dx = end.pageX - start.x;
    const dy = end.pageY - start.y;
    const dt = Date.now() - start.t;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    // Tap detection
    if (absX < TAP_MAX_MOVE && absY < TAP_MAX_MOVE && dt < TAP_MAX_TIME) {
      const now = Date.now();
      const since = now - lastTapTime.current;
      if (since < DOUBLE_TAP_MS && tapCount.current >= 1) {
        if (tapTimer.current) clearTimeout(tapTimer.current);
        tapCount.current = 0;
        handleDoubleTap();
      } else {
        tapCount.current = 1;
        lastTapTime.current = now;
        tapTimer.current = setTimeout(() => {
          if (tapCount.current === 1) handleSingleTap();
          tapCount.current = 0;
        }, DOUBLE_TAP_MS);
      }
      return;
    }

    const velocity = Math.max(absX, absY) / Math.max(dt, 1);
    const passed = Math.max(absX, absY) > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY;
    if (!passed) return;

    // Dismiss overlay on down swipe
    if (overlayVisible && absY > absX && dy > 80) {
      setOverlayVisible(false);
      return;
    }
    // Vertical \u2192 change vendor
    if (absY > absX) {
      if (dy < -SWIPE_THRESHOLD) goNextVendor();
      else if (dy > SWIPE_THRESHOLD) goPrevVendor();
    } else {
      // Horizontal \u2192 change photo
      if (dx < -SWIPE_THRESHOLD) nextImage();
      else if (dx > SWIPE_THRESHOLD) prevImage();
    }
  }

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <StatusBar barStyle="light-content" />

      <View
        style={styles.feed}
        onStartShouldSetResponder={() => true}
        onResponderGrant={onTouchStart}
        onResponderRelease={onTouchEnd}
      >
        <Image
          source={{ uri: vendor.images[imageIdx] || vendor.images[0] }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />

        {/* Image dots */}
        <View style={[styles.dotsRow, { top: insets.top + 76 }]}>
          {vendor.images.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === imageIdx && styles.dotActive]}
            />
          ))}
        </View>

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
          <View style={styles.topBarLeft}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrow}>DISCOVER \u00B7 BLIND SWIPE</Text>
          </View>
          <Pressable onPress={() => router.back()} hitSlop={16} style={styles.closeBtn}>
            <X size={22} color={FrostColors.white} strokeWidth={1.5} />
          </Pressable>
        </View>

        {/* Detail overlay */}
        {overlayVisible ? (
          <View style={styles.overlay} pointerEvents="none">
            <Text style={styles.overlayCategory}>{vendor.category.toUpperCase()}</Text>
            <Text style={styles.overlayName}>{vendor.name}</Text>
            <Text style={styles.overlayCity}>{vendor.city} \u00B7 {vendor.priceLabel}</Text>
            <Text style={styles.overlayTagline}>\u201C{vendor.tagline}\u201D</Text>
            <Text style={styles.overlayHint}>Tap again to dismiss \u00B7 swipe up for next \u00B7 double-tap to save</Text>
          </View>
        ) : null}

        {/* Heart save indicator */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.heartWrap,
            {
              opacity: heartScale,
              transform: [{ scale: heartScale.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.2] }) }],
            },
          ]}
        >
          <Heart size={64} color={FrostColors.white} fill={FrostColors.goldTrue} strokeWidth={1.5} />
        </Animated.View>

        {/* Save toast */}
        {saveToast ? (
          <View style={[styles.toast, { bottom: insets.bottom + 36 }]}>
            <Text style={styles.toastText}>{saveToast}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  feed: { flex: 1, backgroundColor: FrostColors.black },

  dotsRow: {
    position: 'absolute',
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 24, height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: FrostColors.white,
  },

  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: FrostSpace.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  topBarLeft: {
    flexDirection: 'row', alignItems: 'center', gap: FrostSpace.s,
  },
  eyebrowDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: FrostColors.white,
    opacity: 0.9,
  },
  eyebrow: {
    ...FrostType.eyebrowMedium,
    color: FrostColors.white,
    letterSpacing: 4,
  },
  closeBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },

  overlay: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: FrostSpace.xxl,
    paddingVertical: FrostSpace.huge,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayCategory: {
    fontFamily: FrostFonts.label,
    fontSize: 10,
    letterSpacing: 4,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: FrostSpace.s,
  },
  overlayName: {
    fontFamily: FrostFonts.display,
    fontSize: 32,
    color: FrostColors.white,
    fontStyle: 'italic',
    marginBottom: FrostSpace.xs,
  },
  overlayCity: {
    fontFamily: FrostFonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: FrostSpace.l,
  },
  overlayTagline: {
    fontFamily: FrostFonts.display,
    fontSize: 18,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 26,
    marginBottom: FrostSpace.xl,
  },
  overlayHint: {
    fontFamily: FrostFonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },

  heartWrap: {
    position: 'absolute',
    top: '40%',
    left: 0, right: 0,
    alignItems: 'center',
  },

  toast: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
  },
  toastText: {
    fontFamily: FrostFonts.body,
    fontSize: 14,
    color: FrostColors.white,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.s,
    borderRadius: 100,
    overflow: 'hidden',
  },
});
