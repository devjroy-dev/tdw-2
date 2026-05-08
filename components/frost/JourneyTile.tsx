/**
 * JourneyTile (v2 — total frost edition).
 *
 * Uses FrostedSurface instead of a solid white card. Tiles now read as
 * frosted regions on the same continuous material as the page, not as
 * separate dashboard widgets.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import FrostedSurface from './FrostedSurface';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts,
} from '../../constants/frost';

interface JourneyTileProps {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  subtitle?: string;
  badge?: string;
  onPress: () => void;
}

export default function JourneyTile({
  Icon, title, subtitle, badge, onPress,
}: JourneyTileProps) {
  return (
    <FrostedSurface
      mode="button"
      onPress={onPress}
      style={{ marginBottom: FrostSpace.m }}
    >
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <Icon size={22} color={FrostColors.goldMuted} strokeWidth={1.5} />
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}

        <ChevronRight size={18} color={FrostColors.muted} strokeWidth={1.5} />
      </View>
    </FrostedSurface>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: FrostSpace.l,
    paddingHorizontal: FrostSpace.xl,
    gap: FrostSpace.l,
  },
  iconWrap: {
    width: 32, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1 },
  title: {
    fontFamily: FrostFonts.display,
    fontSize: 19, lineHeight: 24,
    color: FrostColors.ink,
  },
  subtitle: {
    ...FrostType.bodySmall,
    color: FrostColors.muted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: FrostSpace.s,
    paddingVertical: 3,
    borderRadius: 100,
    backgroundColor: 'rgba(168,146,75,0.18)',
  },
  badgeText: {
    ...FrostType.eyebrowSmall,
    fontSize: 9,
    color: FrostColors.goldMuted,
    letterSpacing: 1.4,
  },
});
