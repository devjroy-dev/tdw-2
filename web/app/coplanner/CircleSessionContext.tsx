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

export interface CircleSession {
  user_id: string;
  co_planner_id: string;
  invitee_name: string;
  bride_name: string;
  primary_user_id: string;
  role: CircleRole;
  permissions: CirclePermissions;
  // Native may also send couple_id / name — keep open for forward-compat
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

// Resolve the bride's user id — server may have returned it as primary_user_id
// or as couple_id depending on which endpoint path produced the row.
export function brideId(s: CircleSession): string {
  return s.primary_user_id || (s.couple_id as string) || '';
}

// Resolve Mom's display name — invitee_name from the session, or fallback.
export function memberName(s: CircleSession): string {
  return s.invitee_name || (s.name as string) || 'Friend';
}
