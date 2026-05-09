/**
 * DreamSuggestionsCarousel — horizontal card strip for Surprise Me results
 * shown INLINE in the Dream chat stream.
 *
 * Renders when bride asks DreamAi "surprise me" and the response contains
 * a `suggestions` array. Each card is tappable to expand or save.
 */

import React, { useState } from 'react';
import {
  View, Image, Text, ScrollView, Pressable, StyleSheet,
} from 'react-native';
import { Heart } from 'lucide-react-native';
import {
  FrostColors, FrostFonts, FrostType, FrostSpace, FrostRadius,
} from '../../constants/frost';
import {
  saveToMuse,
  type SurpriseSuggestion,
} from '../../services/frostApi';

interface DreamSuggestionsCarouselProps {
  suggestions: SurpriseSuggestion[];
  tasteSummary?: string;
  onSaved?: (suggestion: SurpriseSuggestion) => void;
  onExpand?: () => void;
}

export default function DreamSuggestionsCarousel({
  suggestions, tasteSummary, onSaved, onExpand,
}: DreamSuggestionsCarouselProps) {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSave = async (s: SurpriseSuggestion) => {
    if (savedIds.has(s.suggestion_id) || savingId) return;
    setSavingId(s.suggestion_id);
    const result = await saveToMuse({
      imageUrl: s.image_url,
      vendorId: s.vendor_id,
    });
    setSavingId(null);
    if (result.success) {
      setSavedIds(new Set([...savedIds, s.suggestion_id]));
      onSaved?.(s);
    }
  };

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {tasteSummary ? (
        <Text style={styles.taste}>{tasteSummary}</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map(s => {
          const isSaved = savedIds.has(s.suggestion_id);
          const isSaving = savingId === s.suggestion_id;
          return (
            <View key={s.suggestion_id} style={styles.card}>
              <Pressable onPress={onExpand} style={styles.cardImageWrap}>
                <Image
                  source={{ uri: s.image_url }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                <View style={styles.cardSourceTag}>
                  <Text style={styles.cardSourceText}>{s.source.toUpperCase()}</Text>
                </View>
              </Pressable>
              {s.caption ? (
                <Text style={styles.cardCaption} numberOfLines={2}>{s.caption}</Text>
              ) : null}
              <Pressable
                onPress={() => handleSave(s)}
                disabled={isSaved || isSaving}
                style={({ pressed }) => [
                  styles.cardSaveBtn,
                  isSaved && styles.cardSaveBtnDone,
                  pressed && !isSaved && { opacity: 0.92 },
                ]}
              >
                <Heart
                  size={13}
                  color={isSaved ? FrostColors.goldMuted : FrostColors.soft}
                  fill={isSaved ? FrostColors.goldMuted : 'transparent'}
                  strokeWidth={1.7}
                />
                <Text style={styles.cardSaveText}>
                  {isSaved ? 'Saved' : isSaving ? '…' : 'Save'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const CARD_W = 160;

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: FrostSpace.xxl,
    marginVertical: FrostSpace.m,
  },
  taste: {
    ...FrostType.bodySmall,
    fontStyle: 'italic',
    color: FrostColors.muted,
    marginBottom: FrostSpace.s,
  },
  scrollContent: {
    gap: FrostSpace.m,
    paddingRight: FrostSpace.xxl,
  },
  card: {
    width: CARD_W,
  },
  cardImageWrap: {
    width: CARD_W,
    height: CARD_W * 1.2,
    borderRadius: FrostRadius.box,
    overflow: 'hidden',
    backgroundColor: FrostColors.hairline,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
  },
  cardImage: {
    width: '100%', height: '100%',
  },
  cardSourceTag: {
    position: 'absolute',
    top: 6, left: 6,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: FrostRadius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  cardSourceText: {
    fontFamily: FrostFonts.label,
    fontSize: 8,
    letterSpacing: 1.2,
    color: FrostColors.white,
  },
  cardCaption: {
    ...FrostType.bodySmall,
    fontFamily: FrostFonts.body,
    color: FrostColors.soft,
    marginTop: 6,
    marginHorizontal: 4,
  },
  cardSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    marginTop: 4,
    borderRadius: FrostRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
    backgroundColor: 'rgba(252,251,248,0.5)',
  },
  cardSaveBtnDone: {
    borderColor: FrostColors.goldMuted,
  },
  cardSaveText: {
    fontFamily: FrostFonts.label,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: FrostColors.soft,
  },
});
