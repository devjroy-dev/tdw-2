/**
 * Frost \u00B7 Journey \u00B7 Messages
 *
 * One-on-one threads with vendors who are on the platform. Tap a thread to
 * open that vendor's profile (which contains the same conversation, plus
 * pricing, receipts, etc.). No groups, never. WhatsApp does groups.
 *
 * v1 stub. Real wiring uses /api/enquiries/couple/:userId or new dedicated
 * vendor-messages endpoint TBD in v1.5.
 */

import React from 'react';
import { ScrollView, View, Text, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import FrostCanvasShell from '../../../../components/frost/FrostCanvasShell';
import FrostedSurface from '../../../../components/frost/FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../../../constants/frost';

interface Thread {
  vendorId: string;
  name: string;
  category: string;
  lastMessage: string;
  ts: string;
  unread?: number;
  avatar?: string;
}

const PLACEHOLDER_THREADS: Thread[] = [
  {
    vendorId: '1',
    name: 'Swati Tomar',
    category: 'MUA',
    lastMessage: 'Yes, available on the 12th. Sending you the look board.',
    ts: '2h',
    unread: 1,
  },
  {
    vendorId: '2',
    name: 'Arjun Kartha Studio',
    category: 'Photography',
    lastMessage: 'The advance has been received. Booked.',
    ts: 'Yesterday',
  },
  {
    vendorId: '3',
    name: 'House of Blooms',
    category: 'Decor',
    lastMessage: 'Shared the moodboard for the mehendi. Let me know.',
    ts: 'Apr 28',
  },
];

export default function JourneyMessages() {
  return (
    <FrostCanvasShell eyebrow="JOURNEY \u00B7 MESSAGES" mode="frost">
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Your conversations.</Text>
        <Text style={styles.sub}>One-on-one with each of your vendors.</Text>

        <View style={styles.list}>
          {PLACEHOLDER_THREADS.map(t => (
            <FrostedSurface
              key={t.vendorId}
              mode="button"
              onPress={() => router.push(`/(frost)/canvas/journey/vendor/${t.vendorId}` as any)}
              style={{ marginBottom: FrostSpace.s }}
            >
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarLetter}>{t.name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.headerRow}>
                    <Text style={styles.name}>{t.name}</Text>
                    <Text style={styles.ts}>{t.ts}</Text>
                  </View>
                  <Text style={styles.category}>{t.category.toUpperCase()}</Text>
                  <Text
                    style={[
                      styles.preview,
                      t.unread && styles.previewUnread,
                    ]}
                    numberOfLines={2}
                  >
                    {t.lastMessage}
                  </Text>
                </View>
                {t.unread ? (
                  <View style={styles.unreadDot} />
                ) : null}
              </View>
            </FrostedSurface>
          ))}
        </View>
      </ScrollView>
    </FrostCanvasShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: FrostSpace.xl,
    paddingBottom: FrostSpace.huge,
  },
  heading: {
    ...FrostType.displayM,
    fontStyle: 'italic',
    fontFamily: FrostFonts.display,
  },
  sub: {
    ...FrostType.bodyMedium,
    color: FrostColors.muted,
    marginTop: FrostSpace.xs,
    marginBottom: FrostSpace.xl,
  },
  list: { gap: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: FrostSpace.l,
    paddingHorizontal: FrostSpace.l,
    gap: FrostSpace.m,
  },
  avatar: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(168,146,75,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: FrostFonts.display,
    fontSize: 18,
    color: FrostColors.goldMuted,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  name: {
    fontFamily: FrostFonts.bodyBold,
    fontSize: 15,
    color: FrostColors.ink,
  },
  ts: {
    ...FrostType.eyebrowSmall,
    fontSize: 9,
    letterSpacing: 1.4,
  },
  category: {
    ...FrostType.eyebrowSmall,
    letterSpacing: 1.4,
    marginTop: 2,
  },
  preview: {
    ...FrostType.bodySmall,
    marginTop: FrostSpace.xs,
    color: FrostColors.muted,
  },
  previewUnread: {
    color: FrostColors.ink,
    fontFamily: FrostFonts.bodyMedium,
  },
  unreadDot: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: FrostColors.goldMuted,
    marginTop: 8,
  },
});
