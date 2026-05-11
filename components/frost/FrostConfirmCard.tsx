/**
 * FrostConfirmCard — composite-tool confirmation primitive.
 *
 * When the bride says "Booked Swati for 1L, 30% advance" and DreamAi parses
 * 4 mutations, the backend returns ONE FrostConfirmPreview. The native UI
 * renders it as a single card with summary lines + Confirm/Cancel.
 *
 * On Confirm: card animates to Done state (checkmark + closing line of AI
 * voice), then collapses. On Cancel: dismissed.
 *
 * Hard rule: maximum TWO cards per turn. If the AI tries 3+, the backend
 * either merges or returns "I'll help with the first thing — tell me the
 * next one after?" This component renders ONE card. Multi-card stacks are
 * the parent's responsibility (rare).
 */

import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Check } from 'lucide-react-native';
import {
  FrostColors, FrostType, FrostSpace, FrostRadius, FrostFonts, FrostMotion,
  FrostConfirmPreview,
} from '../../constants/frost';
import { MUSE_LOOKS } from '../../constants/museTokens';
import { useMuseLook } from '../../hooks/useMuseLook';

interface FrostConfirmCardProps {
  preview: FrostConfirmPreview;
  /**
   * Called after the bride taps Confirm. Parent runs the actual mutation.
   *
   * BUG C FIX: parent must return a truthy value when the action *actually*
   * succeeded. If it returns false / falsy / nothing, the card collapses
   * silently and the parent is responsible for rendering an error reply
   * line in the chat stream. This is what fixes the "tap Lock-In on an
   * expired action → checkmark appears even though nothing happened" bug.
   *
   * Returning void is allowed for backwards compatibility — treated as
   * success (since pre-fix callers always assumed success on no-throw).
   */
  onConfirm: () => Promise<boolean | void> | boolean | void;
  onCancel?: () => void;
  /** AI voice line shown in the Done state. */
  doneMessage?: string;
}

type CardState = 'idle' | 'confirming' | 'done';

export default function FrostConfirmCard({
  preview,
  onConfirm,
  onCancel,
  doneMessage = 'Done.',
}: FrostConfirmCardProps) {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  const [state, setState] = useState<CardState>('idle');
  const opacity = useRef(new Animated.Value(1)).current;
  const doneOpacity = useRef(new Animated.Value(0)).current;

  const handleConfirm = async () => {
    setState('confirming');
    try {
      // BUG C FIX: trust the return value, not just the absence of a throw.
      // brideConfirm() resolves with { success: false, reply: '...' } on an
      // expired/wrong-user/server-error action — these are not exceptions,
      // they're soft failures, and pre-fix code flipped to Done on all of
      // them.
      const result = await onConfirm();
      // Treat undefined/void as success (backwards compatibility for
      // older call sites that don't yet return a boolean). Treat explicit
      // false as failure → revert to idle, parent will collapse this card.
      if (result === false) {
        setState('idle');
        return;
      }
      setState('done');
      Animated.timing(doneOpacity, {
        toValue: 1,
        duration: FrostMotion.cardDoneDuration,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <Animated.View style={[styles.card, styles.cardDone, { backgroundColor: tokens.cardFill, opacity: doneOpacity }]}>
        <View style={styles.doneIconWrap}>
          <Check size={20} color={FrostColors.goldTrue} strokeWidth={1.8} />
        </View>
        <Text style={[styles.doneText, { color: tokens.ink }]}>{doneMessage}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.card, { backgroundColor: tokens.cardFill, opacity }]}>
      <Text style={[styles.title, { color: tokens.ink }]}>{preview.summaryTitle}</Text>

      <View style={styles.summaryList}>
        {preview.summaryLines.map((line, idx) => (
          <View key={idx} style={styles.summaryRow}>
            <View style={styles.summaryDot} />
            <Text style={[styles.summaryText, { color: tokens.ink }]}>{line}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        {onCancel ? (
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.btn, styles.btnSecondary, pressed && styles.btnPressed]}
            disabled={state === 'confirming'}
          >
            <Text style={[styles.btnSecondaryText, { color: tokens.soft }]}>
              {preview.cancelLabel ?? 'Not yet'}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [
            styles.btn,
            { backgroundColor: tokens.ink },
            pressed && styles.btnPressed,
            state === 'confirming' && styles.btnDisabled,
          ]}
          disabled={state === 'confirming'}
        >
          <Text style={styles.btnPrimaryText}>
            {state === 'confirming' ? 'Working…' : (preview.confirmLabel ?? 'Confirm')}
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    // backgroundColor applied inline via tokens.cardFill — mode-aware
    // (no white card per Frost doctrine: "white cards are GONE")
    borderRadius: FrostRadius.box,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
    padding: FrostSpace.xl,
    marginHorizontal: FrostSpace.xxl,
    marginVertical: FrostSpace.m,
  },
  cardDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.m,
    paddingVertical: FrostSpace.l,
  },

  title: {
    ...FrostType.displayM,
    fontSize: 22,
    lineHeight: 28,
    // color applied inline via tokens.ink
    marginBottom: FrostSpace.l,
    fontFamily: FrostFonts.display,
  },

  summaryList: {
    gap: FrostSpace.s,
    marginBottom: FrostSpace.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: FrostSpace.m,
  },
  summaryDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: FrostColors.goldMuted,
    marginTop: 9,
  },
  summaryText: {
    ...FrostType.bodyMedium,
    flex: 1,
    // color applied inline via tokens.ink
  },

  actions: {
    flexDirection: 'row',
    gap: FrostSpace.m,
    justifyContent: 'flex-end',
  },
  btn: {
    paddingHorizontal: FrostSpace.xl,
    paddingVertical: FrostSpace.m,
    borderRadius: FrostRadius.pill,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    // backgroundColor applied inline via tokens.ink
  },
  btnPrimaryText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    // color applied inline via tokens.pagePaper
  },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
  },
  btnSecondaryText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    // color applied inline via tokens.soft
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  doneIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(168,146,75,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: {
    ...FrostType.displayXS,
    flex: 1,
    // color applied inline via tokens.ink
  },
});
