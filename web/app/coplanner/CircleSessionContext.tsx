'use client';
import { createContext, useContext } from 'react';

export const API = 'https://dream-wedding-production-89ae.up.railway.app';

export const GOLD     = '#C9A84C';
export const INK      = '#0C0A09';
export const CREAM    = '#F8F7F5';
export const MUTED    = 'rgba(248,247,245,0.5)';
export const HAIRLINE = 'rgba(248,247,245,0.12)';
export const EASE     = 'cubic-bezier(0.22,1,0.36,1)';

export const FROST_PANEL: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(20px) saturate(1.4)',
  WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
  border: `0.5px solid ${HAIRLINE}`,
  borderRadius: 16,
};

export const FONT_DISPLAY = "'Cormorant Garamond', serif";
export const FONT_BODY    = "'DM Sans', sans-serif";
export const FONT_EYEBROW = "'Jost', sans-serif";

export type CircleRole = 'Partner' | 'inner_circle' | 'circle';

export interface CirclePermissions {
  dreamai_access_granted: boolean;
  can_see_budget: boolean;
  can_see_guests: boolean;
  can_see_vendors: boolean;
  can_contribute_muse: boolean;
}

// Backend response shape (server.js :16822 — GET /api/v2/circle/session/:userId):
//   { user_id, name, phone, pin_set,
//     co_planner_id, couple_id, role, dreamer_type, permissions,
//     bride: { name, wedding_date, partner_name } }
//
// Historically this type declared flat fields (bride_name, primary_user_id,
// invitee_name) that the backend never sent. That caused every consumer page
// to render "undefined" wherever the bride's name appeared, and crashed the
// threads/[threadId] page on render. This type now matches the wire shape.
// Always read the bride's name via brideName() and the bride's id via brideId()
// so future shape changes only need to be handled in one place.
export interface CircleSession {
  user_id: string;
  name?: string | null;
  phone?: string | null;
  pin_set?: boolean;
  co_planner_id: string;
  couple_id: string;
  role: CircleRole;
  dreamer_type?: string;
  permissions: CirclePermissions;
  bride?: {
    name?: string | null;
    wedding_date?: string | null;
    partner_name?: string | null;
  } | null;
  // Forward-compat: tolerate legacy/extra fields without TS friction.
  [extra: string]: unknown;
}

export const CircleSessionContext = createContext<CircleSession | null>(null);

export function useCircleSession(): CircleSession {
  const s = useContext(CircleSessionContext);
  if (!s) {
    throw new Error('useCircleSession must be used inside <CircleSessionContext.Provider>');
  }
  return s;
}

// Resolve the bride's user id. Backend sends couple_id; older cached sessions
// may carry primary_user_id; honour both.
export function brideId(s: CircleSession): string {
  return (s.couple_id as string) || (s.primary_user_id as string) || '';
}

// Resolve the bride's display name. Backend sends bride.name (nested); older
// cached sessions may carry bride_name (flat); honour both, then fall back.
export function brideName(s: CircleSession): string {
  return s.bride?.name || (s.bride_name as string) || 'the bride';
}

// Resolve the Circle member's own display name. Backend sends `name`; older
// cached sessions may carry invitee_name; honour both, then fall back.
export function memberName(s: CircleSession): string {
  return (s.name as string) || (s.invitee_name as string) || 'Friend';
}
