/**
 * Frost · Journey · Vendors (v3 — wired)
 *
 * The bride's team. Pipeline view: Considering \u2192 In Talks \u2192 Booked \u2192 Paid.
 * No status changes from here — the bride tells Dream Ai when something
 * moves. The page is the witness.
 *
 * One gesture: long-press a row \u2192 delete via FrostConfirmSheet.
 */

import React, { useCallback, useState } from 'react';
import {
  ScrollView, View, Text, Pressable, StyleSheet, RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostGestureHint from '../../../../components/frost/FrostGestureHint';
import FrostConfirmSheet from '../../../../components/frost/FrostConfirmSheet';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../constants/frost';
import { MUSE_LOOKS } from '../../../../constants/museTokens';
import { useMuseLook } from '../../../../hooks/useMuseLook';
import {
  fetchMyVendors, deleteVendor, CoupleVendor,
} from '../../../../services/frostApi';

function fmtINR(n: number): string {
  if (!n) return '₹0';
  return '₹' + n.toLocaleString('en-IN');
}

// Pipeline order, top to bottom. Status values from couple_vendors.status.
// Anything not in this list goes under "Other".
const PIPELINE: { key: string; label: string }[] = [
  { key: 'booked',         label: 'BOOKED' },
  { key: 'paid',           label: 'PAID' },
  { key: 'shortlisted',    label: 'SHORTLISTED' },
  { key: 'considering',    label: 'CONSIDERING' },
  { key: 'in_discussion',  label: 'IN TALKS' },
  { key: 'contacted',      label: 'IN TALKS' },
  { key: 'enquired',       label: 'ENQUIRED' },
  { key: 'declined',       label: 'PASSED ON' },
];

export default function JourneyVendors() {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  const [vendors, setVendors] = useState<CoupleVendor[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CoupleVendor | null>(null);

  const load = useCallback(async () => {
    setError(false);
    const r = await fetchMyVendors();
    if (r === null) { setError(true); setVendors([]); }
    else setVendors(r);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  const handleLongPress = useCallback((v: CoupleVendor) => {
    Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium);
    setDeleteTarget(v);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setVendors(prev => prev?.filter(x => x.id !== id) ?? null);
    const ok = await deleteVendor(id);
    if (!ok) load();
  }, [deleteTarget, load]);

  const all = vendors ?? [];
  const isEmpty = !loading && !error && all.length === 0;

  // Group by pipeline buckets, preserving order. Merge in_discussion+contacted.
  const groupMap = new Map<string, CoupleVendor[]>();
  for (const p of PIPELINE) groupMap.set(p.label, []);
  groupMap.set('OTHER', []);
  for (const v of all) {
    const status = (v.status || '').toLowerCase();
    const matched = PIPELINE.find(p => p.key === status);
    const label = matched ? matched.label : 'OTHER';
    groupMap.get(label)!.push(v);
  }
  // Build display list in pipeline order, skipping empty groups.
  const seenLabels = new Set<string>();
  const groups: { label: string; items: CoupleVendor[] }[] = [];
  for (const p of PIPELINE) {
    if (seenLabels.has(p.label)) continue;
    seenLabels.add(p.label);
    const items = groupMap.get(p.label) || [];
    if (items.length > 0) groups.push({ label: p.label, items });
  }
  const others = groupMap.get('OTHER') || [];
  if (others.length > 0) groups.push({ label: 'OTHER', items: others });

  return (
    <FrostCanvasShell eyebrow="JOURNEY · VENDORS" mode="frost">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FrostColors.goldMuted} />
        }
      >
        <Text style={[styles.heading, { color: tokens.ink }]}>My team.</Text>

        {all.length > 0 ? (
          <FrostGestureHint storageKey="vendors" text="Hold to remove. Tell Dream Ai to change anything else." />
        ) : null}

        {loading ? (
          <View style={styles.stateWrap}><Text style={styles.loadingDots}>…</Text></View>
        ) : error ? (
          <Text style={[styles.errorText, { color: tokens.soft }]}>I couldn't reach the page. Pull down to try again.</Text>
        ) : isEmpty ? (
          <Text style={[styles.emptyText, { color: tokens.soft }]}>No one yet.</Text>
        ) : (
          groups.map(g => (
            <View key={g.label} style={styles.section}>
              <Text style={[styles.sectionLabel, { color: tokens.soft }]}>{g.label}</Text>
              {g.items.map(v => (
                <VendorRow
                  key={v.id}
                  vendor={v}
                  onLongPress={() => handleLongPress(v)}
                  inkColor={tokens.ink}
                  softColor={tokens.soft}
                  hairlineColor={tokens.hairline}
                />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <FrostConfirmSheet
        visible={!!deleteTarget}
        title={'Remove this vendor?'}
        body={deleteTarget ? `${deleteTarget.name} will be removed from your team. Ask Dream Ai if you want them back.` : ''}
        confirmLabel="Remove"
        cancelLabel="Keep"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </FrostCanvasShell>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

function VendorRow({
  vendor, onLongPress, inkColor, softColor, hairlineColor,
}: {
  vendor: CoupleVendor;
  onLongPress: () => void;
  inkColor: string;
  softColor: string;
  hairlineColor: string;
}) {
  const initial = (vendor.category?.[0] || vendor.name?.[0] || '·').toUpperCase();
  // PATCH B-5: for booked rows with a quote, replace bare quote with
  // "₹X of ₹Y paid" payment-progress line. Other statuses keep the bare
  // quote format. Paid bucket already shows PAID via the section label,
  // so no progress line needed there either.
  const isBooked = vendor.status === 'booked';
  const paidTotal = Number(vendor.paid_total) || 0;
  const quotedTotal = Number(vendor.quoted_total) || 0;
  const moneyChunk = isBooked && quotedTotal > 0
    ? `${fmtINR(paidTotal)} of ${fmtINR(quotedTotal)} paid`
    : (vendor.quoted_total ? fmtINR(vendor.quoted_total) : null);
  const meta = [
    vendor.category,
    (vendor.events && vendor.events.length > 0) ? vendor.events.join(', ') : null,
    moneyChunk,
  ].filter(Boolean).join(' · ');

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={420}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.avatar, { borderColor: hairlineColor }]}>
        <Text style={[styles.avatarText, { color: softColor }]}>{initial}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowName, { color: inkColor }]} numberOfLines={1}>{vendor.name}</Text>
        {meta ? <Text style={[styles.rowMeta, { color: softColor }]} numberOfLines={1}>{meta}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: FrostSpace.xl,
    paddingBottom: FrostSpace.huge,
  },
  heading: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 26, lineHeight: 30,
    color: FrostColors.ink,
    letterSpacing: 0.3,
  },
  section: { marginTop: FrostSpace.xl },
  sectionLabel: {
    fontFamily: FrostFonts.label,
    fontSize: 9, fontWeight: '300',
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    color: FrostColors.soft,
    marginBottom: FrostSpace.m,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FrostSpace.l,
    gap: FrostSpace.m,
  },
  rowPressed: { opacity: 0.7 },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: FrostColors.hairline,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: {
    fontFamily: FrostFonts.label,
    fontSize: 11,
    color: FrostColors.soft,
  },
  rowName: {
    ...FrostType.bodyLarge,
    color: FrostColors.ink,
  },
  rowMeta: {
    ...FrostType.bodySmall,
    color: FrostColors.soft,
    marginTop: 2,
  },
  stateWrap: { paddingTop: 80, alignItems: 'center' },
  loadingDots: {
    fontFamily: FrostFonts.display,
    fontSize: 36,
    color: FrostColors.goldMuted,
    letterSpacing: 6,
  },
  emptyText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 18, lineHeight: 24,
    color: FrostColors.soft,
    textAlign: 'center',
    paddingTop: 80,
  },
  errorText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 16, lineHeight: 22,
    color: FrostColors.soft,
    textAlign: 'center',
    paddingTop: 80,
  },
});
