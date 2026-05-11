/**
 * Frost · Canvas · Muse (mode-aware redesign — May 10 evening)
 *
 * Visual ship — moves Muse to a symmetrical borderless 2-col mosaic mirroring
 * the home E1/E3 mosaic discipline. The bride's home_mode (AsyncStorage
 * @frost.home_mode) selects the look:
 *   - home_mode === 'E1'  →  E1 dark mosaic
 *   - anything else       →  E3 light mosaic (default fallback)
 *
 * Layout, top to bottom:
 *   - Eyebrow row    : MUSE eyebrow (left)  ·  X close (right)
 *   - Pill row       : Surprise Me (left, brass)  ·  More + Edit (right, frost)
 *   - Mosaic         : symmetrical 2-col, equal-aspect tiles, latest top-left
 *
 * Tile interactions (handled inside MuseGrid):
 *   - Tap          : reveal № muse-number + taste summary for 5s, then auto-dismiss
 *   - Long-press   : opens save in full bleed
 *                       - vendor-linked save  →  vendor profile
 *                       - external link save  →  Linking.openURL
 *                       - image-only save     →  full-bleed image overlay
 *
 * Deferred this session: Edit/delete loop. Edit pill renders but tapping it
 * surfaces a soft toast — actual delete needs services/frostApi.ts changes
 * which are inside the auth-cleanup boundary. Returns next session.
 *
 * Also deferred: persistent muse_number column on moodboard_items. Today the
 * grid uses index-based placeholder numbering. Once the DB column ships, swap
 * MuseGrid's `String(index + 1).padStart(3, '0')` for `save.muse_number`.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
  RefreshControl, Image, Linking, StatusBar, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FrostFonts } from '../../../constants/frost';
import { MUSE_LOOKS, type MuseLookTokens } from '../../../constants/museTokens';
import { useMuseLook } from '../../../hooks/useMuseLook';
import MuseGrid from '../../../components/frost/MuseGrid';
import SurpriseMeOverlay from '../../../components/frost/SurpriseMeOverlay';
import {
  fetchMuseSaves,
  type MuseSave,
} from '../../../services/frostApi';

const CEREMONY_FILTERS: { id: string; label: string }[] = [
  { id: 'all',       label: 'All' },
  { id: 'haldi',     label: 'Haldi' },
  { id: 'mehendi',   label: 'Mehendi' },
  { id: 'sangeet',   label: 'Sangeet' },
  { id: 'reception', label: 'Reception' },
  { id: 'wedding',   label: 'Wedding' },
];

export default function CanvasMuse() {
  const insets = useSafeAreaInsets();
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];

  const [saves, setSaves] = useState<MuseSave[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [expandedSave, setExpandedSave] = useState<MuseSave | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastFade = useMemo(() => new Animated.Value(0), []);

  const load = useCallback(async () => {
    const data = await fetchMuseSaves();
    setSaves(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleSurpriseClose = () => {
    setOverlayVisible(false);
    load();
  };

  const showToast = useCallback((message: string) => {
    setToast(message);
    Animated.sequence([
      Animated.timing(toastFade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2400),
      Animated.timing(toastFade, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [toastFade]);

  const handleEditPress = () => {
    showToast('Editing comes back in a moment.');
  };

  // Long-press routing per save type
  const handleTileLongPress = (save: MuseSave) => {
    // Vendor-linked → vendor profile (lives under journey/, not discover/)
    if (save.vendor?.id) {
      router.push(`/(frost)/canvas/journey/vendor/${save.vendor.id}` as any);
      return;
    }
    // External link → open URL (Pinterest, Instagram, web)
    const url = save.image_url || '';
    const isExternalLink =
      /pinterest\.com|instagram\.com/i.test(url) &&
      !/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);
    if (isExternalLink) {
      Linking.openURL(url).catch(() => setExpandedSave(save));
      return;
    }
    // Image → full-bleed in-app
    setExpandedSave(save);
  };

  const filteredSaves = activeFilter === 'all'
    ? saves
    : saves.filter(s => s.function_tag === activeFilter);

  const isEmpty = !loading && saves.length === 0;
  const surpriseFunctionTag = activeFilter !== 'all' ? activeFilter : undefined;

  // Caption resolver for tap-reveal — current source: vendor name or note
  const captionFor = useCallback((save: MuseSave): string | null => {
    if (save.note) return save.note;
    if (save.vendor?.name) return save.vendor.name;
    return null;
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: tokens.pagePaper }]}>
      <StatusBar barStyle={tokens.statusBarStyle} backgroundColor={tokens.pagePaper} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={tokens.brassMuted}
          />
        }
      >
        {/* EYEBROW ROW: MUSE  ·  X */}
        <View style={[styles.eyebrowRow, { paddingTop: insets.top + 14 }]}>
          <Text style={[styles.eyebrow, { color: tokens.brassMuted }]}>MUSE</Text>
          <Pressable onPress={() => router.back()} hitSlop={16}>
            <Text style={[styles.closeMark, { color: tokens.closeColor }]}>×</Text>
          </Pressable>
        </View>

        {/* PILL ROW: Surprise Me (left, brass) · More + Edit (right, frost) */}
        <View style={styles.pillRow}>
          <Pressable
            onPress={() => setOverlayVisible(true)}
            style={({ pressed }) => [
              styles.pillPrimary,
              { backgroundColor: tokens.brass },
              pressed && { opacity: 0.88 },
            ]}
          >
            <Text style={styles.pillPrimaryGlyph}>✦</Text>
            <Text style={[styles.pillPrimaryText, { color: look === 'E1' ? '#1B1612' : '#2C2823' }]}>
              Surprise me
            </Text>
          </Pressable>

          <View style={styles.pillRightCluster}>
            <Pressable
              onPress={() => setMoreOpen(v => !v)}
              style={({ pressed }) => [
                styles.pillSecondary,
                {
                  backgroundColor: moreOpen ? tokens.brass : tokens.pillSecondaryBg,
                  borderColor: tokens.pillSecondaryBorder,
                },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text style={[
                styles.pillSecondaryText,
                {
                  color: moreOpen
                    ? (look === 'E1' ? '#1B1612' : '#2C2823')
                    : tokens.pillSecondaryText,
                },
              ]}>More</Text>
            </Pressable>

            <Pressable
              onPress={handleEditPress}
              style={({ pressed }) => [
                styles.pillSecondary,
                {
                  backgroundColor: tokens.pillSecondaryBg,
                  borderColor: tokens.pillSecondaryBorder,
                },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text style={[styles.pillSecondaryText, { color: tokens.pillSecondaryText }]}>
                Edit
              </Text>
            </Pressable>
          </View>
        </View>

        {/* MORE PANEL — ceremony filters as a quiet annotation row */}
        {moreOpen ? (
          <View style={[styles.morePanel, { borderColor: tokens.hairline }]}>
            <View style={styles.filtersWrap}>
              {CEREMONY_FILTERS.map(f => {
                const active = activeFilter === f.id;
                return (
                  <Pressable
                    key={f.id}
                    onPress={() => setActiveFilter(f.id)}
                    style={({ pressed }) => [
                      styles.filterChip,
                      pressed && { opacity: 0.92 },
                    ]}
                  >
                    <Text style={[
                      styles.filterText,
                      { color: active ? tokens.brass : tokens.soft },
                    ]}>
                      {f.label.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* MOSAIC GRID */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={tokens.brassMuted} />
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: tokens.ink }]}>Your Muse is quiet.</Text>
            <Text style={[styles.emptySub, { color: tokens.soft }]}>
              Tap Surprise Me and I&#x2019;ll find inspiration based on what you love.
            </Text>
            <Pressable
              onPress={() => setOverlayVisible(true)}
              style={({ pressed }) => [
                styles.emptyCTA,
                { backgroundColor: tokens.brass },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text style={[styles.emptyCTAText, { color: look === 'E1' ? '#1B1612' : '#2C2823' }]}>
                ✦  Surprise me
              </Text>
            </Pressable>
          </View>
        ) : filteredSaves.length === 0 ? (
          <View style={styles.emptyFilter}>
            <Text style={[styles.emptyFilterText, { color: tokens.soft }]}>
              No saves tagged for {activeFilter} yet.
            </Text>
            <Pressable
              onPress={() => setOverlayVisible(true)}
              style={({ pressed }) => [
                styles.emptyCTA,
                { backgroundColor: tokens.brass },
                pressed && { opacity: 0.88 },
              ]}
            >
              <Text style={[styles.emptyCTAText, { color: look === 'E1' ? '#1B1612' : '#2C2823' }]}>
                ✦  Find {activeFilter} ideas
              </Text>
            </Pressable>
          </View>
        ) : (
          <MuseGrid
            saves={filteredSaves}
            tokens={tokens}
            onTileLongPress={handleTileLongPress}
            captionFor={captionFor}
          />
        )}

        <View style={{ height: insets.bottom + 36 }} />
      </ScrollView>

      {/* SURPRISE ME OVERLAY (mode-aware) */}
      <SurpriseMeOverlay
        visible={overlayVisible}
        onClose={handleSurpriseClose}
        functionTag={surpriseFunctionTag}
        onSaved={load}
        look={look}
      />

      {/* EXPANDED IMAGE OVERLAY — full bleed, warm-charcoal scrim */}
      {expandedSave?.image_url ? (
        <Pressable
          style={styles.expandedOverlay}
          onPress={() => setExpandedSave(null)}
        >
          <Image
            source={{ uri: expandedSave.image_url }}
            style={styles.expandedImage}
            resizeMode="contain"
          />
          <Pressable
            onPress={() => setExpandedSave(null)}
            style={[styles.expandedClose, { top: insets.top + 14 }]}
            hitSlop={16}
          >
            <Text style={styles.expandedCloseMark}>×</Text>
          </Pressable>
        </Pressable>
      ) : null}

      {/* TOAST — soft notice for deferred Edit */}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity: toastFade,
              backgroundColor: look === 'E1' ? 'rgba(45,38,32,0.96)' : 'rgba(44,40,35,0.94)',
              bottom: insets.bottom + 32,
            },
          ]}
        >
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 0 },

  eyebrowRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  eyebrow: {
    fontFamily: FrostFonts.label,
    fontWeight: '300',
    fontSize: 9.5,
    letterSpacing: 4.2,
    textTransform: 'uppercase',
  },
  closeMark: {
    fontFamily: FrostFonts.label,
    fontWeight: '300',
    fontSize: 22,
    lineHeight: 22,
  },

  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  pillPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  pillPrimaryGlyph: {
    fontSize: 11,
    color: '#1B1612',
    lineHeight: 11,
  },
  pillPrimaryText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 9.5,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    lineHeight: 11,
  },
  pillRightCluster: {
    flexDirection: 'row',
    gap: 6,
  },
  pillSecondary: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pillSecondaryText: {
    fontFamily: FrostFonts.label,
    fontWeight: '300',
    fontSize: 9.5,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
    lineHeight: 11,
  },

  morePanel: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  filtersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    rowGap: 10,
  },
  filterChip: {
    paddingVertical: 4,
  },
  filterText: {
    fontFamily: FrostFonts.label,
    fontWeight: '300',
    fontSize: 9,
    letterSpacing: 2.4,
  },

  centered: {
    paddingVertical: 96,
    alignItems: 'center',
  },

  emptyState: {
    paddingHorizontal: 28,
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 28,
    lineHeight: 32,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: FrostFonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  emptyCTA: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 100,
  },
  emptyCTAText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },

  emptyFilter: {
    paddingHorizontal: 28,
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyFilterText: {
    fontFamily: FrostFonts.body,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },

  expandedOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,12,10,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  expandedImage: {
    width: '100%', height: '100%',
  },
  expandedClose: {
    position: 'absolute',
    right: 18,
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  expandedCloseMark: {
    fontFamily: FrostFonts.label,
    fontWeight: '300',
    fontSize: 22,
    lineHeight: 22,
    color: 'rgba(245,240,232,0.92)',
  },

  toast: {
    position: 'absolute',
    left: 24, right: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 100,
    alignItems: 'center',
    zIndex: 300,
  },
  toastText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 14,
    color: 'rgba(245,240,232,0.96)',
    textAlign: 'center',
  },
});
