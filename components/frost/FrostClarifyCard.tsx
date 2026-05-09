/**
 * Frost · FrostClarifyCard
 *
 * Renders inside the Dream Ai chat stream when bride-chat returns
 * clarify_options. The bride asked something ambiguous (e.g. "call Swati"
 * when she has two Swatis); the model returned 2-4 options. Each pill
 * is tappable. Tap → onSelect fires with the option's send_text — dream.tsx
 * forwards it to bride-chat as a fresh user message, model re-runs the
 * original tool with the disambiguator.
 *
 * Layout rules:
 *   - 2 options → side-by-side pills (50/50 row)
 *   - 3-4 options → vertical stack (full-width pills)
 *
 * Visual register matches FrostConfirmCard / FrostContactCard: hairline
 * card on warm paper, brass-tinted icon, italic Cormorant feel for label
 * text. Pills have a subtle hover-press state. Once a pill is tapped,
 * the whole card disables (so bride can't double-tap and accidentally
 * fire two follow-ups).
 */

import React, { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import {
  FrostColors, FrostFonts, FrostSpace, FrostRadius,
} from '../../constants/frost';

export interface ClarifyOption {
  /** What the pill shows. e.g. "Swati Tomar (MUA)" */
  label: string;
  /** What gets sent back to bride-chat as a user message. e.g. "Swati Tomar" */
  send_text: string;
}

interface Props {
  options: ClarifyOption[];
  onSelect: (sendText: string) => void;
}

export default function FrostClarifyCard({ options, onSelect }: Props) {
  const [used, setUsed] = useState(false);

  const handleTap = (sendText: string) => {
    if (used) return;
    setUsed(true);
    onSelect(sendText);
  };

  // Layout: 2 options side-by-side, 3-4 stacked.
  const sideBySide = options.length === 2;

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, used && styles.cardDisabled]}>
        <View style={[styles.row, sideBySide ? styles.rowHorizontal : styles.rowVertical]}>
          {options.map((opt, idx) => (
            <Pressable
              key={idx}
              onPress={() => handleTap(opt.send_text)}
              disabled={used}
              style={({ pressed }) => [
                styles.pill,
                sideBySide ? styles.pillHorizontal : styles.pillVertical,
                pressed && styles.pillPressed,
              ]}
            >
              <Text
                style={styles.pillText}
                numberOfLines={sideBySide ? 2 : 1}
                ellipsizeMode="tail"
              >
                {opt.label}
              </Text>
              {!sideBySide ? (
                <ChevronRight size={14} color={FrostColors.soft} strokeWidth={1.5} />
              ) : null}
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.s,
  },
  card: {
    backgroundColor: 'rgba(255,253,248,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
    borderRadius: FrostRadius.box,
    padding: FrostSpace.m,
  },
  cardDisabled: { opacity: 0.5 },

  row: {
    gap: FrostSpace.s,
  },
  rowHorizontal: {
    flexDirection: 'row',
  },
  rowVertical: {
    flexDirection: 'column',
  },

  pill: {
    backgroundColor: 'rgba(216,211,204,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(168,146,75,0.25)',
    borderRadius: FrostRadius.pill,
    paddingVertical: 12,
    paddingHorizontal: FrostSpace.l,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: FrostSpace.s,
  },
  pillHorizontal: {
    flex: 1,
    justifyContent: 'center',
  },
  pillVertical: {
    width: '100%',
  },
  pillPressed: {
    backgroundColor: 'rgba(216,211,204,0.85)',
    opacity: 0.9,
  },
  pillText: {
    flex: 1,
    fontFamily: FrostFonts.bodyMedium,
    fontSize: 14,
    lineHeight: 18,
    color: FrostColors.ink,
    textAlign: 'left',
  },
});
