/**
 * FrostCanvasShell — universal full-bleed canvas wrapper.
 *
 * Provides:
 *   - Consistent top bar (eyebrow text + close X)
 *   - Safe-area insets handled
 *   - StatusBar style switch (light for image-heavy canvases, dark for text)
 *   - Optional bottom bar slot
 *   - Optional background mode: 'image' (full colour, like Muse/Discover),
 *     'frost' (re-uses the FrostPane material, like Dream/Journey when at rest)
 *
 * Every Frost canvas should wrap its content in this component for visual
 * consistency across the app.
 */

import React from 'react';
import {
  View, Text, Pressable, StyleSheet, StatusBar, Image,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import {
  FrostColors, FrostType, FrostSpace, FrostLayout,
} from '../../constants/frost';
import FrostPane from './FrostPane';

type Mode = 'image' | 'frost' | 'plain';

interface FrostCanvasShellProps {
  /** Eyebrow shown in top bar (e.g. "MUSE", "DREAM"). */
  eyebrow: string;
  /** Image canvases set this — full-bleed background hero. */
  imageUri?: string;
  /** Background mode. Default: 'image' if imageUri provided, else 'frost'. */
  mode?: Mode;
  /** Page content. */
  children: React.ReactNode;
  /** Optional bottom bar (e.g. DreamAi compose input, Journey actions). */
  bottomBar?: React.ReactNode;
  /** Status bar tint. 'auto' picks based on mode. */
  statusBarStyle?: 'light' | 'dark' | 'auto';
  /** Override close behaviour. */
  onClose?: () => void;
  /**
   * Phase 1.5.2: when true, render the legacy deep-grey backdrop instead of
   * the bright paper default. Used by the Journey hub (the "doorway" surface).
   * Every other frost canvas inherits paper.
   */
  dim?: boolean;
}

export default function FrostCanvasShell({
  eyebrow,
  imageUri,
  mode,
  children,
  bottomBar,
  statusBarStyle = 'auto',
  onClose,
  dim = false,
}: FrostCanvasShellProps) {
  const insets = useSafeAreaInsets();

  const resolvedMode: Mode = mode ?? (imageUri ? 'image' : 'frost');
  const resolvedStatusBar =
    statusBarStyle === 'auto'
      ? resolvedMode === 'image'
        ? 'light'
        : 'dark'
      : statusBarStyle;

  const onCloseInternal = onClose ?? (() => router.back());

  // Top bar text colour depends on background mode + paper brightness
  const topBarTextColor =
    resolvedMode === 'image' ? FrostColors.white :
    dim ? FrostColors.muted : FrostColors.soft;
  const topBarIconColor =
    resolvedMode === 'image' ? FrostColors.white : FrostColors.ink;

  // Phase 1.6.2: when the canvas has a bottomBar (input row), wrap content +
  // bottomBar inside a KeyboardAvoidingView. This lifts the input above the
  // soft keyboard on Android and iOS instead of letting the keyboard cover it.
  // Without this, the absolutely-positioned bottomBar sat under the keyboard
  // (KAV ignores absolutely-positioned children).
  const Body = (
    <>
      {/* CONTENT */}
      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + FrostLayout.canvasTopBarHeight,
            // Only add bottom padding when no bottomBar — when there is one,
            // the flex-based layout puts the bottomBar below content directly.
            paddingBottom: bottomBar ? 0 : insets.bottom,
          },
        ]}
      >
        {children}
      </View>

      {/* BOTTOM BAR — flex-positioned (was absolute before Phase 1.6.2) */}
      {bottomBar ? (
        <View
          style={[
            styles.bottomBar,
            { paddingBottom: insets.bottom },
          ]}
        >
          {bottomBar}
        </View>
      ) : null}
    </>
  );

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle={resolvedStatusBar === 'light' ? 'light-content' : 'dark-content'}
      />

      {/* BACKGROUND */}
      {resolvedMode === 'image' && imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : resolvedMode === 'frost' ? (
        <FrostPane dim={dim} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: dim ? FrostColors.pageFallback : '#D8D3CC' }]} />
      )}

      {/* TOP BAR */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topBarLeft}>
          <View
            style={[
              styles.eyebrowDot,
              { backgroundColor: resolvedMode === 'image' ? FrostColors.white : (dim ? FrostColors.muted : FrostColors.soft) },
            ]}
          />
          <Text style={[styles.eyebrow, { color: topBarTextColor }]}>{eyebrow}</Text>
        </View>
        <Pressable onPress={onCloseInternal} hitSlop={16} style={styles.closeBtn}>
          <X size={22} color={topBarIconColor} strokeWidth={1.5} />
        </Pressable>
      </View>

      {/* CONTENT + BOTTOM BAR (KAV-wrapped when bottomBar exists) */}
      {bottomBar ? (
        <KeyboardAvoidingView
          style={styles.kavWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {Body}
        </KeyboardAvoidingView>
      ) : (
        Body
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FrostColors.black },

  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: FrostLayout.canvasTopBarHeight + 24,
    paddingHorizontal: FrostSpace.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: FrostSpace.s,
  },
  eyebrowDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.9,
  },
  eyebrow: {
    ...FrostType.eyebrowMedium,
    letterSpacing: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    flex: 1,
  },

  // Phase 1.6.2: KeyboardAvoidingView wrapper that takes the remaining vertical
  // space below the absolutely-positioned top bar, so its layout flow can lift
  // the bottomBar (input row) above the soft keyboard.
  kavWrap: {
    flex: 1,
  },

  bottomBar: {
    backgroundColor: 'rgba(244,242,238,0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: FrostColors.hairline,
  },
});
