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
import { FrostColors, FrostType, FrostSpace, FrostFonts } from '../../constants/frost';

// ─── AI LINE ─────────────────────────────────────────────────────────────────

export function AILine({ text, timestamp }: { text: string; timestamp?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.glyph}>✦</Text>
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
  return (
    <View style={styles.row}>
      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarLetter}>{name[0]?.toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.personLine}>
          <Text style={styles.personName}>{name}</Text>
          <Text style={styles.personAction}>{` ${action}`}</Text>
        </Text>
        {text ? <Text style={styles.personText}>{text}</Text> : null}
        {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
      </View>
    </View>
  );
}

// ─── INLINE EVENT ────────────────────────────────────────────────────────────

export function InlineEvent({ text }: { text: string }) {
  return (
    <View style={styles.eventRow}>
      <Text style={styles.eventText}>{text}</Text>
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
    color: FrostColors.soft,
    width: AVATAR_SIZE,
    textAlign: 'center',
    marginTop: 2,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: FrostColors.hairline,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    ...FrostType.bodyMedium,
    color: FrostColors.soft,
    fontFamily: FrostFonts.bodyMedium,
  },
  content: {
    flex: 1,
  },

  // AI
  aiText: {
    ...FrostType.displayXS,
  },

  // Person
  personLine: {
    ...FrostType.bodyMedium,
    color: FrostColors.ink,
  },
  personName: {
    fontFamily: FrostFonts.bodyMedium,
    color: FrostColors.ink,
  },
  personAction: {
    fontFamily: FrostFonts.body,
    color: FrostColors.soft,
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
    color: FrostColors.muted,
    textAlign: 'center',
  },

  timestamp: {
    ...FrostType.eyebrowSmall,
    marginTop: FrostSpace.xs,
    letterSpacing: 1.4,
  },
});
