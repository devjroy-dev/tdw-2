/**
 * Frost · Journey · Vendor Profile (3.4 — real data, mode-aware)
 *
 * Fetches the bride's vendor row by id from couple_vendors and renders
 * real data. No placeholder blocks — sections only render when data exists.
 *
 * Data sources:
 *   - fetchMyVendors()  → find the matching row by id
 *   - fetchMyExpenses() → filter by vendor_name (case-insensitive) for payment summary
 *
 * Mode-awareness: useMuseLook() so E1/E3 tonal mode follows home_mode.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, ActivityIndicator,
  Pressable, Linking,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import FrostCanvasShell from '../../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostRadius,
} from '../../../../../constants/frost';
import { MUSE_LOOKS } from '../../../../../constants/museTokens';
import { useMuseLook } from '../../../../../hooks/useMuseLook';
import {
  fetchMyVendors, fetchMyExpenses,
  CoupleVendor, Expense,
} from '../../../../../services/frostApi';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return '₹' + n.toLocaleString('en-IN');
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function statusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'booked':   return 'BOOKED';
    case 'enquired': return 'ENQUIRED';
    case 'declined': return 'DECLINED';
    default:         return status?.toUpperCase() ?? 'ADDED';
  }
}

function statusColor(status: string | null | undefined, brass: string, soft: string): string {
  switch (status) {
    case 'booked':   return brass;
    case 'enquired': return soft;
    default:         return soft;
  }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function VendorProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const look   = useMuseLook();
  const tokens = MUSE_LOOKS[look];

  const [vendor,   setVendor]   = useState<CoupleVendor | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const [vendors, exps] = await Promise.all([
      fetchMyVendors(),
      fetchMyExpenses(),
    ]);
    if (!vendors) { setLoading(false); setNotFound(true); return; }

    const match = vendors.find(v => v.id === id);
    if (!match) { setLoading(false); setNotFound(true); return; }

    setVendor(match);

    // Filter expenses by vendor_name — case-insensitive, same pattern as B-5
    const name = match.name?.toLowerCase() ?? '';
    const linked = (exps ?? []).filter(
      e => (e.vendor_name ?? '').toLowerCase() === name
    );
    setExpenses(linked);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <FrostCanvasShell eyebrow="JOURNEY · VENDOR" mode="frost">
        <View style={styles.center}>
          <ActivityIndicator color={tokens.brassMuted} />
        </View>
      </FrostCanvasShell>
    );
  }

  if (notFound || !vendor) {
    return (
      <FrostCanvasShell eyebrow="JOURNEY · VENDOR" mode="frost">
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: tokens.soft }]}>
            Vendor not found.
          </Text>
        </View>
      </FrostCanvasShell>
    );
  }

  // ── Derived data ────────────────────────────────────────────────────────────
  const paid    = expenses
    .filter(e => e.payment_status === 'paid')
    .reduce((sum, e) => sum + (e.actual_amount ?? e.planned_amount ?? 0), 0);
  const planned = expenses
    .reduce((sum, e) => sum + (e.planned_amount ?? 0), 0);
  const balance = (vendor.quoted_total ?? planned) - paid;

  const hasContact = !!(vendor.phone || vendor.email || vendor.website);
  const hasEvents  = Array.isArray(vendor.events) && vendor.events.length > 0;
  const hasPricing = !!(vendor.quoted_total || expenses.length > 0);

  return (
    <FrostCanvasShell
      eyebrow="JOURNEY · VENDOR"
      mode="frost"
      statusBarStyle={tokens.statusBarStyle === 'light-content' ? 'light' : 'dark'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <View style={styles.header}>
          {vendor.category ? (
            <Text style={[styles.eyebrow, { color: tokens.brassMuted }]}>
              {vendor.category.toUpperCase()}
            </Text>
          ) : null}
          <Text style={[styles.name, { color: tokens.ink }]}>{vendor.name}</Text>
          <Text style={[
            styles.statusBadge,
            { color: statusColor(vendor.status, tokens.brass, tokens.soft) },
          ]}>
            {statusLabel(vendor.status)}
          </Text>
        </View>

        {/* ── Pricing ────────────────────────────────────────────────────── */}
        {hasPricing ? (
          <Section label="Pricing" tokens={tokens}>
            <Row label="Quoted" value={fmt(vendor.quoted_total)} tokens={tokens} />
            <Row label="Paid"   value={fmt(paid)}                tokens={tokens} />
            <Row label="Balance" value={fmt(balance)}            tokens={tokens} highlight={balance > 0} />
            {vendor.balance_due_date ? (
              <Row label="Due date" value={fmtDate(vendor.balance_due_date)} tokens={tokens} />
            ) : null}
          </Section>
        ) : null}

        {/* ── Events ─────────────────────────────────────────────────────── */}
        {hasEvents ? (
          <Section label="Events" tokens={tokens}>
            {(vendor.events as string[]).map((ev, i) => (
              <View key={i} style={[styles.eventRow, { borderBottomColor: tokens.hairline }]}>
                <View style={[styles.eventDot, { backgroundColor: tokens.brassMuted }]} />
                <Text style={[styles.eventLabel, { color: tokens.ink }]}>{ev}</Text>
              </View>
            ))}
          </Section>
        ) : null}

        {/* ── Contact ────────────────────────────────────────────────────── */}
        {hasContact ? (
          <Section label="Contact" tokens={tokens}>
            {vendor.phone ? (
              <ContactRow
                label="Phone"
                value={vendor.phone}
                onPress={() => Linking.openURL(`tel:${vendor.phone}`)}
                tokens={tokens}
              />
            ) : null}
            {vendor.email ? (
              <ContactRow
                label="Email"
                value={vendor.email}
                onPress={() => Linking.openURL(`mailto:${vendor.email}`)}
                tokens={tokens}
              />
            ) : null}
            {vendor.website ? (
              <ContactRow
                label="Website"
                value={vendor.website}
                onPress={() => Linking.openURL(vendor.website!)}
                tokens={tokens}
              />
            ) : null}
          </Section>
        ) : null}

        {/* ── Notes ──────────────────────────────────────────────────────── */}
        {vendor.notes ? (
          <Section label="Notes" tokens={tokens}>
            <Text style={[styles.notesText, { color: tokens.soft }]}>
              {vendor.notes}
            </Text>
          </Section>
        ) : null}

        {/* ── Expenses list ──────────────────────────────────────────────── */}
        {expenses.length > 0 ? (
          <Section label="Expenses" tokens={tokens}>
            {expenses.map(e => (
              <View key={e.id} style={[styles.expenseRow, { borderBottomColor: tokens.hairline }]}>
                <View style={styles.expenseLeft}>
                  <Text style={[styles.expenseDesc, { color: tokens.ink }]} numberOfLines={1}>
                    {e.description || e.category || 'Expense'}
                  </Text>
                  {e.due_date ? (
                    <Text style={[styles.expenseMeta, { color: tokens.soft }]}>
                      Due {fmtDate(e.due_date)}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.expenseRight}>
                  <Text style={[styles.expenseAmount, { color: tokens.ink }]}>
                    {fmt(e.actual_amount ?? e.planned_amount)}
                  </Text>
                  <Text style={[
                    styles.expenseStatus,
                    { color: e.payment_status === 'paid' ? tokens.brass : tokens.soft },
                  ]}>
                    {e.payment_status === 'paid' ? 'Paid' : 'Pending'}
                  </Text>
                </View>
              </View>
            ))}
          </Section>
        ) : null}

        {/* Empty state — vendor added but no data yet */}
        {!hasPricing && !hasEvents && !hasContact && !vendor.notes && expenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: tokens.soft }]}>
              Nothing here yet.{'\n'}Ask Dream Ai to fill this in.
            </Text>
          </View>
        ) : null}

      </ScrollView>
    </FrostCanvasShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  label, tokens, children,
}: {
  label: string;
  tokens: any;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: tokens.brassMuted }]}>
        {label.toUpperCase()}
      </Text>
      <FrostedSurface mode="panel" radius={FrostRadius.box} style={styles.sectionCard}>
        {children}
      </FrostedSurface>
    </View>
  );
}

function Row({
  label, value, tokens, highlight = false,
}: {
  label: string; value: string;
  tokens: any;
  highlight?: boolean;
}) {
  return (
    <View style={[styles.row, { borderBottomColor: tokens.hairline }]}>
      <Text style={[styles.rowLabel, { color: tokens.soft }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: highlight ? tokens.brass : tokens.ink }]}>
        {value}
      </Text>
    </View>
  );
}

function ContactRow({
  label, value, onPress, tokens,
}: {
  label: string; value: string;
  onPress: () => void;
  tokens: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: tokens.hairline },
        pressed && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.rowLabel, { color: tokens.soft }]}>{label}</Text>
      <Text style={[styles.rowValue, styles.rowLink, { color: tokens.brass }]} numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: FrostSpace.xl,
    paddingBottom: FrostSpace.huge,
  },
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },

  // Header
  header: {
    marginBottom: FrostSpace.xxl,
  },
  eyebrow: {
    fontFamily: FrostFonts.label,
    fontSize: 9,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    marginBottom: FrostSpace.xs,
  },
  name: {
    fontFamily: 'CormorantGaramond_400Regular_Italic',
    fontSize: 28, lineHeight: 34,
    letterSpacing: 0.3,
    marginBottom: FrostSpace.xs,
  },
  statusBadge: {
    fontFamily: FrostFonts.label,
    fontSize: 9,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },

  // Section
  section: {
    marginBottom: FrostSpace.xl,
  },
  sectionLabel: {
    fontFamily: FrostFonts.label,
    fontSize: 9,
    letterSpacing: 3.5,
    textTransform: 'uppercase',
    marginBottom: FrostSpace.s,
  },
  sectionCard: {
    overflow: 'hidden',
  },

  // Row (pricing / contact)
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: FrostSpace.m,
    paddingHorizontal: FrostSpace.l,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontFamily: FrostFonts.body,
    fontSize: 13,
  },
  rowValue: {
    fontFamily: FrostFonts.bodyMedium,
    fontSize: 13,
    textAlign: 'right',
    flex: 1,
    marginLeft: FrostSpace.m,
  },
  rowLink: {
    textDecorationLine: 'underline',
  },

  // Events
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FrostSpace.m,
    paddingHorizontal: FrostSpace.l,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: FrostSpace.m,
  },
  eventDot: {
    width: 5, height: 5, borderRadius: 3,
  },
  eventLabel: {
    fontFamily: FrostFonts.body,
    fontSize: 14,
  },

  // Expenses
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: FrostSpace.m,
    paddingHorizontal: FrostSpace.l,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  expenseLeft: { flex: 1, marginRight: FrostSpace.m },
  expenseRight: { alignItems: 'flex-end' },
  expenseDesc: {
    fontFamily: FrostFonts.body,
    fontSize: 13,
  },
  expenseMeta: {
    fontFamily: FrostFonts.label,
    fontSize: 10,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  expenseAmount: {
    fontFamily: FrostFonts.bodyMedium,
    fontSize: 13,
  },
  expenseStatus: {
    fontFamily: FrostFonts.label,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // Notes
  notesText: {
    fontFamily: FrostFonts.body,
    fontSize: 14,
    lineHeight: 22,
    padding: FrostSpace.l,
  },

  // Empty
  emptyState: {
    marginTop: FrostSpace.xxl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'CormorantGaramond_300Light_Italic',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
  },
});
