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
  // ZIP 5+: surprise_me responses include these
  suggestions?: SurpriseSuggestion[];
  tasteSummary?: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// ZIP 6 additions — Muse fetch + Surprise Me + save
// ─────────────────────────────────────────────────────────────────────────────

export interface MuseSave {
  id: string;
  user_id: string;
  vendor_id: string | null;
  image_url: string | null;
  function_tag: string | null;
  note: string | null;
  created_at: string;
  vendor: any | null;
}

export interface SurpriseSuggestion {
  image_url: string;
  source: 'pinterest' | 'web' | 'vendor' | 'commerce';
  suggestion_id: string;
  caption?: string | null;
  vendor_id?: string;
  source_url?: string;
}

export interface SurpriseMeResponse {
  success: boolean;
  suggestions: SurpriseSuggestion[];
  tasteSummary?: string;
  sourceCounts?: { pinterest: number; web: number; vendor: number; commerce: number };
  query?: string;
  error?: string;
}

export async function fetchMuseSaves(): Promise<MuseSave[]> {
  const session = await getCoupleSession();
  if (!session) return [];
  try {
    const r = await safeFetch(`${API_BASE}/api/couple/muse/${session.id}`);
    if (r?.success && Array.isArray(r.data)) return r.data as MuseSave[];
    return [];
  } catch {
    return [];
  }
}

export async function surpriseMe(opts: {
  functionTag?: string;
  styleHint?: string;
  count?: number;
} = {}): Promise<SurpriseMeResponse> {
  const session = await getCoupleSession();
  if (!session) return { success: false, suggestions: [], error: 'no_session' };
  try {
    return await safeFetch(`${API_BASE}/api/v2/frost/surprise-me`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session.id,
        function_tag: opts.functionTag,
        style_hint: opts.styleHint,
        count: opts.count ?? 6,
      }),
    });
  } catch (err: any) {
    return { success: false, suggestions: [], error: err?.message || 'network' };
  }
}

// Routes through bride-chat so the same URL detector + tool router applies
// whether the bride says "save this" or taps a button. Single backend path.
export async function saveToMuse(opts: {
  imageUrl: string;
  functionTag?: string;
  note?: string;
  vendorId?: string;
}): Promise<{ success: boolean; reply?: string; error?: string }> {
  const session = await getCoupleSession();
  if (!session) return { success: false, error: 'no_session' };
  const fnTagPart = opts.functionTag ? ` for ${opts.functionTag}` : '';
  const message = `save ${opts.imageUrl}${fnTagPart}${opts.note ? ` — ${opts.note}` : ''}`;
  try {
    const r = await safeFetch(`${API_BASE}/api/v2/dreamai/bride-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.id, message }),
    });
    return { success: !!r?.success, reply: r?.reply };
  } catch (err: any) {
    return { success: false, error: err?.message || 'network' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ZIP 9 — Circle API helpers
// ─────────────────────────────────────────────────────────────────────────────

export interface CircleActivityEvent {
  id: string;
  actor_user_id: string | null;
  actor_role: 'bride' | 'circle_member' | 'dreamai' | 'system';
  event_type: string;
  payload: Record<string, any>;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
}

export interface CircleThread {
  thread_id: string;
  kind: 'group' | 'dm';
  label: string;
  group_id?: string;
  co_planner_id?: string;
  role?: string;
  dreamai_access_granted?: boolean;
  last_message: { content: string; sender_name: string; sender_role: string; created_at: string } | null;
  last_active: string | null;
}

export interface CircleMessage {
  id: string;
  thread_id: string;
  sender_user_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

export async function fetchCircleFeed(limit = 30): Promise<CircleActivityEvent[]> {
  const session = await getCoupleSession();
  if (!session) return [];
  try {
    const r = await safeFetch(`${API_BASE}/api/v2/frost/circle/feed/${session.id}?limit=${limit}`);
    return r?.success ? (r.data || []) : [];
  } catch { return []; }
}

export async function fetchCircleThreads(): Promise<CircleThread[]> {
  const session = await getCoupleSession();
  if (!session) return [];
  try {
    const r = await safeFetch(`${API_BASE}/api/v2/frost/circle/threads/${session.id}`);
    return r?.success ? (r.data || []) : [];
  } catch { return []; }
}

export async function fetchCircleThreadMessages(threadId: string, limit = 50): Promise<CircleMessage[]> {
  const session = await getCoupleSession();
  if (!session) return [];
  try {
    const encoded = encodeURIComponent(threadId);
    const r = await safeFetch(`${API_BASE}/api/v2/frost/circle/threads/${session.id}/${encoded}/messages?limit=${limit}`);
    return r?.success ? (r.data || []) : [];
  } catch { return []; }
}

export async function sendCircleMessage(threadId: string, body: string): Promise<boolean> {
  const session = await getCoupleSession();
  if (!session) return false;
  try {
    const r = await safeFetch(`${API_BASE}/api/v2/frost/circle/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.id, thread_id: threadId, body, sender_name: session.name || 'You' }),
    });
    return !!r?.success;
  } catch { return false; }
}

export async function fetchCircleUnreadCount(): Promise<number> {
  // Counts activity events from last 7 days as a proxy for unread
  const session = await getCoupleSession();
  if (!session) return 0;
  try {
    const r = await safeFetch(`${API_BASE}/api/v2/frost/circle/feed/${session.id}?limit=50`);
    if (!r?.success) return 0;
    const events: CircleActivityEvent[] = r.data || [];
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return events.filter(e => new Date(e.created_at).getTime() > cutoff).length;
  } catch { return 0; }
}
