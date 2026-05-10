/**
 * MuseGrid — symmetrical 2-column borderless mosaic for the bride's saves.
 *
 * Replaces the earlier staggered-height grid. Tiles are now equal-aspect and
 * borderless edge-to-edge — same mosaic discipline as landing E1/E3. Mode-aware
 * tokens come from MuseLookTokens (E1 dark or E3 light, decided by home mode).
 *
 * Interactions per tile:
 *   - Tap         → reveals caption (muse number + taste summary) for 5s,
 *                   then auto-dismisses. Re-tap re-reveals (resets timer).
 *   - Long-press  → onTileLongPress(save). Owner decides full-bleed routing
 *                   (image opens image, link opens link, vendor opens profile).
 *
 * The latest save sits top-left because the parent passes saves ordered by
 * created_at desc — natural reading order does the work.
 *
 * Muse number is derived placeholder for now (index-based padded). When the
 * persistent muse_number column ships, swap this for save.muse_number directly
 * — no other changes to this component required.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Image, Pressable, Text, StyleSheet, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FrostFonts } from '../../constants/frost';
import type { MuseLookTokens } from '../../constants/museTokens';
import type { MuseSave } from '../../services/frostApi';

interface MuseGridProps {
  saves: MuseSave[];
  tokens: MuseLookTokens;
  onTilePress?: (save: MuseSave) => void;
  onTileLongPress?: (save: MuseSave) => void;
  /**
   * Optional caption resolver. Returns the taste summary or any overlay text
   * the canvas wants shown on tap-reveal. If null/undefined, only the muse
   * number renders on reveal.
   */
  captionFor?: (save: MuseSave) => string | null;
}

const REVEAL_TIMEOUT_MS = 5000;

export default function MuseGrid({
  saves, tokens, onTilePress, onTileLongPress, captionFor,
}: MuseGridProps) {
  const screenW = Dimensions.get('window').width;
  const colW = screenW / 2;
  const tileH = colW * tokens.tileAspect;

  return (
    <View style={styles.grid}>
      {saves.map((save, idx) => (
        <MuseTile
          key={save.id}
          save={save}
          index={idx}
          colW={colW}
          tileH={tileH}
          tokens={tokens}
          onPress={onTilePress}
          onLongPress={onTileLongPress}
          captionFor={captionFor}
        />
      ))}
    </View>
  );
}

interface MuseTileProps {
  save: MuseSave;
  index: number;
  colW: number;
  tileH: number;
  tokens: MuseLookTokens;
  onPress?: (save: MuseSave) => void;
  onLongPress?: (save: MuseSave) => void;
  captionFor?: (save: MuseSave) => string | null;
}

function MuseTile({
  save, index, colW, tileH, tokens, onPress, onLongPress, captionFor,
}: MuseTileProps) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handlePress = () => {
    setRevealed(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setRevealed(false), REVEAL_TIMEOUT_MS);
    onPress?.(save);
  };

  const handleLongPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setRevealed(false);
    onLongPress?.(save);
  };

  // Placeholder muse number — replace with save.muse_number when DB column ships
  const num = String(index + 1).padStart(3, '0');
  const caption = captionFor?.(save) || null;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={420}
      style={[styles.tile, { width: colW, height: tileH, backgroundColor: tokens.cardFill }]}
    >
      {save.image_url ? (
        <Image
          source={{ uri: save.image_url }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.image, { backgroundColor: tokens.cardFill }]} />
      )}

      {/* Tap-reveal: gradient scrim + muse number + caption */}
      {revealed ? (
        <>
          <LinearGradient
            colors={tokens.scrimGradient}
            locations={[0.3, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.captionWrap} pointerEvents="none">
            <Text style={[styles.museNumber, { color: tokens.brass }]}>№ {num}</Text>
            {caption ? (
              <Text style={[styles.captionText, { color: 'rgba(255,255,255,0.96)' }]} numberOfLines={3}>
                {caption}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  captionWrap: {
    position: 'absolute',
    left: 12, right: 12, bottom: 12,
  },
  museNumber: {
    fontFamily: FrostFonts.label,
    fontWeight: '300',
    fontSize: 9,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    lineHeight: 11,
    marginBottom: 6,
  },
  captionText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 13.5,
    lineHeight: 18,
  },
});
