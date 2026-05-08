/**
 * SurpriseMeOverlay — full-bleed sub-view over Muse canvas.
 *
 * Renders Surprise Me suggestions one at a time, swipeable horizontally.
 * Each card shows the image full-bleed, optional caption + source label,
 * and a "Save to Muse" button. The bride can swipe through, save the ones
 * she likes, and dismiss the overlay.
 *
 * Loading state: shimmer + tasteSummary placeholder while suggestions load.
 * Empty state: gentle copy + "Try again" if zero results returned.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, Pressable, Dimensions, Animated, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import {
  FrostColors, FrostFonts, FrostType, FrostSpace, FrostRadius, FrostMaterial,
} from '../../constants/frost';
import {
  surpriseMe, saveToMuse,
  type SurpriseSuggestion,
} from '../../services/frostApi';

interface SurpriseMeOverlayProps {
  visible: boolean;
  onClose: () => void;
  /** Optional initial focus — e.g. user came from "reception" filter. */
  functionTag?: string;
  /** Called after each successful save so parent can refetch grid. */
  onSaved?: () => void;
}

export default function SurpriseMeOverlay({
  visible, onClose, functionTag, onSaved,
}: SurpriseMeOverlayProps) {
  const insets = useSafeAreaInsets();
  const screenW = Dimensions.get('window').width;

  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<SurpriseSuggestion[]>([]);
  const [tasteSummary, setTasteSummary] = useState<string>('');
  const [idx, setIdx] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  // Fetch suggestions whenever the overlay is opened
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setSuggestions([]);
    setIdx(0);
    setSavedIds(new Set());

    Animated.timing(fade, {
      toValue: 1, duration: 280,
      useNativeDriver: Platform.OS !== 'web',
    }).start();

    surpriseMe({ functionTag, count: 8 }).then(res => {
      if (cancelled) return;
      setSuggestions(res.suggestions || []);
      setTasteSummary(res.tasteSummary || '');
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [visible, functionTag, fade]);

  const handleClose = () => {
    Animated.timing(fade, {
      toValue: 0, duration: 240,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => onClose());
  };

  const handleSave = async (s: SurpriseSuggestion) => {
    if (savedIds.has(s.suggestion_id) || savingId) return;
    setSavingId(s.suggestion_id);
    const result = await saveToMuse({
      imageUrl: s.image_url,
      functionTag,
      vendorId: s.vendor_id,
    });
    setSavingId(null);
    if (result.success) {
      setSavedIds(new Set([...savedIds, s.suggestion_id]));
      onSaved?.();
    }
  };

  const handleNext = () => {
    setIdx(i => Math.min(i + 1, suggestions.length - 1));
  };
  const handlePrev = () => {
    setIdx(i => Math.max(i - 1, 0));
  };

  if (!visible) return null;

  const current = suggestions[idx];
  const isSaved = current ? savedIds.has(current.suggestion_id) : false;
  const isSaving = current ? savingId === current.suggestion_id : false;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: fade }]}>
      {/* BACKGROUND — current image full-bleed, or frost while loading */}
      {current?.image_url ? (
        <Image
          source={{ uri: current.image_url }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: FrostColors.pageFallback }]} />
      )}

      {/* DARK SCRIM for legibility */}
      {current?.image_url ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.18)' }]} pointerEvents="none" />
      ) : null}

      {/* TOP BAR */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topBarLeft}>
          <Sparkles
            size={14}
            color={current?.image_url ? FrostColors.white : FrostColors.goldMuted}
            strokeWidth={1.7}
          />
          <Text style={[
            styles.eyebrow,
            { color: current?.image_url ? FrostColors.white : FrostColors.muted },
          ]}>SURPRISE ME</Text>
        </View>
        <Pressable onPress={handleClose} hitSlop={16} style={styles.closeBtn}>
          <X
            size={22}
            color={current?.image_url ? FrostColors.white : FrostColors.ink}
            strokeWidth={1.5}
          />
        </Pressable>
      </View>

      {/* LOADING STATE */}
      {loading ? (
        <View style={styles.centeredContent}>
          <Text style={styles.loadingTitle}>Looking for ideas\u2026</Text>
          <Text style={styles.loadingSub}>I&#x2019;m reading what you&#x2019;ve saved.</Text>
        </View>
      ) : suggestions.length === 0 ? (
        // EMPTY STATE
        <View style={styles.centeredContent}>
          <Text style={styles.emptyTitle}>Nothing landed this time.</Text>
          <Text style={styles.emptySub}>Want me to try again?</Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              surpriseMe({ functionTag, count: 8 }).then(r => {
                setSuggestions(r.suggestions || []);
                setTasteSummary(r.tasteSummary || '');
                setLoading(false);
              });
            }}
            style={({ pressed }) => [styles.tryAgainBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.tryAgainText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* SOURCE TAG (top-right of image) */}
          {current ? (
            <View style={[styles.sourceTag, { top: insets.top + 70 }]}>
              <Text style={styles.sourceText}>{sourceLabel(current.source)}</Text>
            </View>
          ) : null}

          {/* PROGRESS DOTS */}
          <View style={[styles.dots, { top: insets.top + 60 }]}>
            {suggestions.map((s, i) => (
              <View
                key={s.suggestion_id}
                style={[
                  styles.dot,
                  i === idx ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* CAPTION (bottom-left) */}
          {current?.caption ? (
            <View style={[styles.caption, { bottom: insets.bottom + 110 }]}>
              <Text style={styles.captionText}>{current.caption}</Text>
            </View>
          ) : null}

          {/* TASTE SUMMARY (top-center, subtle) */}
          {tasteSummary && idx === 0 ? (
            <View style={[styles.tasteSummary, { top: insets.top + 100 }]}>
              <Text style={styles.tasteText}>{tasteSummary}</Text>
            </View>
          ) : null}

          {/* BOTTOM CONTROLS — prev / save / next */}
          <View style={[styles.controls, { paddingBottom: insets.bottom + 24 }]}>
            <Pressable
              onPress={handlePrev}
              disabled={idx === 0}
              hitSlop={16}
              style={({ pressed }) => [
                styles.navBtn,
                idx === 0 && styles.navBtnDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              <ChevronLeft size={22} color={FrostColors.white} strokeWidth={1.7} />
            </Pressable>

            <Pressable
              onPress={() => current && handleSave(current)}
              disabled={isSaved || isSaving || !current}
              style={({ pressed }) => [
                styles.saveBtn,
                isSaved && styles.saveBtnDone,
                pressed && !isSaved && { opacity: 0.92 },
              ]}
            >
              <Heart
                size={18}
                color={isSaved ? FrostColors.goldMuted : FrostColors.ink}
                fill={isSaved ? FrostColors.goldMuted : 'transparent'}
                strokeWidth={1.7}
              />
              <Text style={styles.saveBtnText}>
                {isSaved ? 'Saved' : isSaving ? 'Saving\u2026' : 'Save to Muse'}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleNext}
              disabled={idx === suggestions.length - 1}
              hitSlop={16}
              style={({ pressed }) => [
                styles.navBtn,
                idx === suggestions.length - 1 && styles.navBtnDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              <ChevronRight size={22} color={FrostColors.white} strokeWidth={1.7} />
            </Pressable>
          </View>
        </>
      )}
    </Animated.View>
  );
}

function sourceLabel(s: string): string {
  if (s === 'pinterest') return 'PINTEREST';
  if (s === 'web') return 'WEB';
  if (s === 'vendor') return 'TDW VENDOR';
  if (s === 'commerce') return 'SHOP';
  return s.toUpperCase();
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: FrostColors.black,
    zIndex: 100,
  },

  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: FrostSpace.xxl,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 30,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.s,
  },
  eyebrow: {
    ...FrostType.eyebrowMedium,
    letterSpacing: 4,
  },
  closeBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },

  centeredContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: FrostSpace.xxl,
  },
  loadingTitle: {
    ...FrostType.displayM,
    fontStyle: 'italic',
    color: FrostColors.ink,
    fontFamily: FrostFonts.display,
    textAlign: 'center',
  },
  loadingSub: {
    ...FrostType.bodyMedium,
    color: FrostColors.muted,
    marginTop: FrostSpace.s,
    textAlign: 'center',
  },
  emptyTitle: {
    ...FrostType.displayM,
    fontStyle: 'italic',
    color: FrostColors.ink,
    fontFamily: FrostFonts.display,
    textAlign: 'center',
  },
  emptySub: {
    ...FrostType.bodyMedium,
    color: FrostColors.muted,
    marginTop: FrostSpace.s,
    marginBottom: FrostSpace.xl,
    textAlign: 'center',
  },
  tryAgainBtn: {
    paddingHorizontal: FrostSpace.xl,
    paddingVertical: FrostSpace.m,
    borderRadius: FrostRadius.pill,
    backgroundColor: FrostColors.goldMuted,
  },
  tryAgainText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: FrostColors.ink,
  },

  sourceTag: {
    position: 'absolute',
    right: FrostSpace.xxl,
    paddingHorizontal: FrostSpace.s,
    paddingVertical: 4,
    borderRadius: FrostRadius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sourceText: {
    fontFamily: FrostFonts.label,
    fontSize: 9,
    letterSpacing: 1.6,
    color: FrostColors.white,
  },

  dots: {
    position: 'absolute',
    left: 0, right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 18, height: 2.5, borderRadius: 1,
  },
  dotActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  dotInactive: {
    backgroundColor: 'rgba(255,255,255,0.32)',
  },

  caption: {
    position: 'absolute',
    left: FrostSpace.xxl, right: FrostSpace.xxl,
  },
  captionText: {
    fontFamily: FrostFonts.display,
    fontSize: 22,
    lineHeight: 28,
    fontStyle: 'italic',
    color: FrostColors.white,
  },

  tasteSummary: {
    position: 'absolute',
    left: FrostSpace.xxl, right: FrostSpace.xxl,
    alignItems: 'center',
  },
  tasteText: {
    fontFamily: FrostFonts.body,
    fontSize: 12,
    letterSpacing: 0.4,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    fontStyle: 'italic',
  },

  controls: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: FrostSpace.xxl,
    gap: FrostSpace.l,
  },
  navBtn: {
    width: 44, height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: FrostSpace.s,
  },
  saveBtnDone: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  saveBtnText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: FrostColors.ink,
  },
});
