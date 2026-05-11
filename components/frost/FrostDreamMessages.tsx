/**
 * FrostDreamMessages — message row primitives for the Dream canvas.
 *
 * Three types in the merged stream:
 *   - <AILine>        AI's voice (✦ + Cormorant italic)
 *   - <PersonAction>  what someone in the bride's Circle did (avatar + name + action)
 *   - <InlineEvent>   subtle in-stream events (gray italic, no avatar)
 *
 * The Dream canvas renders these in a vertical scroll. They share width and
 * spacing rules but distinguish themselves through visual primitives so the
 * bride's eye reads them as different kinds of voices.
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { FrostType, FrostSpace, FrostFonts } from '../../constants/frost';
import { MUSE_LOOKS } from '../../constants/museTokens';
import { useMuseLook } from '../../hooks/useMuseLook';

// ─── AI LINE ─────────────────────────────────────────────────────────────────

export function AILine({ text, timestamp }: { text: string; timestamp?: string }) {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  return (
    <View style={styles.row}>
      <Text style={[styles.glyph, { color: tokens.soft }]}>✦</Text>
      <View style={styles.content}>
        <Text style={styles.aiText}>{text}</Text>
        {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
      </View>
    </View>
  );
}

// ─── PERSON ACTION ───────────────────────────────────────────────────────────

interface PersonActionProps {
  name: string;
  avatar?: string;
  action: string;            // e.g. "saved Arjun Kartha"
  text?: string;             // optional message body
  timestamp?: string;
}

export function PersonAction({
  name, avatar, action, text, timestamp,
}: PersonActionProps) {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  return (
    <View style={styles.row}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={[styles.avatar, { backgroundColor: tokens.hairline }]} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: tokens.hairline }]}>
          <Text style={[styles.avatarLetter, { color: tokens.soft }]}>{name[0]?.toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.content}>
        <Text style={[styles.personLine, { color: tokens.ink }]}>
          <Text style={[styles.personName, { color: tokens.ink }]}>{name}</Text>
          <Text style={[styles.personAction, { color: tokens.soft }]}>{` ${action}`}</Text>
        </Text>
        {text ? <Text style={styles.personText}>{text}</Text> : null}
        {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
      </View>
    </View>
  );
}

// ─── INLINE EVENT ────────────────────────────────────────────────────────────

export function InlineEvent({ text }: { text: string }) {
  const look = useMuseLook();
  const tokens = MUSE_LOOKS[look];
  return (
    <View style={styles.eventRow}>
      <Text style={[styles.eventText, { color: tokens.soft }]}>{text}</Text>
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
    // color applied inline via tokens.soft — mode-aware
    width: AVATAR_SIZE,
    textAlign: 'center',
    marginTop: 2,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    // backgroundColor applied inline via tokens.hairline — mode-aware
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    ...FrostType.bodyMedium,
    // color applied inline via tokens.soft — mode-aware
    fontFamily: FrostFonts.bodyMedium,
  },
  content: {
    flex: 1,
  },

  // AI
  aiText: {
    ...FrostType.displayXS,
  },

  // Person — colors applied inline (tokens.ink for line/name, tokens.soft for action)
  personLine: {
    ...FrostType.bodyMedium,
  },
  personName: {
    fontFamily: FrostFonts.bodyMedium,
  },
  personAction: {
    fontFamily: FrostFonts.body,
  },
  personText: {
    ...FrostType.bodyMedium,
    marginTop: FrostSpace.xs,
  },

  // Event
  eventRow: {
    paddingHorizontal: FrostSpace.xxl,
    paddingVertical: FrostSpace.s,
    alignItems: 'center',
  },
  eventText: {
    ...FrostType.bodySmall,
    fontStyle: 'italic',
    // color applied inline via tokens.soft — mode-aware
    textAlign: 'center',
  },

  timestamp: {
    ...FrostType.eyebrowSmall,
    marginTop: FrostSpace.xs,
    letterSpacing: 1.4,
  },
});
