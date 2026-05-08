/**
 * Frost \u00B7 Canvas \u00B7 Journey
 *
 * Tool grid for the bride's working surfaces. v2 adds Messages tile. All
 * tiles are now frosted (via updated JourneyTile / FrostedSurface).
 */

import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import {
  Users, Bell, Receipt, MessageCircle, Mail, Settings,
} from 'lucide-react-native';
import FrostCanvasShell from '../../../components/frost/FrostCanvasShell';
import JourneyTile from '../../../components/frost/JourneyTile';
import {
  FrostColors, FrostType, FrostSpace, FrostFonts, FrostCopy,
} from '../../../constants/frost';

interface Tool {
  Icon: React.ComponentType<any>;
  title: string;
  subtitle: string;
  badge?: string;
  route: string;
}

const TOOLS: Tool[] = [
  {
    Icon: Users,
    title: 'Vendors',
    subtitle: 'Your team \u2014 pricing, messages, receipts.',
    route: '/(frost)/canvas/journey/vendors',
  },
  {
    Icon: Mail,
    title: 'Messages',
    subtitle: 'One-on-one threads with your vendors.',
    route: '/(frost)/canvas/journey/messages',
  },
  {
    Icon: Bell,
    title: 'Reminders',
    subtitle: 'What you want me to remember.',
    route: '/(frost)/canvas/journey/reminders',
  },
  {
    Icon: Receipt,
    title: 'Receipts',
    subtitle: 'Capture, file, find later.',
    route: '/(frost)/canvas/journey/receipts',
  },
  {
    Icon: MessageCircle,
    title: 'Broadcast',
    subtitle: 'Tell some or all of your people at once.',
    route: '/(frost)/canvas/journey/broadcast',
  },
  {
    Icon: Settings,
    title: 'Settings',
    subtitle: 'Your wedding, your preferences.',
    route: '/(frost)/canvas/journey/settings',
  },
];

export default function CanvasJourney() {
  return (
    <FrostCanvasShell eyebrow={FrostCopy.journeyCanvas.eyebrow} mode="frost">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={styles.headingTitle}>{FrostCopy.journeyCanvas.title}</Text>
          <Text style={styles.headingSub}>{FrostCopy.journeyCanvas.sub}</Text>
        </View>

        <View style={styles.tiles}>
          {TOOLS.map((tool) => (
            <JourneyTile
              key={tool.title}
              Icon={tool.Icon}
              title={tool.title}
              subtitle={tool.subtitle}
              badge={tool.badge}
              onPress={() => router.push(tool.route as any)}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            \u2728  Or tell DreamAi what you\u2019d like to do.
            She\u2019ll handle most of this for you.
          </Text>
        </View>
      </ScrollView>
    </FrostCanvasShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: FrostSpace.xl,
    paddingBottom: FrostSpace.huge,
  },
  heading: {
    paddingHorizontal: FrostSpace.xxl,
    paddingBottom: FrostSpace.xl,
  },
  headingTitle: {
    ...FrostType.displayM,
    fontStyle: 'italic',
    fontFamily: FrostFonts.display,
  },
  headingSub: {
    ...FrostType.bodyMedium,
    color: FrostColors.muted,
    marginTop: FrostSpace.xs,
  },
  tiles: {
    paddingHorizontal: FrostSpace.xxl,
  },
  footer: {
    paddingHorizontal: FrostSpace.xxl,
    paddingTop: FrostSpace.xl,
  },
  footerText: {
    ...FrostType.displayXS,
    color: FrostColors.muted,
    textAlign: 'center',
  },
});
