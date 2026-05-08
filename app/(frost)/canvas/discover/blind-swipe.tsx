/**
 * Frost · Canvas · Discover · Blind Swipe (ZIP 6 — Tinder mechanics)
 *
 * Mechanics:
 *   - Full-bleed single approved Discover image at a time.
 *   - Right swipe  = HEART → save image to Muse + yellow heart animation centre.
 *   - Left swipe   = PASS → next image.
 *   - Double LEFT  = UNDO (brings back the last-passed image — accident recovery).
 *   - Double TAP   = HEART → save to Muse + yellow heart animation.
 *   - No vertical swipe. No carousel dots. No multi-image-per-card.
 *   - Tinder card translation feel: card follows finger horizontally, rotates,
 *     fades the next-card hint at the edges. Snap on release past threshold.
 *
 * Source of images: GET /api/v2/discover/blind-swipe (existing endpoint).
 * Save: saveToMuse({ imageUrl, vendorId? }) — routes through bride-chat.
 *
 * NOTE: Blind Swipe and Discovery Feed are unrelated. Hearts saved here do NOT
 * influence the Discovery Feed canvas.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, Pressable, StatusBar,
  Dimensions, PanResponder,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart, Undo2 } from 'lucide-react-native';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostCopy,
} from '../../../../constants/frost';
import { saveToMuse } from '../../../../services/frostApi';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD   = 120;          // distance from centre needed to commit
const SWIPE_VELOCITY    = 0.4;
const ROTATION_RANGE    = SCREEN_W * 1.5;
const TAP_MAX_MOVE      = 10;
const TAP_MAX_TIME      = 250;
const DOUBLE_TAP_MS     = 300;          // also used for double-LEFT detection
const SWIPE_OFF_DURATION = 220;

interface DiscoverImage {
  id: string;
  imageUrl: string;
  vendorId?: string;
}

// Placeholder pool. Replace with /api/v2/discover/blind-swipe results.
const PLACEHOLDER_IMAGES: DiscoverImage[] = [
  { id: 'i1', imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=85&auto=format&fit=crop' },
  { id: 'i2', imageUrl: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=1200&q=85&auto=format&fit=crop' },
  { id: 'i3', imageUrl: 'https://images.unsplash.com/photo-1583394293214-28a4b0843b1d?w=1200&q=85&auto=format&fit=crop' },
  { id: 'i4', imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=85&auto=format&fit=crop' },
  { id: 'i5', imageUrl: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=1200&q=85&auto=format&fit=crop' },
  { id: 'i6', imageUrl: 'https://images.unsplash.com/photo-1478146896981-b80fe463b330?w=1200&q=85&auto=format&fit=crop' },
  { id: 'i7', imageUrl: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=85&auto=format&fit=crop' },
  { id: 'i8', imageUrl: 'https://images.unsplash.com/photo-1529636798458-92182e662485?w=1200&q=85&auto=format&fit=crop' },
];

export default function BlindSwipe() {
  const insets = useSafeAreaInsets();
  const [images] = useState<DiscoverImage[]>(PLACEHOLDER_IMAGES);
  const [idx, setIdx] = useState(0);
  const [history, setHistory] = useState<number[]>([]);  // stack of indexes user has passed (for undo)
  const [toast, setToast] = useState<string | null>(null);

  // Card position
  const pan       = useRef(new Animated.ValueXY()).current;
  const heartPop  = useRef(new Animated.Value(0)).current;

  // Refs for state that the PanResponder closure needs to read at gesture-end time.
  // (PanResponder is created once via useRef, so direct state references would go stale.)
  const idxRef          = useRef(idx);
  const historyRef      = useRef(history);
  const imagesRef       = useRef(images);
  const panXRef         = useRef(0);   // tracks pan.x without poking private API
  const gestureStartRef = useRef(0);   // recorded in onPanResponderGrant

  // Tap / double-tap detection state
  const lastLeftTimeRef = useRef(0);
  const tapCountRef     = useRef(0);
  const lastTapTimeRef  = useRef(0);
  const tapTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync with the latest render values
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { imagesRef.current = images; }, [images]);

  // Subscribe pan.x → panXRef so we never read pan.x._value
  useEffect(() => {
    const id = pan.x.addListener(({ value }) => { panXRef.current = value; });
    return () => pan.x.removeListener(id);
  }, [pan.x]);

  const current = images[idx % images.length];
  const peek    = images[(idx + 1) % images.length];

  // ────────────────────────────────────────────────────────────────────────────
  // Animation helpers
  // ────────────────────────────────────────────────────────────────────────────

  const rotate = pan.x.interpolate({
    inputRange:  [-ROTATION_RANGE, 0, ROTATION_RANGE],
    outputRange: ['-18deg', '0deg', '18deg'],
    extrapolate: 'clamp',
  });
  const heartOpacity = pan.x.interpolate({
    inputRange:  [0, SWIPE_THRESHOLD * 0.4, SWIPE_THRESHOLD],
    outputRange: [0, 0.45, 0.9],
    extrapolate: 'clamp',
  });
  const passOpacity = pan.x.interpolate({
    inputRange:  [-SWIPE_THRESHOLD, -SWIPE_THRESHOLD * 0.4, 0],
    outputRange: [0.7, 0.35, 0],
    extrapolate: 'clamp',
  });
  const peekScale = pan.x.interpolate({
    inputRange:  [-SCREEN_W, 0, SCREEN_W],
    outputRange: [1, 0.94, 1],
    extrapolate: 'clamp',
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Save / advance / undo  (stable callbacks — read latest state via refs)
  // ────────────────────────────────────────────────────────────────────────────

  const flashHeart = () => {
    Animated.sequence([
      Animated.spring(heartPop, { toValue: 1, friction: 4, tension: 110, useNativeDriver: true }),
      Animated.delay(420),
      Animated.timing(heartPop, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const showToast = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(null), 1600);
  };

  const handleSaveCurrent = async () => {
    const cur = imagesRef.current[idxRef.current % imagesRef.current.length];
    flashHeart();
    showToast('Saved to Muse ♥');
    try {
      await saveToMuse({ imageUrl: cur.imageUrl, vendorId: cur.vendorId });
    } catch {
      // silent — toast already shown; optimistic UX
    }
  };

  const advanceTo = (nextIdx: number, fromX: number) => {
    Animated.timing(pan, {
      toValue: { x: fromX > 0 ? SCREEN_W * 1.4 : -SCREEN_W * 1.4, y: 0 },
      duration: SWIPE_OFF_DURATION,
      useNativeDriver: true,
    }).start(() => {
      setIdx(nextIdx);
      pan.setValue({ x: 0, y: 0 });
    });
  };

  const goNext = (_savedFirst: boolean, fromX: number) => {
    const cur = idxRef.current;
    setHistory((h) => [...h.slice(-19), cur]);
    advanceTo(cur + 1, fromX);
  };

  const goPass = (fromX: number) => {
    const cur = idxRef.current;
    setHistory((h) => [...h.slice(-19), cur]);
    advanceTo(cur + 1, fromX);
  };

  const undoLast = () => {
    const h = historyRef.current;
    if (h.length === 0) {
      showToast('Nothing to undo');
      return;
    }
    const last = h[h.length - 1];
    pan.setValue({ x: -SCREEN_W * 1.4, y: 0 });
    setIdx(last);
    setHistory(h.slice(0, -1));
    Animated.spring(pan, {
      toValue: { x: 0, y: 0 },
      friction: 7,
      tension: 80,
      useNativeDriver: true,
    }).start();
    showToast('Brought back');
  };

  // ────────────────────────────────────────────────────────────────────────────
  // PanResponder — card drag + tap detection (stable; reads via refs)
  // ────────────────────────────────────────────────────────────────────────────

  // Refs for handler functions so the PanResponder can call the latest closure
  const handleSaveCurrentRef = useRef(handleSaveCurrent);
  const goNextRef            = useRef(goNext);
  const goPassRef            = useRef(goPass);
  const undoLastRef          = useRef(undoLast);
  useEffect(() => { handleSaveCurrentRef.current = handleSaveCurrent; });
  useEffect(() => { goNextRef.current = goNext; });
  useEffect(() => { goPassRef.current = goPass; });
  useEffect(() => { undoLastRef.current = undoLast; });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        // Record gesture start time (replaces the old `(g as any).t0`)
        gestureStartRef.current = Date.now();
        // Use tracked panX value via listener ref (replaces `(pan.x as any)._value`)
        pan.setOffset({ x: panXRef.current, y: 0 });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, g) => {
        // Constrain mostly horizontal motion
        pan.setValue({ x: g.dx, y: g.dy * 0.15 });
      },
      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();
        const absX = Math.abs(g.dx);
        const absY = Math.abs(g.dy);
        const dt = Math.max(1, Date.now() - gestureStartRef.current);

        // TAP detection
        if (absX < TAP_MAX_MOVE && absY < TAP_MAX_MOVE && dt < TAP_MAX_TIME) {
          const now = Date.now();
          const since = now - lastTapTimeRef.current;
          if (since < DOUBLE_TAP_MS && tapCountRef.current >= 1) {
            if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
            tapCountRef.current = 0;
            handleSaveCurrentRef.current();
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
            return;
          }
          tapCountRef.current = 1;
          lastTapTimeRef.current = now;
          tapTimerRef.current = setTimeout(() => {
            tapCountRef.current = 0;
          }, DOUBLE_TAP_MS);
          // Single tap: Blind Swipe shows no detail overlay — just settle
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
          return;
        }

        // SWIPE detection — horizontal only
        const velocity = absX / dt;
        const passed = absX > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY;

        if (!passed || absY > absX) {
          // Snap back
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            useNativeDriver: true,
          }).start();
          return;
        }

        if (g.dx > 0) {
          // RIGHT = heart + save + advance
          handleSaveCurrentRef.current();
          goNextRef.current(true, g.dx);
        } else {
          // LEFT = pass — but check for double-left (undo)
          const now = Date.now();
          const sinceLastLeft = now - lastLeftTimeRef.current;
          if (sinceLastLeft < 600) {
            // DOUBLE LEFT — snap card back, then undo last pass
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              friction: 7,
              useNativeDriver: true,
            }).start(() => undoLastRef.current());
            lastLeftTimeRef.current = 0;
            return;
          }
          lastLeftTimeRef.current = now;
          goPassRef.current(g.dx);
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          friction: 6,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Cleanup tap timer on unmount
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Black scrim base */}
      <View style={styles.base} />

      {/* Peek card (next image) — sits behind the active card */}
      {peek ? (
        <Animated.View
          style={[
            styles.cardLayer,
            {
              transform: [{ scale: peekScale }],
            },
          ]}
          pointerEvents="none"
        >
          <Image source={{ uri: peek.imageUrl }} style={styles.image} resizeMode="cover" />
        </Animated.View>
      ) : null}

      {/* Active card — full-bleed, draggable */}
      <Animated.View
        style={[
          styles.cardLayer,
          {
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { rotate },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Image source={{ uri: current.imageUrl }} style={styles.image} resizeMode="cover" />

        {/* Live heart indicator (during right drag) */}
        <Animated.View
          pointerEvents="none"
          style={[styles.liveHeart, { opacity: heartOpacity }]}
        >
          <Heart
            size={92}
            color={FrostColors.white}
            fill={FrostColors.goldTrue}
            strokeWidth={1.5}
          />
        </Animated.View>

        {/* Live pass indicator (during left drag) */}
        <Animated.View
          pointerEvents="none"
          style={[styles.livePass, { opacity: passOpacity }]}
        >
          <Text style={styles.passText}>PASS</Text>
        </Animated.View>
      </Animated.View>

      {/* Centre heart pop on save (double-tap or right-swipe commit) */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.heartPop,
          {
            opacity: heartPop,
            transform: [{
              scale: heartPop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.25] }),
            }],
          },
        ]}
      >
        <Heart
          size={140}
          color={FrostColors.white}
          fill={FrostColors.goldTrue}
          strokeWidth={1.2}
        />
      </Animated.View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topBarLeft}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>{FrostCopy.discoverCanvas.blindSwipeEyebrow}</Text>
        </View>
        <Pressable onPress={() => router.back()} hitSlop={16} style={styles.closeBtn}>
          <X size={22} color={FrostColors.white} strokeWidth={1.5} />
        </Pressable>
      </View>

      {/* Bottom hint + undo affordance */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 18 }]}>
        <Pressable
          onPress={() => undoLast()}
          hitSlop={14}
          style={styles.undoBtn}
        >
          <Undo2 size={16} color={FrostColors.white} strokeWidth={1.5} />
          <Text style={styles.undoLabel}>Undo</Text>
        </Pressable>
        <Text style={styles.hint}>Right to save · Left to pass · Double-tap saves</Text>
      </View>

      {/* Toast */}
      {toast ? (
        <View style={[styles.toast, { bottom: insets.bottom + 80 }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: FrostColors.black },
  base: { ...StyleSheet.absoluteFillObject, backgroundColor: FrostColors.black },

  cardLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },

  liveHeart: {
    position: 'absolute',
    top: '38%',
    right: 36,
  },
  livePass: {
    position: 'absolute',
    top: '38%',
    left: 36,
    transform: [{ rotate: '-12deg' }],
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderWidth: 3,
    borderColor: FrostColors.white,
    borderRadius: 8,
  },
  passText: {
    fontFamily: FrostFonts.labelMedium,
    fontSize: 24,
    letterSpacing: 4,
    color: FrostColors.white,
  },

  heartPop: {
    position: 'absolute',
    top: '36%',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 30,
  },

  topBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: FrostSpace.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  topBarLeft: {
    flexDirection: 'row', alignItems: 'center', gap: FrostSpace.s,
  },
  eyebrowDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: FrostColors.white,
    opacity: 0.9,
  },
  eyebrow: {
    ...FrostType.eyebrowMedium,
    color: FrostColors.white,
    letterSpacing: 4,
  },
  closeBtn: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: FrostSpace.xxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  undoLabel: {
    fontFamily: FrostFonts.label,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: FrostColors.white,
  },
  hint: {
    fontFamily: FrostFonts.body,
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: 12,
  },

  toast: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 25,
  },
  toastText: {
    fontFamily: FrostFonts.body,
    fontSize: 13,
    color: FrostColors.white,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: FrostSpace.l,
    paddingVertical: FrostSpace.s,
    borderRadius: 100,
    overflow: 'hidden',
  },
});
