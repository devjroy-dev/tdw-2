/**
 * DreamYesNo — single AI bubble with two pill buttons (Yes / No).
 *
 * Used inside the Dream stream when DreamAi returns a follow-up prompt.
 * On tap:
 *   1. Calls /api/v2/dreamai/bride-followup with the answer
 *   2. Collapses to a "✓ Yes" or "✓ No" badge so the bride sees her choice
 *   3. Calls onResolved with the AI's resulting reply line, which the parent
 *      appends to the Dream stream as a new AI line
 *
 * One tap, done. Locked grammar.
 */

import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  FrostColors, FrostFonts, FrostType, FrostSpace, FrostRadius, FrostMotion,
} from '../../constants/frost';
import { brideFollowup, BrideFollowup } from '../../services/frostApi';

interface DreamYesNoProps {
  prompt: BrideFollowup;
  /** Optional context posted alongside the answer (e.g. { vendor_name: 'Swati' }). */
  context?: Record<string, any>;
  /**
   * Called once Yes/No has been resolved. The string is the reply text
   * returned by the followup endpoint, which the parent appends to its
   * stream as an AI line.
   */
  onResolved?: (replyText: string, answer: 'yes' | 'no') => void;
  /** Disables interaction (e.g. while a parent is busy). */
  disabled?: boolean;
}

type State = 'idle' | 'sending' | 'done';

export default function DreamYesNo({
  prompt,
  context = {},
  onResolved,
  disabled = false,
}: DreamYesNoProps) {
  const [state, setState] = useState<State>('idle');
  const [chosen, setChosen] = useState<'yes' | 'no' | null>(null);
  const fadeBadge = useRef(new Animated.Value(0)).current;

  const handleTap = async (answer: 'yes' | 'no') => {
    if (state !== 'idle' || disabled) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync?.();
    setChosen(answer);
    setState('sending');
    try {
      const res = await brideFollowup(prompt.id, answer, context);
      setState('done');
      Animated.timing(fadeBadge, {
        toValue: 1,
        duration: FrostMotion.cardDoneDuration,
        useNativeDriver: true,
      }).start();
      if (onResolved && res.reply) {
        // Tiny delay so the badge animates in before the new AI line slides in
        setTimeout(() => onResolved(res.reply, answer), 280);
      }
    } catch {
      setState('idle');
      setChosen(null);
    }
  };

  // Done state — collapsed badge
  if (state === 'done') {
    return (
      <Animated.View style={[styles.row, { opacity: fadeBadge }]}>
        <Text style={styles.glyph}>✦</Text>
        <View style={styles.body}>
          <Text style={styles.promptTextDone}>{prompt.text}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              ✓ {chosen === 'yes' ? prompt.yesLabel : prompt.noLabel}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  // Idle / sending — show buttons
  return (
    <View style={styles.row}>
      <Text style={styles.glyph}>✦</Text>
      <View style={styles.body}>
        <Text style={styles.promptText}>{prompt.text}</Text>
        <View style={styles.btnRow}>
          <Pressable
            onPress={() => handleTap('yes')}
            style={({ pressed }) => [
              styles.btn,
              styles.btnYes,
              pressed && styles.btnPressed,
              state === 'sending' && chosen !== 'yes' && styles.btnDimmed,
            ]}
            disabled={state !== 'idle' || disabled}
          >
            <Text style={styles.btnYesText}>
              {state === 'sending' && chosen === 'yes' ? '…' : prompt.yesLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleTap('no')}
            style={({ pressed }) => [
              styles.btn,
              styles.btnNo,
              pressed && styles.btnPressed,
              state === 'sending' && chosen !== 'no' && styles.btnDimmed,
            ]}
            disabled={state !== 'idle' || disabled}
          >
            <Text style={styles.btnNoText}>
              {state === 'sending' && chosen === 'no' ? '…' : prompt.noLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const AVATAR_SIZE = 32;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: FrostSpace.xxl,
    paddingVertical: FrostSpace.m,
    gap: FrostSpace.m,
  },
  glyph: {
    fontFamily: FrostFonts.body,
    fontSize: 14,
    color: FrostColors.soft,
    width: AVATAR_SIZE,
    textAlign: 'center',
    marginTop: 2,
  },
  body: { flex: 1 },
  promptText: {
    ...FrostType.displayXS,
    marginBottom: FrostSpace.m,
  },
  promptTextDone: {
    ...FrostType.displayXS,
    color: FrostColors.muted,
    marginBottom: FrostSpace.s,
  },

  btnRow: {
    flexDirection: 'row',
    gap: FrostSpace.s,
    flexWrap: 'wrap',
  },
  btn: {
    paddingVertical: FrostSpace.s + 1,
    paddingHorizontal: FrostSpace.l,
    borderRadius: FrostRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnYes: {
    backgroundColor: FrostColors.ink,
    borderColor: FrostColors.ink,
  },
  btnNo: {
    backgroundColor: 'transparent',
    borderColor: FrostColors.hairline,
  },
  btnPressed: { opacity: 0.85 },
  btnDimmed: { opacity: 0.4 },
  btnYesText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: FrostColors.white,
  },
  btnNoText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: FrostColors.soft,
  },

  badge: {
    alignSelf: 'flex-start',
    paddingVertical: FrostSpace.xs,
    paddingHorizontal: FrostSpace.m,
    borderRadius: FrostRadius.pill,
    backgroundColor: 'rgba(168,146,75,0.14)',
  },
  badgeText: {
    fontFamily: FrostFonts.bodyMedium,
    fontSize: 12,
    color: FrostColors.goldMuted,
  },
});
