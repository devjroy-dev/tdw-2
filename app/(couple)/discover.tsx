/**
 * TDW Native V7 — Couple Discover (Hub)
 * Exact port of web/app/couple/discover/hub/page.tsx
 *
 * This is the hub screen. Cards navigate to the immersive feed.
 * Gesture grammar (in feed): vertical=next vendor, horizontal=next photo,
 * single tap=detail overlay, double tap=save to Muse.
 *
 * Endpoints:
 *   GET /api/v2/discover/feed?user_id=:id
 *   GET /api/v2/discover/featured
 *   GET /api/v2/discover/blind-swipe?user_id=:id
 *   POST /api/couple/muse/save
 *   GET /api/vendors/search?q=:q
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Modal, FlatList, Image, Dimensions,
  Animated, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Radius, RAILWAY_URL } from '../../constants/tokens';
import * as Haptics from 'expo-haptics';

const API = RAILWAY_URL;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Seed vendors (mirrors web/lib/seed/discoverySeed.ts) ─────────────────────

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1080&q=80&auto=format&fit=crop`;

const SEED_VENDORS = [
  {
    id: 'a1b2c3d4-0001-4000-8000-000000000001',
    name: 'Arjun Kartha Studio',
    city: 'New Delhi', category: 'photographer', categoryLabel: 'Photography',
    priceFrom: 250000, priceLabel: '₹2.5L onwards',
    tagline: 'Light as a love language.',
    images: [img('1519741497674-611481863552'), img('1529636798458-92182e662485'), img('1519225421980-715cb0215aed')],
  },
  {
    id: 'a1b2c3d4-0002-4000-8000-000000000002',
    name: 'Sophia Laurent Artistry',
    city: 'Mumbai', category: 'mua', categoryLabel: 'Makeup & Hair',
    priceFrom: 180000, priceLabel: '₹1.8L onwards',
    tagline: 'South Asian skin is our language.',
    images: [img('1522337360788-8b13dee7a37e'), img('1487412947147-5cebf100ffc2'), img('1516975080664-ed2fc6a32937')],
  },
  {
    id: 'a1b2c3d4-0003-4000-8000-000000000003',
    name: 'House of Blooms',
    city: 'Bangalore', category: 'decorator', categoryLabel: 'Decor',
    priceFrom: 150000, priceLabel: '₹1.5L onwards',
    tagline: 'Every installation is designed once, for you.',
    images: [img('1478146896981-b80fe463b330'), img('1464366400600-7168b8af9bc3'), img('1510076857177-7470076d4098')],
  },
  {
    id: 'a1b2c3d4-0004-4000-8000-000000000004',
    name: 'Ashford Estate',
    city: 'Pune', category: 'venue', categoryLabel: 'Venue',
    priceFrom: 300000, priceLabel: '₹3L onwards',
    tagline: 'The kind of venue photographs remember.',
    images: [img('1519167758481-83f550bb49b3'), img('1464366400600-7168b8af9bc3'), img('1478146896981-b80fe463b330')],
  },
  {
    id: 'a1b2c3d4-0005-4000-8000-000000000005',
    name: 'Riya Mehta Couture',
    city: 'New Delhi', category: 'designer', categoryLabel: 'Designer',
    priceFrom: 85000, priceLabel: '₹85K onwards',
    tagline: 'Hand embroidered in our Delhi atelier.',
    images: [img('1537633552985-df8429e8048b'), img('1522673607200-164d1b6ce486'), img('1519741497674-611481863552')],
  },
  {
    id: 'a1b2c3d4-0006-4000-8000-000000000006',
    name: 'The Wedding Salad',
    city: 'Mumbai', category: 'event_manager', categoryLabel: 'Event Management',
    priceFrom: 200000, priceLabel: '₹2L onwards',
    tagline: 'Obsessive about logistics so you do not have to be.',
    images: [img('1511795409834-ef04bbd61622'), img('1519741497674-611481863552'), img('1464366400600-7168b8af9bc3')],
  },
];

// ─── Save to Muse helper ──────────────────────────────────────────────────────

async function saveVendorToMuse(vendorId: string, userId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API}/api/couple/muse/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ couple_id: userId, vendor_id: vendorId, event: 'general' }),
    });
    const json = await res.json();
    return json.success === true;
  } catch { return false; }
}

// ─── Image dots ───────────────────────────────────────────────────────────────

function ImageDots({ total, current }: { total: number; current: number }) {
  if (total <= 1) return null;
  return (
    <View style={styles.dotsContainer}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, i === current && styles.dotActive]} />
      ))}
    </View>
  );
}

// ─── Discover Feed (immersive fullscreen) ─────────────────────────────────────

function DiscoverFeed({ onClose, userId, mode }: {
  onClose: () => void;
  userId: string;
  mode: 'feed' | 'blind';
}) {
  const insets = useSafeAreaInsets();
  const [vendors, setVendors] = useState<any[]>([]);
  const [vendorIdx, setVendorIdx] = useState(0);
  const [imageIdx, setImageIdx] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [saveToast, setSaveToast] = useState('');

  // Fetch live vendor feed from backend — fall back to seed if fails
  useEffect(() => {
    const endpoint = mode === 'blind'
      ? `${API}/api/v2/discover/blind-swipe?user_id=${userId}`
      : `${API}/api/v2/discover/feed?user_id=${userId}`;
    fetch(endpoint)
      .then(r => r.json())
      .then(d => {
        const raw = Array.isArray(d) ? d : (d?.data || d?.vendors || []);
        if (raw.length === 0) { setVendors([]); return; }
        const mapped = raw.map((v: any) => ({
          id: v.id,
          name: mode === 'blind' ? '— — —' : (v.name || v.vendor_name || 'Vendor'),
          city: v.city || '',
          category: v.category || '',
          categoryLabel: v.category_label || v.category || '',
          priceFrom: mode === 'blind' ? 0 : (v.starting_price || v.priceFrom || 0),
          priceLabel: mode === 'blind' ? '' : (v.starting_price ? `₹${(v.starting_price / 100000).toFixed(1)}L onwards` : ''),
          tagline: v.tagline || v.about?.slice(0, 60) || '',
          images: [
            ...(v.photos || []),
            ...(v.featured_photos || []),
            ...(v.portfolio_images || []),
          ].filter(Boolean).slice(0, 6),
        })).filter((v: any) => v.images.length > 0);
        if (mapped.length > 0) setVendors(mapped);
      })
      .catch(() => { if (vendors.length === 0) setVendors(SEED_VENDORS); }); // seed only on error
  }, [userId, mode]);

  const touchStart = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastTapTime = useRef(0);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const SWIPE_THRESHOLD = 45;
  const SWIPE_VELOCITY = 0.3;
  const TAP_MAX_MOVE = 10;
  const TAP_MAX_TIME = 250;
  const DOUBLE_TAP_MS = 280;

  const vendor = vendors[vendorIdx] || vendors[0];

  // Loading state while fetch is in flight
  if (!vendor) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0C0A09', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: 'CormorantGaramond_300Light', fontSize: 22, color: '#F8F7F5', fontStyle: 'italic' }}>
          Finding makers for you…
        </Text>
      </View>
    );
  }

  function goNextVendor() {
    setVendorIdx(i => (i + 1) % vendors.length);
    setImageIdx(0);
    setOverlayVisible(false);
  }
  function goPrevVendor() {
    setVendorIdx(i => (i - 1 + vendors.length) % vendors.length);
    setImageIdx(0);
    setOverlayVisible(false);
  }
  function nextImage() { setImageIdx(i => Math.min(i + 1, vendor.images.length - 1)); }
  function prevImage() { setImageIdx(i => Math.max(i - 1, 0)); }

  async function handleDoubleTap() {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    const ok = await saveVendorToMuse(vendor.id, userId);
    setSaveToast(ok ? 'Saved to Muse ♥' : 'Already in Muse');
    setTimeout(() => setSaveToast(''), 2200);
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

    if (mode === 'blind') {
      if (absX > absY) {
        if (dx > SWIPE_THRESHOLD) {
          handleDoubleTap();
          goNextVendor();
        } else if (dx < -SWIPE_THRESHOLD) {
          goNextVendor();
        }
      }
      return;
    }

    // Dismiss overlay on down swipe
    if (overlayVisible && absY > absX && dy > 80) {
      setOverlayVisible(false); return;
    }
    // Vertical → change vendor
    if (absY > absX) {
      if (dy < -SWIPE_THRESHOLD) goNextVendor();
      else if (dy > SWIPE_THRESHOLD) goPrevVendor();
    } else {
      // Horizontal → change photo
      if (dx < -SWIPE_THRESHOLD) nextImage();
      else if (dx > SWIPE_THRESHOLD) prevImage();
    }
  }

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <View
        style={styles.feedContainer}
        onStartShouldSetResponder={() => true}
        onResponderGrant={onTouchStart}
        onResponderRelease={onTouchEnd}
      >
        {/* Photo */}
        <Image
          source={{ uri: vendor.images[imageIdx] || vendor.images[0] }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />

        {/* Gradient overlay */}
        <View style={styles.feedGradient} pointerEvents="none" />

        {/* Image dots */}
        <ImageDots total={vendor.images.length} current={imageIdx} />

        {/* Close button */}
        <TouchableOpacity
          style={[styles.feedCloseBtn, { top: insets.top + 16 }]}
          onPress={onClose}
        >
          <Text style={styles.feedCloseBtnText}>‹</Text>
        </TouchableOpacity>

        {/* Blind mode pill */}
        {mode === 'blind' && (
          <View style={[styles.blindPill, { top: insets.top + 20 }]}>
            <Text style={styles.blindPillText}>Blind</Text>
          </View>
        )}

        {/* Hint text (normal mode, no overlay) */}
        {mode !== 'blind' && !overlayVisible && (
          <View style={[styles.hintContainer, { bottom: insets.bottom + 28 }]} pointerEvents="none">
            <Text style={styles.hintText}>Tap · Double-tap to save · Swipe to browse</Text>
          </View>
        )}

        {/* Blind hint */}
        {mode === 'blind' && (
          <View style={[styles.hintContainer, { bottom: insets.bottom + 28 }]} pointerEvents="none">
            <Text style={styles.hintText}>Swipe right to save · Swipe left to pass</Text>
          </View>
        )}

        {/* Save toast */}
        {saveToast ? (
          <View style={styles.saveToast} pointerEvents="none">
            <Text style={styles.saveToastText}>{saveToast}</Text>
          </View>
        ) : null}

        {/* Glass overlay — single tap shows vendor detail */}
        {mode !== 'blind' && overlayVisible && (
          <TouchableOpacity
            style={[styles.glassOverlay, { paddingBottom: insets.bottom + 24 }]}
            activeOpacity={1}
            onPress={() => setOverlayVisible(false)}
          >
            <View style={styles.glassHandle} />
            <Text style={styles.glassCategory}>{vendor.categoryLabel} · {vendor.city}</Text>
            <Text style={styles.glassName}>{vendor.name}</Text>
            <Text style={styles.glassTagline}>{vendor.tagline}</Text>
            <Text style={styles.glassPrice}>{vendor.priceLabel}</Text>

            <View style={styles.glassActions}>
              <TouchableOpacity
                style={styles.enquireBtn}
                onPress={() => {
                  setOverlayVisible(false);
                  setSaveToast('Enquiry coming soon');
                  setTimeout(() => setSaveToast(''), 2200);
                }}
              >
                <Text style={styles.enquireBtnText}>Enquire</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Capsule Card (hub) ───────────────────────────────────────────────────────

function CapsuleCard({ title, subtitle, onPress, comingSoon, hasChevron }: {
  title: string; subtitle: string; onPress: () => void;
  comingSoon?: boolean; hasChevron?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.capsuleCard} onPress={onPress} activeOpacity={0.85}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Text style={styles.capsuleTitle}>{title}</Text>
          {comingSoon && (
            <View style={styles.soonBadge}>
              <Text style={styles.soonBadgeText}>Soon</Text>
            </View>
          )}
        </View>
        <Text style={styles.capsuleSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.capsuleChevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Coming Soon Modal ────────────────────────────────────────────────────────

function ComingSoonModal({ card, onClose }: { card: 'couture' | 'curated'; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const c = card === 'couture'
    ? {
        icon: '✦', title: 'Couture',
        tagline: 'Ultra-premium wedding fashion, curated for you.',
        description: 'The finest Indian bridal designers. Bespoke lehengas, heritage jewellery, and couture looks — all in one place. Appointment-only. Invitation-only.',
        badge: 'Launching Q3 2026', cta: 'Request Early Access',
      }
    : {
        icon: '◈', title: 'Curated Packages',
        tagline: 'Your entire wedding, handled.',
        description: 'Full-service wedding packages from ₹25 lakhs. One booking covers your venue, photography, décor, catering, and more — handpicked and coordinated by TDW.',
        badge: 'Coming Soon', cta: 'Notify Me',
      };

  return (
    <Modal visible animationType="slide" transparent>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.csSheeet, { paddingBottom: insets.bottom + 36 }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.csRow}>
          <Text style={styles.csIcon}>{c.icon}</Text>
          <View style={styles.csBadge}><Text style={styles.csBadgeText}>{c.badge}</Text></View>
        </View>
        <Text style={styles.csTitle}>{c.title}</Text>
        <Text style={styles.csTagline}>{c.tagline}</Text>
        <View style={styles.csDivider} />
        <Text style={styles.csDesc}>{c.description}</Text>
        <TouchableOpacity style={styles.csCTA} onPress={onClose}>
          <Text style={styles.csCTAText}>{c.cta}</Text>
        </TouchableOpacity>
        <Text style={styles.csCaption}>We'll let you know the moment it's ready.</Text>
      </View>
    </Modal>
  );
}

// ─── Hub Main ─────────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const [session, setSession] = useState<{ id: string } | null>(null);
  const [feedVisible, setFeedVisible] = useState(false);
  const [feedMode, setFeedMode] = useState<'feed' | 'blind'>('feed');
  const [comingSoonModal, setComingSoonModal] = useState<'couture' | 'curated' | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('couple_session') || await AsyncStorage.getItem('couple_web_session') || '';
        if (!raw) return;
        const s = JSON.parse(raw);
        if (s?.id) setSession(s);
      } catch {}
    })();
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQ(q);
    if (q.trim().length >= 2) {
      try {
        const res = await fetch(`${API}/api/vendors/search?q=${encodeURIComponent(q.trim())}`);
        const json = await res.json();
        setSearchResults(json.success ? json.data : []);
        setShowResults(true);
      } catch { setSearchResults([]); }
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, []);

  if (!session) return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: Fonts.body, color: Colors.muted, fontSize: 13 }}>Loading...</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* Full-screen feed modal */}
      {feedVisible && (
        <Modal visible animationType="fade" statusBarTranslucent>
          <DiscoverFeed
            onClose={() => setFeedVisible(false)}
            userId={session.id}
            mode={feedMode}
          />
        </Modal>
      )}

      {comingSoonModal && (
        <ComingSoonModal card={comingSoonModal} onClose={() => setComingSoonModal(null)} />
      )}

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={searchQ}
            onChangeText={handleSearch}
            placeholder="Search for a Maker by name..."
            placeholderTextColor={Colors.muted}
            style={styles.searchInput}
          />
          {showResults && searchResults.length > 0 && (
            <View style={styles.searchDropdown}>
              {searchResults.map((v: any) => (
                <TouchableOpacity
                  key={v.id}
                  style={styles.searchResult}
                  onPress={() => {
                    setShowResults(false);
                    setSearchQ('');
                    setFeedMode('feed');
                    setFeedVisible(true);
                  }}
                >
                  <View>
                    <Text style={styles.searchResultName}>{v.name}</Text>
                    <Text style={styles.searchResultSub}>
                      {v.category}{v.city ? ` · ${v.city}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.searchResultArrow}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Header */}
        <View style={{ marginBottom: 28 }}>
          <Text style={styles.discoverGold}>Discover</Text>
          <Text style={styles.discoverTitle}>Find your Makers</Text>
          <Text style={styles.discoverSub}>Curated wedding professionals, carefully invited.</Text>
        </View>

        {/* Cards */}
        <CapsuleCard
          title="My Feed"
          subtitle="Algo-matched makers for your wedding"
          onPress={() => { setFeedMode('feed'); setFeedVisible(true); }}
        />
        <CapsuleCard
          title="Blind Swipe"
          subtitle="Discover without names or prices — pure craft"
          onPress={() => { setFeedMode('blind'); setFeedVisible(true); }}
        />
        <CapsuleCard
          title="Featured"
          subtitle="Prestige Makers, premium work, ₹2L+"
          onPress={() => { setFeedMode('feed'); setFeedVisible(true); }}
        />
        <CapsuleCard
          title="Couture"
          subtitle="Invitation-only bridal fashion & jewellery"
          onPress={() => setComingSoonModal('couture')}
        />
        <CapsuleCard
          title="Categories"
          subtitle="Photographers, venues, MUA, decor & more"
          onPress={() => { setFeedMode('feed'); setFeedVisible(true); }}
        />
        <CapsuleCard
          title="Curated Packages"
          subtitle="Full-service wedding packages from ₹25L"
          onPress={() => setComingSoonModal('curated')}
          comingSoon
        />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Feed
  feedContainer: { flex: 1, backgroundColor: '#0C0A09' },
  feedGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
    // gradient approximation — dark at top and bottom
    opacity: 1,
  },
  dotsContainer: {
    position: 'absolute', top: 20, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 4,
  },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: 'rgba(255,255,255,0.9)', width: 16 },
  feedCloseBtn: {
    position: 'absolute', left: 16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 25,
  },
  feedCloseBtnText: { color: 'rgba(255,255,255,0.9)', fontSize: 22, lineHeight: 28 },
  blindPill: {
    position: 'absolute', right: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
    zIndex: 25,
  },
  blindPillText: { fontFamily: Fonts.label, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' },
  hintContainer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hintText: { fontFamily: Fonts.label, fontSize: 9, fontWeight: '200', letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' },
  saveToast: {
    position: 'absolute', top: 80, alignSelf: 'center',
    backgroundColor: 'rgba(17,17,17,0.75)', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 8,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 9998,
  },
  saveToastText: { fontFamily: Fonts.label, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: 'rgba(248,247,245,0.9)' },
  glassOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(12,10,9,0.82)',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingTop: 12,
  },
  glassHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  glassCategory: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 2.2, textTransform: 'uppercase', color: 'rgba(248,247,245,0.5)', marginBottom: 8 },
  glassName: { fontFamily: Fonts.display, fontSize: 28, color: Colors.background, marginBottom: 4, lineHeight: 32 },
  glassTagline: { fontFamily: Fonts.display, fontSize: 15, fontStyle: 'italic', color: 'rgba(248,247,245,0.65)', marginBottom: 12, lineHeight: 22 },
  glassPrice: { fontFamily: Fonts.body, fontSize: 13, color: 'rgba(248,247,245,0.5)', marginBottom: 20 },
  glassActions: { flexDirection: 'column', gap: 10 },
  enquireBtn: {
    paddingVertical: 14, backgroundColor: 'rgba(248,247,245,0.9)',
    borderRadius: 10, alignItems: 'center',
  },
  enquireBtnText: { fontFamily: Fonts.label, fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase', color: Colors.ink },

  // Hub
  searchContainer: { position: 'relative', marginBottom: 20 },
  searchIcon: { position: 'absolute', left: 14, top: 11, color: '#C8C4BE', fontSize: 14, zIndex: 1 },
  searchInput: {
    backgroundColor: Colors.card, borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 20, paddingLeft: 36, paddingRight: 16, paddingVertical: 10,
    fontFamily: Fonts.body, fontSize: 13, color: Colors.ink,
  },
  searchDropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
    backgroundColor: Colors.card, borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 12, marginTop: 6, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24,
  },
  searchResult: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 12, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#F0EDE8',
  },
  searchResultName: { fontFamily: Fonts.display, fontSize: 16, color: Colors.ink, marginBottom: 2 },
  searchResultSub: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase', color: Colors.muted },
  searchResultArrow: { fontSize: 18, color: '#C8C4BE' },

  discoverGold: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase', color: Colors.gold, marginBottom: 8 },
  discoverTitle: { fontFamily: Fonts.display, fontSize: 34, color: Colors.ink, lineHeight: 38, marginBottom: 8 },
  discoverSub: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, lineHeight: 20 },

  capsuleCard: {
    backgroundColor: Colors.card, borderWidth: 0.5, borderColor: Colors.border,
    borderRadius: 12, padding: 18, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  capsuleTitle: { fontFamily: Fonts.display, fontSize: 20, color: Colors.ink, lineHeight: 24 },
  capsuleSubtitle: { fontFamily: Fonts.body, fontSize: 12, color: Colors.muted, lineHeight: 18 },
  capsuleChevron: { fontSize: 20, color: '#C8C4BE', marginLeft: 12 },
  soonBadge: {
    backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  soonBadgeText: { fontFamily: Fonts.label, fontSize: 8, letterSpacing: 1.8, textTransform: 'uppercase', color: Colors.gold },

  // Coming soon modal
  sheetBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(17,17,17,0.45)',
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 24 },
  csSheeet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 28,
  },
  csRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  csIcon: { fontFamily: Fonts.display, fontSize: 28, color: Colors.gold },
  csBadge: {
    backgroundColor: 'rgba(201,168,76,0.08)', borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.35)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  csBadgeText: { fontFamily: Fonts.label, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: Colors.gold },
  csTitle: { fontFamily: Fonts.display, fontSize: 30, color: Colors.ink, marginBottom: 8, lineHeight: 34 },
  csTagline: { fontFamily: Fonts.display, fontSize: 16, fontStyle: 'italic', color: Colors.muted, marginBottom: 20, lineHeight: 24 },
  csDivider: { height: 0.5, backgroundColor: Colors.border, marginBottom: 20 },
  csDesc: { fontFamily: Fonts.body, fontSize: 14, color: '#555250', marginBottom: 32, lineHeight: 24 },
  csCTA: { width: '100%', paddingVertical: 15, backgroundColor: Colors.dark, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  csCTAText: { fontFamily: Fonts.label, fontSize: 10, letterSpacing: 2.2, textTransform: 'uppercase', color: Colors.background },
  csCaption: { fontFamily: Fonts.body, fontSize: 11, color: '#C8C4BE', fontStyle: 'italic', textAlign: 'center', lineHeight: 18 },
});
