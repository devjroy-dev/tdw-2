/**
 * Frost · FrostConfirmSheet
 *
 * Bottom sheet for destructive confirmations. Used when the bride long-presses
 * a row to delete it (Reminders, Expenses, Vendors). Distinct from
 * FrostConfirmCard, which lives inside the Dream chat stream as an action
 * preview card. This component is page-level chrome.
 *
 * Visual: scrim covers the page; sheet slides up from bottom; italic
 * Cormorant title in charcoal; body in soft grey; two pill buttons —
 * destructive in goldTrue, cancel as hairline-bordered ghost. Tap scrim
 * to dismiss.
 *
 * Animation: fade scrim + translate sheet, both useNativeDriver where safe.
 */

import React, { useEffect, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, Dimensions, Modal,
} from 'react-native';
import {
  FrostColors, FrostFonts, FrostType, FrostSpace, FrostRadius, FrostMotion,
} from '../../constants/frost';

interface Props {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** When true, the confirm button uses goldTrue / brass styling. */
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const { height: SCREEN_H } = Dimensions.get('window');

export default function FrostConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Keep',
  destructive = true,
  onConfirm,
  onCancel,
}: Props) {
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: FrostMotion.cardOpenDuration,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue: 0,
          duration: FrostMotion.pressOutDuration,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_H,
          duration: FrostMotion.pressOutDuration,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scrimOpacity, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <Animated.View style={[styles.scrim, { opacity: scrimOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { transform: [{ translateY }] },
        ]}
      >
        <View style={styles.handle} />

        <Text style={styles.title}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}

        <View style={styles.actions}>
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.btn, styles.btnCancel, pressed && styles.btnPressed]}
          >
            <Text style={styles.btnCancelText}>{cancelLabel}</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            style={({ pressed }) => [
              styles.btn,
              destructive ? styles.btnDestructive : styles.btnPrimary,
              pressed && styles.btnPressed,
            ]}
          >
            <Text
              style={destructive ? styles.btnDestructiveText : styles.btnPrimaryText}
            >
              {confirmLabel}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: FrostColors.scrim,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ECE9E4',
    borderTopLeftRadius: FrostRadius.sheet,
    borderTopRightRadius: FrostRadius.sheet,
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: FrostSpace.m,
    paddingBottom: FrostSpace.xxxl,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: FrostColors.hairline,
    marginBottom: FrostSpace.l,
  },
  title: {
    ...FrostType.displayS,
    fontFamily: FrostFonts.display,
    fontStyle: 'italic',
    color: FrostColors.ink,
    marginBottom: FrostSpace.s,
  },
  body: {
    ...FrostType.bodyMedium,
    color: FrostColors.soft,
    marginBottom: FrostSpace.xl,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: FrostSpace.m,
    justifyContent: 'flex-end',
    marginTop: FrostSpace.s,
  },
  btn: {
    paddingHorizontal: FrostSpace.xl,
    paddingVertical: FrostSpace.m,
    borderRadius: FrostRadius.pill,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: { opacity: 0.85 },

  btnCancel: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
  },
  btnCancelText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: FrostColors.soft,
  },

  btnPrimary: {
    backgroundColor: FrostColors.ink,
  },
  btnPrimaryText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: FrostColors.white,
  },

  btnDestructive: {
    backgroundColor: FrostColors.goldTrue,
  },
  btnDestructiveText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: FrostColors.white,
  },
});
