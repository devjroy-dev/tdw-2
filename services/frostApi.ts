/**
 * Frost API service.
 *
 * Single source for all backend calls Frost makes. Three categories:
 *
 *   1. Bride DreamAi — bride-chat, bride-followup, bride-idle
 *   2. Circle — messages, members, activity
 *   3. Read-only fetches Frost screens use (Muse saves, vendors, etc.)
 *
 * Auth: every call passes the bride's couple_id (resolved from
 *       AsyncStorage 'user_session'.id). Helpers for that live here too.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Config ───────────────────────────────────────────────────────────────────
export const API_BASE = 'https://dream-wedding-production-89ae.up.railway.app';
const TIMEOUT_MS = 30_000; // long enough for Haiku composite calls

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BrideFollowup {
  id: string;
  text: string;
  yesLabel: string;
  noLabel: string;
}

export interface BrideChatResponse {
  success: boolean;
  reply: string;
  summaryLines?: string[];
  followupPrompts?: BrideFollowup[];
  confirmPreview?: any | null;
  toolsUsed?: string[];
  error?: string;
}

export interface BrideFollowupResponse {
  success: boolean;
  reply: string;
  error?: string;
}

export interface BrideIdleResponse {
  success: boolean;
  lines: string[];
  cached?: boolean;
  error?: string;
}

// Circle activity unifies several backend feeds into a single message stream.
export type CircleActivityType =
  | 'circle_message' | 'co_planner_joined' | 'muse_save' | 'enquiry_sent';

export interface CircleActivityItem {
  id: string;
  type: CircleActivityType;
  actorName: string;     // who did it
  actorAvatar?: string;
  body?: string;          // for messages
  action?: string;        // for activity ('saved Arjun Kartha')
  timestamp: string;      // ISO
}

// ─── Auth helper ─────────────────────────────────────────────────────────────

interface UserSession { id: string; name?: string; phone?: string; }

let cachedSession: UserSession | null = null;

export async function getCoupleSession(): Promise<UserSession | null> {
  if (cachedSession) return cachedSession;
  try {
    const raw = await AsyncStorage.getItem('user_session');
    if (!raw) return null;
    const s = JSON.parse(raw) as UserSession;
    if (!s.id) return null;
    cachedSession = s;
    return s;
  } catch {
    return null;
  }
}

export function clearSessionCache() { cachedSession = null; }

// ─── Fetch helper with timeout ───────────────────────────────────────────────

async function safeFetch(url: string, init?: RequestInit): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal });
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Bride DreamAi ───────────────────────────────────────────────────────────

export async function brideChat(
  message: string,
  history: Array<{ role: 'user' | 'assistant'; text: string }> = [],
): Promise<BrideChatResponse> {
  const session = await getCoupleSession();
  if (!session) {
    return {
      success: false,
      reply: 'Please sign in again.',
      error: 'no_session',
    };
  }
  try {
    return await safeFetch(`${API_BASE}/api/v2/dreamai/bride-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.id, message, history }),
    });
  } catch (err: any) {
    return {
      success: false,
      reply: 'Something went sideways. Try once more?',
      error: err?.message || 'network',
    };
  }
}

export async function brideFollowup(
  promptId: string,
  answer: 'yes' | 'no',
  context: Record<string, any> = {},
): Promise<BrideFollowupResponse> {
  const session = await getCoupleSession();
  if (!session) {
    return { success: false, reply: '', error: 'no_session' };
  }
  try {
    return await safeFetch(`${API_BASE}/api/v2/dreamai/bride-followup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session.id,
        prompt_id: promptId,
        answer,
        context,
      }),
    });
  } catch (err: any) {
    return { success: false, reply: '', error: err?.message || 'network' };
  }
}

export async function brideIdle(): Promise<BrideIdleResponse> {
  const session = await getCoupleSession();
  if (!session) {
    return {
      success: false,
      lines: [
        'The light in October will be the colour of old letters.',
        'Pick a colour for the morning. I will think about it with you.',
      ],
      error: 'no_session',
    };
  }
  try {
    return await safeFetch(`${API_BASE}/api/v2/dreamai/bride-idle/${session.id}`);
  } catch (err: any) {
    return {
      success: false,
      lines: [
        'The light in October will be the colour of old letters.',
        'Pick a colour for the morning. I will think about it with you.',
      ],
      error: err?.message || 'network',
    };
  }
}

// ─── Circle activity merging ─────────────────────────────────────────────────
//
// Frost's Dream stream merges:
//   - Real chat messages from /api/circle/messages/:coupleId
//   - Co-planner joining events from /api/co-planner/list/:userId
//
// Returned as a unified CircleActivityItem[] sorted newest-last (chronological).
// The Dream canvas renders these alongside DreamAi's own messages.

export async function fetchCircleActivity(): Promise<CircleActivityItem[]> {
  const session = await getCoupleSession();
  if (!session) return [];

  const items: CircleActivityItem[] = [];

  // 1. Circle messages
  try {
    const mr = await safeFetch(`${API_BASE}/api/circle/messages/${session.id}`);
    if (mr?.success && Array.isArray(mr.data)) {
      for (const m of mr.data) {
        items.push({
          id: 'msg_' + m.id,
          type: 'circle_message',
          actorName: m.sender_name || 'Someone',
          body: m.content || '',
          timestamp: m.created_at || new Date().toISOString(),
        });
      }
    }
  } catch {}

  // 2. Co-planner joins
  try {
    const cr = await safeFetch(`${API_BASE}/api/co-planner/list/${session.id}`);
    if (cr?.success && Array.isArray(cr.data)) {
      for (const cp of cr.data) {
        if (cp.status === 'active') {
          items.push({
            id: 'cp_' + cp.id,
            type: 'co_planner_joined',
            actorName: cp.invitee_name || cp.name || 'Someone',
            action: 'joined your Circle',
            timestamp: cp.created_at || new Date().toISOString(),
          });
        }
      }
    }
  } catch {}

  // Sort chronologically (oldest first → newest last for chat-style stream)
  items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return items;
}
