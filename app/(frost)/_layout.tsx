/**
 * Frost — Stack layout.
 *
 * Frost has NO tab bar and NO top chrome. The landing IS the home screen.
 * Everything else is a full-bleed canvas pushed onto the stack with fade.
 *
 * Routes:
 *   /(frost)/landing                  — frosted-glass home
 *   /(frost)/canvas/muse              — Muse full-bleed gallery
 *   /(frost)/canvas/discover          — Discover (beta) magazine
 *   /(frost)/canvas/dream             — DreamAi full thread (Circle merged)
 *   /(frost)/canvas/journey           — Journey: tools live here
 *   /(frost)/canvas/journey/vendors   — Vendor list (subroute of Journey)
 *   /(frost)/canvas/journey/vendor/[id] — Vendor profile page
 *   /(frost)/canvas/journey/reminders — Personal reminders
 *   /(frost)/canvas/journey/broadcast — Phone-book broadcast
 *   /(frost)/canvas/journey/settings  — Settings (compressed single screen)
 */

import { Stack } from 'expo-router';
import { FrostColors } from '../../constants/frost';

export default function FrostLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: FrostColors.pageFallback },
      }}
    />
  );
}
