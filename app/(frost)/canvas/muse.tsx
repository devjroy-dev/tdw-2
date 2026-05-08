/**
 * Frost · Canvas · Muse
 *
 * The bride's saved inspiration. 2-column staggered grid of saves, with a
 * gold "Surprise Me" pill in the top-right that opens the suggestions
 * overlay. Tapping a saved tile expands it (future: detail view).
 *
 * Data: GET /api/couple/muse/:userId via fetchMuseSaves()
 *
 * Empty state: when the bride has zero saves, the canvas shows a single
 * hero CTA pulling her toward Surprise Me.
 *
 * Filtering: chip row above the grid lets her filter by ceremony tag.
 * Currently filters client-side from the saves list.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
  RefreshControl, Image,
} from 'react-native';
import { router } from 'expo-router';
import { Sparkles, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FrostColors, FrostFonts, FrostType, FrostSpace, FrostRadius, FrostCopy,
} from '../../../constants/frost';
import MuseGrid from '../../../components/frost/MuseGrid';
import SurpriseMeOverlay from '../../../components/frost/SurpriseMeOverlay';
import {
  fetchMuseSaves,
  type MuseSave,
} from '../../../services/frostApi';

const CEREMONY_FILTERS: { id: string; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'haldi', label: 'Haldi' },
  { id: 'mehendi', label: 'Mehendi' },
  { id: 'sangeet', label: 'Sangeet' },
  { id: 'reception', label: 'Reception' },
  { id: 'wedding', label: 'Wedding' },
];

export default function CanvasMuse() {
  const insets = useSafeAreaInsets();

  const [saves, setSaves] = useState<MuseSave[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [expandedSave, setExpandedSave] = useState<MuseSave | null>(null);

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
    // Refetch saves in case bride saved suggestions during the overlay
    load();
  };

  const filteredSaves = activeFilter === 'all'
    ? saves
    : saves.filter(s => s.function_tag === activeFilter);

  const isEmpty = !loading && saves.length === 0;

  // Determine surprise overlay's preselected functionTag from active filter
  const surpriseFunctionTag = activeFilter !== 'all' ? activeFilter : undefined;

  return (
    <View style={styles.root}>
      {/* TOP BAR */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topBarLeft}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>{FrostCopy.museCanvas.eyebrow}</Text>
        </View>
        <View style={styles.topBarRight}>
          <Pressable
            onPress={() => setOverlayVisible(true)}
            style={({ pressed }) => [styles.surpriseBtn, pressed && { opacity: 0.88 }]}
          >
            <Sparkles size={14} color={FrostColors.ink} strokeWidth={2} />
            <Text style={styles.surpriseLabel}>Surprise Me</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} hitSlop={16} style={styles.closeBtn}>
            <X size={22} color={FrostColors.ink} strokeWidth={1.5} />
          </Pressable>
        </View>
      </View>

      {/* CONTENT */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 70 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={FrostColors.muted}
          />
        }
      >
        {/* HEADING */}
        <View style={styles.heading}>
          <Text style={styles.headingTitle}>Your saved moments.</Text>
          <Text style={styles.headingSub}>
            {saves.length === 0
              ? 'Tap Surprise Me to start, or paste a Pinterest link in Dream.'
              : `${saves.length} ${saves.length === 1 ? 'inspiration' : 'inspirations'} so far.`}
          </Text>
        </View>

        {/* CEREMONY FILTERS */}
        {!isEmpty ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersRow}
          >
            {CEREMONY_FILTERS.map(f => (
              <Pressable
                key={f.id}
                onPress={() => setActiveFilter(f.id)}
                style={({ pressed }) => [
                  styles.filterChip,
                  activeFilter === f.id && styles.filterChipActive,
                  pressed && { opacity: 0.92 },
                ]}
              >
                <Text style={[
                  styles.filterText,
                  activeFilter === f.id && styles.filterTextActive,
                ]}>{f.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* GRID / EMPTY / LOADING */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={FrostColors.muted} />
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Sparkles size={28} color={FrostColors.goldMuted} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>Your Muse is quiet.</Text>
            <Text style={styles.emptySub}>
              Tap Surprise Me and I&#x2019;ll find inspiration based on what you love.
            </Text>
            <Pressable
              onPress={() => setOverlayVisible(true)}
              style={({ pressed }) => [styles.emptyCTA, pressed && { opacity: 0.88 }]}
            >
              <Sparkles size={16} color={FrostColors.ink} strokeWidth={1.7} />
              <Text style={styles.emptyCTAText}>Surprise Me</Text>
            </Pressable>
          </View>
        ) : filteredSaves.length === 0 ? (
          <View style={styles.emptyFilter}>
            <Text style={styles.emptyFilterText}>
              No saves tagged for {activeFilter} yet.
            </Text>
            <Pressable
              onPress={() => setOverlayVisible(true)}
              style={({ pressed }) => [styles.emptyCTA, pressed && { opacity: 0.88 }]}
            >
              <Sparkles size={16} color={FrostColors.ink} strokeWidth={1.7} />
              <Text style={styles.emptyCTAText}>Find {activeFilter} ideas</Text>
            </Pressable>
          </View>
        ) : (
          <MuseGrid
            saves={filteredSaves}
            onTilePress={(save) => setExpandedSave(save)}
          />
        )}

        <View style={{ height: insets.bottom + FrostSpace.huge }} />
      </ScrollView>

      {/* SURPRISE ME OVERLAY */}
      <SurpriseMeOverlay
        visible={overlayVisible}
        onClose={handleSurpriseClose}
        functionTag={surpriseFunctionTag}
        onSaved={load}
      />

      {/* EXPANDED SAVE OVERLAY (lightweight) */}
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
          {expandedSave.note ? (
            <View style={[styles.expandedNote, { bottom: insets.bottom + 24 }]}>
              <Text style={styles.expandedNoteText}>{expandedSave.note}</Text>
            </View>
          ) : null}
          <Pressable
            onPress={() => setExpandedSave(null)}
            style={[styles.expandedClose, { top: insets.top + 14 }]}
            hitSlop={16}
          >
            <X size={22} color={FrostColors.white} strokeWidth={1.5} />
          </Pressable>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FrostColors.pageFallback },

  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: FrostSpace.xxl,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(232,229,224,0.94)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: FrostColors.hairline,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.s,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.m,
  },
  eyebrowDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: FrostColors.muted,
    opacity: 0.9,
  },
  eyebrow: {
    ...FrostType.eyebrowMedium,
    letterSpacing: 4,
    color: FrostColors.muted,
  },
  surpriseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: FrostSpace.l,
    paddingVertical: 8,
    borderRadius: FrostRadius.pill,
    backgroundColor: FrostColors.goldMuted,
  },
  surpriseLabel: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: FrostColors.ink,
  },
  closeBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: {
    paddingBottom: FrostSpace.xxl,
  },
  heading: {
    paddingHorizontal: FrostSpace.xxl,
    paddingBottom: FrostSpace.l,
  },
  headingTitle: {
    ...FrostType.displayM,
    fontStyle: 'italic',
    fontFamily: FrostFonts.display,
  },
  headingSub: {
    ...FrostType.bodyMedium,
    color: FrostColors.muted,
    marginTop: FrostSpace.xs,
  },

  filtersRow: {
    paddingHorizontal: FrostSpace.xxl,
    paddingBottom: FrostSpace.xl,
    gap: FrostSpace.s,
  },
  filterChip: {
    paddingHorizontal: FrostSpace.l,
    paddingVertical: 8,
    borderRadius: FrostRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
    backgroundColor: 'transparent',
  },
  filterChipActive: {
    borderColor: FrostColors.goldMuted,
    backgroundColor: 'rgba(168,146,75,0.12)',
  },
  filterText: {
    ...FrostType.eyebrowSmall,
    letterSpacing: 1.6,
    color: FrostColors.muted,
  },
  filterTextActive: {
    color: FrostColors.goldMuted,
  },

  centered: {
    paddingVertical: FrostSpace.huge,
    alignItems: 'center',
  },

  emptyState: {
    paddingHorizontal: FrostSpace.xxl,
    paddingVertical: FrostSpace.huge,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(168,146,75,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: FrostSpace.l,
  },
  emptyTitle: {
    ...FrostType.displayM,
    fontStyle: 'italic',
    fontFamily: FrostFonts.display,
    textAlign: 'center',
  },
  emptySub: {
    ...FrostType.bodyMedium,
    color: FrostColors.muted,
    textAlign: 'center',
    marginTop: FrostSpace.s,
    marginBottom: FrostSpace.xl,
    paddingHorizontal: FrostSpace.l,
  },
  emptyCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.s,
    paddingHorizontal: FrostSpace.xl,
    paddingVertical: FrostSpace.m,
    borderRadius: FrostRadius.pill,
    backgroundColor: FrostColors.goldMuted,
  },
  emptyCTAText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: FrostColors.ink,
  },

  emptyFilter: {
    paddingHorizontal: FrostSpace.xxl,
    paddingVertical: FrostSpace.xxxl,
    alignItems: 'center',
  },
  emptyFilterText: {
    ...FrostType.bodyMedium,
    color: FrostColors.muted,
    marginBottom: FrostSpace.l,
    textAlign: 'center',
  },

  expandedOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  expandedImage: {
    width: '100%', height: '100%',
  },
  expandedNote: {
    position: 'absolute',
    left: FrostSpace.xxl, right: FrostSpace.xxl,
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.m,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: FrostRadius.box,
  },
  expandedNoteText: {
    ...FrostType.bodyMedium,
    color: FrostColors.white,
    fontStyle: 'italic',
    fontFamily: FrostFonts.display,
    fontSize: 17,
  },
  expandedClose: {
    position: 'absolute',
    right: FrostSpace.xxl,
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
});
