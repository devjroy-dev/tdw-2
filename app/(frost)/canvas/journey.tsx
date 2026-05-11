/**
 * Frost · Canvas · Journey (ZIP 9 — hub redesign)
 *
 * Primary tier: 2×2 frosted grid (Circle, Money, Tasks, Vendors)
 * Secondary tier: compact list rows (Events, Guests, Hot Dates, Messages, Couture, Honeymoon)
 * Circle tile shows a live gold count pill (refreshes every 30s on focus).
 */

import React, { useState, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  Users, DollarSign, CheckSquare, Store,
  Calendar, UserCheck, MessageCircle, Settings,
  Scissors, Plane, ChevronRight,
} from 'lucide-react-native';
import FrostCanvasShell from '../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostCopy, FrostRadius,
} from '../../../constants/frost';
import { MUSE_LOOKS } from '../../../constants/museTokens';
import { useMuseLook } from '../../../hooks/useMuseLook';
import { fetchCircleUnreadCount } from '../../../services/frostApi';

interface PrimaryTool {
  key: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  subtitle: string;
  route: string;
}

const PRIMARY: PrimaryTool[] = [
  { key: 'circle',   Icon: Users,       title: 'Circle',   subtitle: 'Family, planners,\nyour people',  route: '/(frost)/canvas/journey/circle' },
  { key: 'expenses', Icon: DollarSign,  title: 'Expenses', subtitle: 'What I owe,\nwhat I have paid',  route: '/(frost)/canvas/journey/expenses' },
  { key: 'tasks',    Icon: CheckSquare, title: 'Reminders',subtitle: 'What needs\nto happen',           route: '/(frost)/canvas/journey/reminders' },
  { key: 'vendors',  Icon: Store,       title: 'Vendors',  subtitle: 'My team',                         route: '/(frost)/canvas/journey/vendors' },
];

interface SecondaryTool {
  key: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  route: string;
}

const SECONDARY: SecondaryTool[] = [
  { key: 'events',    Icon: Calendar,      title: 'Events',    route: '/(frost)/canvas/journey/events' },
  { key: 'broadcast', Icon: UserCheck,     title: 'My people', route: '/(frost)/canvas/journey/broadcast' },
  { key: 'messages',  Icon: MessageCircle, title: 'Messages',  route: '/(frost)/canvas/journey/messages' },
  { key: 'couture',   Icon: Scissors,      title: 'Couture',   route: '/(frost)/canvas/journey/couture' },
  { key: 'honeymoon', Icon: Plane,         title: 'Honeymoon', route: '/(frost)/canvas/journey/honeymoon' },
  { key: 'settings',  Icon: Settings,      title: 'Settings',  route: '/(frost)/canvas/journey/settings' },
];

export default function CanvasJourney() {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  const [circleCount, setCircleCount] = useState(0);

  const loadCount = useCallback(async () => {
    const n = await fetchCircleUnreadCount();
    setCircleCount(n);
  }, []);

  useFocusEffect(useCallback(() => {
    loadCount();
    const interval = setInterval(loadCount, 30_000);
    return () => clearInterval(interval);
  }, [loadCount]));

  return (
    <FrostCanvasShell
      eyebrow={FrostCopy.journeyCanvas.eyebrow}
      mode="frost"
      dim
      statusBarStyle={tokens.statusBarStyle === 'light-content' ? 'light' : 'dark'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.heading}>
          <Text style={styles.headingTitle}>{FrostCopy.journeyCanvas.title}</Text>
          <Text style={styles.headingSub}>{FrostCopy.journeyCanvas.sub}</Text>
        </View>

        <Text style={styles.sectionLabel}>Your circle & essentials</Text>

        <View style={styles.primaryGrid}>
          {PRIMARY.map((tool) => (
            <PrimaryTile
              key={tool.key}
              tool={tool}
              badge={tool.key === 'circle' && circleCount > 0 ? String(circleCount) : undefined}
            />
          ))}
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>More tools</Text>

        <View style={styles.secondaryList}>
          {SECONDARY.map((tool) => (
            <SecondaryTile key={tool.key} tool={tool} />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: tokens.soft }]}>{'\u2726'}{'  '}Or tell DreamAi what you'd like to do.</Text>
        </View>

      </ScrollView>
    </FrostCanvasShell>
  );
}

function PrimaryTile({ tool, badge }: { tool: PrimaryTool; badge?: string }) {
  return (
    <FrostedSurface mode="button" onPress={() => router.push(tool.route as any)} radius={FrostRadius.box} style={styles.primaryTile}>
      <View style={styles.primaryInner}>
        {badge ? (
          <View style={styles.countPill}>
            <Text style={styles.countPillText}>{badge}</Text>
          </View>
        ) : null}
        <View style={styles.primaryIconWrap}>
          <tool.Icon size={22} color={FrostColors.goldMuted} strokeWidth={1.5} />
        </View>
        <Text style={styles.primaryTitle}>{tool.title}</Text>
        <Text style={styles.primarySub}>{tool.subtitle}</Text>
      </View>
    </FrostedSurface>
  );
}

function SecondaryTile({ tool }: { tool: SecondaryTool }) {
  return (
    <FrostedSurface mode="button" onPress={() => router.push(tool.route as any)} radius={FrostRadius.md} style={styles.secondaryTile}>
      <View style={styles.secondaryInner}>
        <View style={styles.secondaryIconWrap}>
          <tool.Icon size={16} color={FrostColors.goldMuted} strokeWidth={1.5} />
        </View>
        <Text style={styles.secondaryTitle}>{tool.title}</Text>
        <ChevronRight size={15} color={FrostColors.hairline} strokeWidth={1.5} />
      </View>
    </FrostedSurface>
  );
}

const styles = StyleSheet.create({
  scrollContent:     { paddingTop: FrostSpace.xl, paddingBottom: FrostSpace.huge },
  heading:           { paddingHorizontal: FrostSpace.xxl, paddingBottom: FrostSpace.l },
  headingTitle:      { ...FrostType.displayM, fontStyle: 'italic', fontFamily: FrostFonts.display },
  headingSub:        { ...FrostType.bodyMedium, color: FrostColors.muted, marginTop: FrostSpace.xs },
  sectionLabel:      { ...FrostType.eyebrowSmall, paddingHorizontal: FrostSpace.xxl, marginBottom: FrostSpace.s, marginTop: FrostSpace.xs },
  primaryGrid:       { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: FrostSpace.xxl, gap: FrostSpace.m },
  primaryTile:       { width: '47.5%' },
  primaryInner:      { padding: FrostSpace.l, minHeight: 110, position: 'relative' },
  primaryIconWrap:   { marginBottom: FrostSpace.s },
  primaryTitle:      { fontFamily: FrostFonts.display, fontSize: 19, lineHeight: 24, color: FrostColors.ink, marginBottom: 3 },
  primarySub:        { ...FrostType.bodySmall, fontSize: 11, color: FrostColors.muted, lineHeight: 15 },
  countPill:         { position: 'absolute', top: FrostSpace.m, right: FrostSpace.m, backgroundColor: FrostColors.goldTrue, borderRadius: FrostRadius.pill, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, zIndex: 10 },
  countPillText:     { fontFamily: FrostFonts.labelMedium, fontSize: 10, color: '#FFFFFF' },
  divider:           { height: StyleSheet.hairlineWidth, backgroundColor: FrostColors.hairline, marginHorizontal: FrostSpace.xxl, marginVertical: FrostSpace.xl, opacity: 0.5 },
  secondaryList:     { paddingHorizontal: FrostSpace.xxl, gap: FrostSpace.xs },
  secondaryTile:     { marginBottom: 2 },
  secondaryInner:    { flexDirection: 'row', alignItems: 'center', paddingVertical: FrostSpace.m, paddingHorizontal: FrostSpace.l, gap: FrostSpace.m },
  secondaryIconWrap: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  secondaryTitle:    { flex: 1, fontFamily: FrostFonts.bodyMedium, fontSize: 14, color: FrostColors.soft },
  footer:            { paddingHorizontal: FrostSpace.xxl, paddingTop: FrostSpace.xl },
  footerText:        { ...FrostType.displayXS, color: FrostColors.muted, textAlign: 'center' },
});
