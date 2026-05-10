/**
 * FrostViewPill — small italic "View" affordance below AI messages on writes.
 *
 * Patch B-3b. Renders below AILine when the message carries a tool_anchor
 * with entity_type !== 'list' (i.e. a write that produced a specific
 * entity, not a read query that returned a list view).
 *
 * Tap → the same Journey route long-press already routes to. Doubles as
 * proof-of-action: if the entity isn't there, the bride sees the empty
 * state in Journey and knows the action didn't actually fire.
 *
 * Voice register: italic Cormorant in spirit, restrained — it's an
 * affordance, not a button. Hairline-thin underline mark to suggest
 * tapability without shouting.
 */

import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { FrostColors, FrostFonts, FrostSpace } from '../../constants/frost';
import type { ToolAnchor } from '../../services/frostApi';

// Mirrors the anchor → route map in dream.tsx; kept local so the pill is
// self-contained and can be reused on other surfaces (e.g. confirm-card
// success state) without dragging the parent's mapping function along.
function anchorToRoute(anchor: ToolAnchor): string | null {
  switch (anchor.tool) {
    case 'vendors': return '/(frost)/canvas/journey/vendors';
    case 'money':   return '/(frost)/canvas/journey/expenses';
    case 'tasks':   return '/(frost)/canvas/journey/reminders';
    default:        return null;
  }
}

// 'list' anchors come from read queries (query_my_vendors etc.) and are
// not write events — the View pill is a proof-of-write affordance, so we
// only render for entity-specific anchors.
export function shouldShowViewPill(anchor: ToolAnchor | undefined): boolean {
  if (!anchor) return false;
  if (anchor.entity_type === 'list') return false;
  return anchorToRoute(anchor) !== null;
}

export default function FrostViewPill({ anchor }: { anchor: ToolAnchor }) {
  const route = anchorToRoute(anchor);
  if (!route) return null;

  const handlePress = () => {
    Haptics.selectionAsync?.();
    router.push(route as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.pill, pressed && styles.pillPressed]}
      hitSlop={8}
    >
      <Text style={styles.label}>View</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    marginTop: FrostSpace.xs,
    paddingVertical: 2,
  },
  pillPressed: {
    opacity: 0.55,
  },
  label: {
    fontFamily: FrostFonts.display,
    fontSize: 13,
    fontStyle: 'italic',
    color: FrostColors.goldMuted,
    letterSpacing: 0.3,
    textDecorationLine: 'underline',
    textDecorationColor: FrostColors.hairline,
  },
});
