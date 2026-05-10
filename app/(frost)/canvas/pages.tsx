/**
 * Frost · Canvas · Pages (Sanctuary mode — Session 29 evening)
 *
 * The bride's reference desk. Reached only from Sanctuary mode (the calm
 * register, no photos). Three slices today: By vendor · By money · By date.
 * Reuses MUSE_LOOKS tokens via useMuseLook() so tonal mode (E1/E3) follows
 * her current home selection — single source of truth lives on landing.
 *
 * Interaction:
 *   - Tap a slice         → 200ms cross-fade. Menu fades out, slice fades in.
 *                           Same room, different page. Editorial pace.
 *   - Top-left chevron    → On menu: router.back() to home.
 *                           On slice: cross-fade back to menu.
 *
 * Empty states are deliberate, not broken:
 *   - "Nothing here yet" in italic Cormorant when a slice has zero rows.
 *
 * Excluded from "By date": raw Dream Ai chat content. Anything Dream Ai
 * acted on (booked, logged, expensed) appears as an artefact. Vented thoughts
 * stay in chat.
 *
 * Carries forward to next sessions:
 *   - More slices (by category, by people, by event) — Session B+
 *   - Per-row deep links into vendor / expense detail surfaces (today: vendor
 *     rows route to existing vendor canvas; expenses don't yet)
 */

import React, { useCallback, useState, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator,
  StatusBar, Animated, Easing, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FrostFonts } from '../../../constants/frost';
import { MUSE_LOOKS, type MuseLookTokens } from '../../../constants/museTokens';
import { useMuseLook } from '../../../hooks/useMuseLook';
import {
  fetchPagesSlice,
  type PagesSliceKey,
  type PagesVendorRow,
  type PagesMoneyRow,
  type PagesDateRow,
} from '../../../services/pagesApi';

const SLICE_OPTIONS: { key: PagesSliceKey; label: string }[] = [
  { key: 'vendors', label: 'By vendor' },
  { key: 'money',   label: 'By money' },
  { key: 'dates',   label: 'By date' },
];

const FADE_MS = 200;

export default function FrostPagesCanvas() {
  const insets = useSafeAreaInsets();
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  const styles = makeStyles(tokens);

  // Slice state — null means menu is showing
  const [activeSlice, setActiveSlice] = useState<PagesSliceKey | null>(null);
  const [sliceData, setSliceData] = useState<any>(null);
  const [sliceLoading, setSliceLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Cross-fade animation values
  const menuFade  = useRef(new Animated.Value(1)).current;
  const sliceFade = useRef(new Animated.Value(0)).current;

  const loadSlice = useCallback(async (slice: PagesSliceKey) => {
    setSliceLoading(true);
    try {
      const r = await fetchPagesSlice(slice);
      if (r?.success) {
        setSliceData(r);
      } else {
        setSliceData(null);
      }
    } catch {
      setSliceData(null);
    } finally {
      setSliceLoading(false);
    }
  }, []);

  const goToSlice = useCallback((slice: PagesSliceKey) => {
    setActiveSlice(slice);
    setSliceData(null);
    Animated.sequence([
      Animated.timing(menuFade,  { toValue: 0, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(sliceFade, { toValue: 1, duration: FADE_MS, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
    ]).start();
    loadSlice(slice);
  }, [loadSlice, menuFade, sliceFade]);

  const goBackToMenu = useCallback(() => {
    Animated.sequence([
      Animated.timing(sliceFade, { toValue: 0, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(menuFade,  { toValue: 1, duration: FADE_MS, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
    ]).start(() => {
      setActiveSlice(null);
      setSliceData(null);
    });
  }, [menuFade, sliceFade]);

  const handleClose = useCallback(() => {
    if (activeSlice) {
      goBackToMenu();
    } else {
      router.back();
    }
  }, [activeSlice, goBackToMenu]);

  const handleRefresh = useCallback(async () => {
    if (!activeSlice) return;
    setRefreshing(true);
    try {
      await loadSlice(activeSlice);
    } finally {
      setRefreshing(false);
    }
  }, [activeSlice, loadSlice]);

  return (
    <View style={[styles.root, { backgroundColor: tokens.pagePaper }]}>
      <StatusBar barStyle={tokens.statusBarStyle} backgroundColor={tokens.pagePaper} />

      {/* HEADER ROW */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 14 }]}>
        <Pressable onPress={handleClose} hitSlop={16} style={styles.backTouch}>
          <Text style={[styles.backChevron, { color: tokens.closeColor }]}>‹</Text>
        </Pressable>
        <Text style={[styles.eyebrow, { color: tokens.brassMuted }]}>PAGES</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* MENU LAYER */}
      <Animated.View
        pointerEvents={activeSlice ? 'none' : 'auto'}
        style={[styles.layer, { opacity: menuFade, top: insets.top + 60 }]}
      >
        <View style={styles.menuWrap}>
          <Text style={[styles.headline, { color: tokens.brass }]}>
            What would you like to see?
          </Text>
          <View style={styles.menuList}>
            {SLICE_OPTIONS.map((s) => (
              <Pressable
                key={s.key}
                onPress={() => goToSlice(s.key)}
                style={({ pressed }) => [
                  styles.menuRow,
                  { borderBottomColor: tokens.hairline },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.menuLabel, { color: tokens.ink }]}>{s.label}</Text>
                <Text style={[styles.menuChevron, { color: tokens.brassMuted }]}>›</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* SLICE LAYER */}
      <Animated.View
        pointerEvents={activeSlice ? 'auto' : 'none'}
        style={[styles.layer, { opacity: sliceFade, top: insets.top + 60 }]}
      >
        {activeSlice ? (
          <SliceContent
            slice={activeSlice}
            data={sliceData}
            loading={sliceLoading}
            tokens={tokens}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// SliceContent — body for any of the three slices
// ─────────────────────────────────────────────────────────────────────────

interface SliceContentProps {
  slice: PagesSliceKey;
  data: any;
  loading: boolean;
  tokens: MuseLookTokens;
  refreshing: boolean;
  onRefresh: () => void;
}

function SliceContent({ slice, data, loading, tokens, refreshing, onRefresh }: SliceContentProps) {
  const styles = makeStyles(tokens);
  const sliceLabel =
    slice === 'vendors' ? 'By vendor' :
    slice === 'money'   ? 'By money'  :
                          'By date';

  const isEmpty =
    !loading && (!data || (
      slice === 'dates' ? (data.data || []).length === 0 :
      Object.keys(data.data || {}).length === 0
    ));

  return (
    <ScrollView
      style={styles.sliceScroll}
      contentContainerStyle={styles.sliceContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={tokens.brassMuted}
        />
      }
    >
      <Text style={[styles.sliceTitle, { color: tokens.brass }]}>{sliceLabel}</Text>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={tokens.brassMuted} />
        </View>
      ) : isEmpty ? (
        <Text style={[styles.emptyText, { color: tokens.soft }]}>
          Nothing here yet.
        </Text>
      ) : slice === 'vendors' ? (
        <VendorsSlice data={data} tokens={tokens} />
      ) : slice === 'money' ? (
        <MoneySlice data={data} tokens={tokens} />
      ) : (
        <DatesSlice data={data} tokens={tokens} />
      )}
    </ScrollView>
  );
}

// ─── BY VENDOR ─────────────────────────────────────────────────────────────
function VendorsSlice({ data, tokens }: { data: any; tokens: MuseLookTokens }) {
  const styles = makeStyles(tokens);
  const grouped = data.data || {};
  const categoryKeys = Object.keys(grouped).sort();

  return (
    <>
      {categoryKeys.map((category) => {
        const vendors = grouped[category] as PagesVendorRow[];
        return (
          <View key={category} style={styles.groupBlock}>
            <Text style={[styles.groupEyebrow, { color: tokens.brassMuted }]}>
              {category.toUpperCase()}
            </Text>
            {vendors.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => {
                  router.push(`/(frost)/canvas/journey/vendor/${v.id}` as any);
                }}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: tokens.hairline },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: tokens.ink }]} numberOfLines={1}>
                    {v.name}
                  </Text>
                  {v.status ? (
                    <Text style={[styles.rowSub, { color: tokens.soft }]} numberOfLines={1}>
                      {v.status}
                      {v.quoted_total ? ` · ₹${formatCurrency(v.quoted_total)}` : ''}
                    </Text>
                  ) : null}
                </View>
                {v.balance_due_date ? (
                  <Text style={[styles.rowMeta, { color: tokens.brassMuted }]}>
                    {formatShortDate(v.balance_due_date)}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        );
      })}
      <View style={styles.groupFoot}>
        <Text style={[styles.footText, { color: tokens.soft }]}>
          {data.total} {data.total === 1 ? 'vendor' : 'vendors'} held.
        </Text>
      </View>
    </>
  );
}

// ─── BY MONEY ──────────────────────────────────────────────────────────────
function MoneySlice({ data, tokens }: { data: any; tokens: MuseLookTokens }) {
  const styles = makeStyles(tokens);
  const grouped = data.data || {};
  const groupKeys = Object.keys(grouped).sort();
  const totals = data.totals || { planned: 0, actual: 0, outstanding: 0 };

  return (
    <>
      {groupKeys.map((groupKey) => {
        const expenses = grouped[groupKey] as PagesMoneyRow[];
        const groupTotal = expenses.reduce((s, e) => s + Number(e.actual_amount || e.planned_amount || 0), 0);
        return (
          <View key={groupKey} style={styles.groupBlock}>
            <View style={styles.groupHead}>
              <Text style={[styles.groupEyebrow, { color: tokens.brassMuted }]}>
                {groupKey.toUpperCase()}
              </Text>
              <Text style={[styles.groupHeadAmount, { color: tokens.brassMuted }]}>
                ₹{formatCurrency(groupTotal)}
              </Text>
            </View>
            {expenses.map((e) => (
              <View
                key={e.id}
                style={[styles.row, { borderBottomColor: tokens.hairline }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: tokens.ink }]} numberOfLines={1}>
                    {e.description || 'Expense'}
                  </Text>
                  {e.payment_status ? (
                    <Text style={[styles.rowSub, { color: tokens.soft }]} numberOfLines={1}>
                      {e.payment_status === 'paid' ? 'Paid' : `Due ${e.payment_status}`}
                      {e.due_date ? ` · ${formatShortDate(e.due_date)}` : ''}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.rowMeta, { color: tokens.ink }]}>
                  ₹{formatCurrency(Number(e.actual_amount || e.planned_amount || 0))}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
      <View style={styles.totalsBlock}>
        <View style={[styles.totalsRow, { borderBottomColor: tokens.hairline }]}>
          <Text style={[styles.totalsLabel, { color: tokens.soft }]}>Planned</Text>
          <Text style={[styles.totalsValue, { color: tokens.ink }]}>₹{formatCurrency(totals.planned)}</Text>
        </View>
        <View style={[styles.totalsRow, { borderBottomColor: tokens.hairline }]}>
          <Text style={[styles.totalsLabel, { color: tokens.soft }]}>Actual</Text>
          <Text style={[styles.totalsValue, { color: tokens.ink }]}>₹{formatCurrency(totals.actual)}</Text>
        </View>
        <View style={[styles.totalsRow, styles.totalsRowLast]}>
          <Text style={[styles.totalsLabel, { color: tokens.soft }]}>Outstanding</Text>
          <Text style={[styles.totalsValue, { color: tokens.brass }]}>₹{formatCurrency(totals.outstanding)}</Text>
        </View>
      </View>
    </>
  );
}

// ─── BY DATE ───────────────────────────────────────────────────────────────
function DatesSlice({ data, tokens }: { data: any; tokens: MuseLookTokens }) {
  const styles = makeStyles(tokens);
  const items = (data.data || []) as PagesDateRow[];

  return (
    <View style={styles.groupBlock}>
      {items.map((item) => (
        <View
          key={item.id}
          style={[styles.row, { borderBottomColor: tokens.hairline }]}
        >
          <View style={styles.dateMarker}>
            <Text style={[styles.dateMarkerText, { color: tokens.brassMuted }]}>
              {formatTinyDate(item.date)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowLabel, { color: tokens.ink }]} numberOfLines={2}>
              {item.label}
            </Text>
            {item.sub ? (
              <Text style={[styles.rowSub, { color: tokens.soft }]} numberOfLines={1}>
                {item.sub}
              </Text>
            ) : null}
          </View>
          {item.amount ? (
            <Text style={[styles.rowMeta, { color: tokens.brassMuted }]}>
              ₹{formatCurrency(Number(item.amount))}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ─── Format helpers ────────────────────────────────────────────────────────
function formatCurrency(n: number): string {
  if (!n) return '0';
  if (n >= 100000) {
    const lakh = n / 100000;
    return `${lakh.toFixed(lakh >= 10 ? 1 : 2)}L`;
  }
  return new Intl.NumberFormat('en-IN').format(Math.round(n));
}

function formatShortDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function formatTinyDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase();
  } catch {
    return '';
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────
const makeStyles = (_t: MuseLookTokens) => StyleSheet.create({
  root: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18, paddingBottom: 14,
  },
  backTouch: {
    width: 32, height: 32,
    alignItems: 'flex-start', justifyContent: 'center',
  },
  backChevron: {
    fontFamily: FrostFonts.display,
    fontSize: 32, lineHeight: 32,
  },
  eyebrow: {
    fontFamily: FrostFonts.label, fontWeight: '300',
    fontSize: 10, letterSpacing: 4, textTransform: 'uppercase',
  },
  headerSpacer: { width: 32 },

  layer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    paddingTop: 80,
  },

  menuWrap: {
    flex: 1,
    paddingHorizontal: 28, paddingTop: 40,
  },
  headline: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 28, lineHeight: 36,
    marginBottom: 36,
  },
  menuList: {},
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuLabel: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 22,
  },
  menuChevron: {
    fontFamily: FrostFonts.display,
    fontSize: 22,
  },

  sliceScroll: {
    flex: 1,
  },
  sliceContent: {
    paddingHorizontal: 24, paddingTop: 24, paddingBottom: 80,
  },
  sliceTitle: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 24, marginBottom: 28,
  },
  loadingWrap: {
    paddingTop: 60, alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 18, lineHeight: 26,
    marginTop: 40, textAlign: 'center',
    opacity: 0.7,
  },

  groupBlock: {
    marginBottom: 28,
  },
  groupHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 10,
  },
  groupEyebrow: {
    fontFamily: FrostFonts.label, fontWeight: '300',
    fontSize: 9, letterSpacing: 3.6, textTransform: 'uppercase',
    marginBottom: 10,
  },
  groupHeadAmount: {
    fontFamily: FrostFonts.label, fontWeight: '300',
    fontSize: 11, letterSpacing: 1.5,
  },
  groupFoot: {
    paddingTop: 16, alignItems: 'center',
  },
  footText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 13,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  rowLabel: {
    fontFamily: FrostFonts.body, fontWeight: '400',
    fontSize: 14, lineHeight: 19,
  },
  rowSub: {
    fontFamily: FrostFonts.body, fontWeight: '300',
    fontSize: 11, lineHeight: 16,
    marginTop: 2,
  },
  rowMeta: {
    fontFamily: FrostFonts.label, fontWeight: '300',
    fontSize: 11, letterSpacing: 0.6,
  },

  dateMarker: {
    width: 56,
  },
  dateMarkerText: {
    fontFamily: FrostFonts.label, fontWeight: '300',
    fontSize: 9, letterSpacing: 1.6,
  },

  totalsBlock: {
    marginTop: 8,
    paddingTop: 16,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  totalsRowLast: {
    borderBottomWidth: 0,
  },
  totalsLabel: {
    fontFamily: FrostFonts.label, fontWeight: '300',
    fontSize: 10, letterSpacing: 2.4, textTransform: 'uppercase',
  },
  totalsValue: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 18,
  },
});
