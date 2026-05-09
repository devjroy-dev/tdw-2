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
 *       AsyncStorage 'couple_session'.id via utils/session.ts —
 *       SINGLE SOURCE OF TRUTH for session reads/writes).
 *
 * BUGFIX (this drop): previously this file had its own getCoupleSession
 * that read 'user_session' — a key never written by anyone. That made
 * EVERY Frost API call (bride-chat, brideIdle, fetchMuseSaves, the entire
 * Circle suite, surpriseMe) silently fail with "Please sign in again."
 * Fixed by re-exporting from utils/session.ts so the read and write paths
 * agree on a single key: 'couple_session'.
 */

import { getCoupleSession as utilsGetCoupleSession } from '../utils/session';

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

// ZIP 8: long-press routing metadata returned alongside bride-chat replies.
// One anchor per AI message; the dream canvas pins it to the rendered AILine
// and routes long-press to the relevant Journey sub-page.
export interface ToolAnchor {
  tool: 'vendors' | 'money' | 'tasks' | string;
  entity_type: string;
  entity_id: string;
}

export interface BrideChatResponse {
  success: boolean;
  reply: string;
  summaryLines?: string[];
  followupPrompts?: BrideFollowup[];
  confirmPreview?: any | null;
  toolsUsed?: string[];
  toolAnchors?: ToolAnchor[];
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
//
// Re-export from utils/session.ts. This file used to maintain its own copy
// that read the wrong AsyncStorage key — leading to a global Frost auth
// failure. Now there is one true session getter and the bug cannot recur.

interface UserSession { id: string; name?: string; phone?: string; }

export async function getCoupleSession(): Promise<UserSession | null> {
  const s = await utilsGetCoupleSession();
  if (!s || typeof s !== 'object' || !('id' in s) || !s.id) return null;
  return s as UserSession;
}

// Compatibility no-op — older callers may still call this.
export function clearSessionCache() { /* no cache anymore */ }

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

// ─── Home-screen images (NEW — Frost landing) ────────────────────────────────
//
// One call, two pictures: Muse + Discover, server-picked, anti-collision
// enforced, fallback to a different hero if the bride's Muse board is empty.
// Frost landing calls this in useFocusEffect — refreshes on every entry.

export interface HomeImagesResponse {
  success: boolean;
  muse_image_url: string | null;
  discover_image_url: string | null;
  muse_is_fallback?: boolean;
  error?: string;
}

export async function fetchHomeImages(): Promise<HomeImagesResponse> {
  const session = await getCoupleSession();
  if (!session) {
    return { success: false, muse_image_url: null, discover_image_url: null, error: 'no_session' };
  }
  try {
    const r = await safeFetch(`${API_BASE}/api/v2/frost/home-images/${session.id}`);
    return {
      success: !!r?.success,
      muse_image_url: r?.muse_image_url || null,
      discover_image_url: r?.discover_image_url || null,
      muse_is_fallback: !!r?.muse_is_fallback,
      error: r?.error,
    };
  } catch (err: any) {
    return {
      success: false,
      muse_image_url: null,
      discover_image_url: null,
      error: err?.message || 'network',
    };
  }
}

// ─── Bride confirm (FIX-5) ────────────────────────────────────────────────
// Replays a previously-previewed action after the bride taps Confirm in a
// FrostConfirmCard. Backend looks up action_id in pendingBookings/Payments/
// Settles/Broadcasts/Receipts and runs the destructive write.

export interface BrideConfirmResponse {
  success: boolean;
  reply?: string;
  summaryLines?: string[];
  followupPrompts?: BrideFollowup[];
  vendor_id?: string;
  expense_id?: string;
  error?: string;
}

export async function brideConfirm(
  action_id: string,
  vendor_name?: string,
): Promise<BrideConfirmResponse> {
  const session = await getCoupleSession();
  if (!session) return { success: false, error: 'no_session' };
  try {
    return await safeFetch(`${API_BASE}/api/v2/dreamai/bride-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: session.id, action_id, vendor_name }),
    });
  } catch (err: any) {
    return { success: false, error: err?.message || 'network' };
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

// ─── Circle activity → italic Cormorant line (Round 3 — Circle home box) ──
//
// Turns a CircleActivityEvent into a single human-readable italic-Cormorant
// line that the home Circle card renders. Frontend-formatted for now —
// move to backend LLM narration in a future session for tone variety.
export function formatCircleActivity(event: CircleActivityEvent): string {
  const actor = event.payload?.actor_name || 'Someone';
  const role = event.actor_role;
  const type = event.event_type;
  const payload = event.payload || {};

  // Map common event types to gentle phrasings
  switch (type) {
    case 'co_planner_joined':
      return `${actor} joined your Circle.`;
    case 'muse_saved':
      if (payload.function_tag) {
        return `${actor} saved an idea for ${payload.function_tag}.`;
      }
      return `${actor} saved something to your Muse.`;
    case 'circle_message':
      if (payload.preview) {
        const trimmed = String(payload.preview).slice(0, 60);
        return `${actor} said "${trimmed}${payload.preview.length > 60 ? '…' : ''}"`;
      }
      return `${actor} sent a message to your Circle.`;
    case 'enquiry_sent':
      if (payload.vendor_name) {
        return `${actor} reached out to ${payload.vendor_name}.`;
      }
      return `${actor} reached out to a vendor for you.`;
    case 'vendor_approved':
      if (payload.vendor_name) {
        return `${actor} approved ${payload.vendor_name}.`;
      }
      return `${actor} approved a vendor pick.`;
    default:
      // Soft generic fallback — keeps the line warm even for unknown event types
      if (role === 'circle_member') {
        return `${actor} did something in your Circle.`;
      }
      if (role === 'dreamai') {
        return `Dream Ai logged a moment for you.`;
      }
      return 'A quiet update from your Circle.';
  }
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

// ─────────────────────────────────────────────────────────────────────────────
// Discover Heroes — full-bleed paid carousel on /(frost)/canvas/discover
//
// Admin-managed via /admin/discover-heroes (5 active slots). Backend returns
// photos sorted by sort_order ASC, only active ones, no auth required.
// ─────────────────────────────────────────────────────────────────────────────

export interface DiscoverHero {
  id: string;
  image_url: string;
  display_order?: number;
  sort_order?: number;
  caption?: string | null;
  vendor_id?: string | null;
}

export async function fetchDiscoverHeroes(): Promise<DiscoverHero[]> {
  try {
    const r = await safeFetch(`${API_BASE}/api/v2/discover-heroes`);
    if (r?.success && Array.isArray(r.data)) return r.data as DiscoverHero[];
    if (Array.isArray(r?.heroes)) return r.heroes as DiscoverHero[]; // fallback shape
    return [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JOURNEY READ-PAGES — API helpers (Phase 1.5)
//
// These power the witness pages: Reminders, Expenses, Vendors, Events,
// Messages. Read-mostly with two single-tap mutations (toggle reminder
// complete, mark expense paid) and three deletes (reminder, expense, vendor).
//
// All helpers return:
//   - `null` on hard failure (network / non-2xx / parse error)
//   - the parsed data on success
// Pages render an error state when null is returned.
//
// DB column names match Supabase exactly (per holy_grail Section 8 lock).
// ─────────────────────────────────────────────────────────────────────────────

// ─── Reminders ───────────────────────────────────────────────────────────────

export interface Reminder {
  id: string;
  couple_id: string;
  text: string;
  event?: string | null;
  priority?: string | null;
  due_date?: string | null;
  is_complete: boolean;
  created_at?: string;
  completed_at?: string | null;
  assigned_to?: string | null;
}

export async function fetchMyReminders(): Promise<Reminder[] | null> {
  const session = await getCoupleSession();
  if (!session) return null;
  try {
    const r = await safeFetch(`${API_BASE}/api/couple/checklist/${session.id}`);
    if (r?.success && Array.isArray(r.data)) return r.data as Reminder[];
    return null;
  } catch { return null; }
}

export async function toggleReminderComplete(reminderId: string, isComplete: boolean): Promise<boolean> {
  try {
    const r = await safeFetch(`${API_BASE}/api/couple/checklist/${reminderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_complete: isComplete }),
    });
    return !!r?.success;
  } catch { return false; }
}

export async function deleteReminder(reminderId: string): Promise<boolean> {
  try {
    const r = await safeFetch(`${API_BASE}/api/couple/checklist/${reminderId}`, {
      method: 'DELETE',
    });
    return !!r?.success;
  } catch { return false; }
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  couple_id: string;
  event?: string | null;
  category?: string | null;
  description?: string | null;
  vendor_name?: string | null;
  planned_amount?: number | null;
  actual_amount?: number | null;
  payment_status?: 'pending' | 'paid' | 'committed' | string | null;
  receipt_url?: string | null;
  due_date?: string | null;
  notes?: string | null;
  created_at?: string;
}

export async function fetchMyExpenses(): Promise<Expense[] | null> {
  const session = await getCoupleSession();
  if (!session) return null;
  try {
    const r = await safeFetch(`${API_BASE}/api/couple/expenses/${session.id}`);
    if (r?.success && Array.isArray(r.data)) return r.data as Expense[];
    return null;
  } catch { return null; }
}

export async function markExpensePaid(expenseId: string): Promise<boolean> {
  try {
    const r = await safeFetch(`${API_BASE}/api/couple/expenses/${expenseId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_status: 'paid' }),
    });
    return !!r?.success;
  } catch { return false; }
}

export async function deleteExpense(expenseId: string): Promise<boolean> {
  try {
    const r = await safeFetch(`${API_BASE}/api/couple/expenses/${expenseId}`, {
      method: 'DELETE',
    });
    return !!r?.success;
  } catch { return false; }
}

// ─── Vendors ─────────────────────────────────────────────────────────────────

export interface CoupleVendor {
  id: string;
  couple_id: string;
  vendor_id?: string | null;
  name: string;
  category?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  events?: string[] | null;
  status?: string | null;
  quoted_total?: number | null;
  balance_due_date?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export async function fetchMyVendors(): Promise<CoupleVendor[] | null> {
  const session = await getCoupleSession();
  if (!session) return null;
  try {
    const r = await safeFetch(`${API_BASE}/api/couple/vendors/${session.id}`);
    if (r?.success && Array.isArray(r.data)) return r.data as CoupleVendor[];
    return null;
  } catch { return null; }
}

export async function deleteVendor(vendorRowId: string): Promise<boolean> {
  try {
    const r = await safeFetch(`${API_BASE}/api/couple/vendors/${vendorRowId}`, {
      method: 'DELETE',
    });
    return !!r?.success;
  } catch { return false; }
}

// ─── Events ──────────────────────────────────────────────────────────────────

export interface CoupleEvent {
  id: string;
  couple_id: string;
  event_name?: string | null;
  event_type?: string | null;
  event_date?: string | null;
  venue?: string | null;
  task_count?: number;
  vendor_count?: number;
  guest_count?: number;
  category_budgets?: any[];
  sort_order?: number;
}

export async function fetchMyEvents(): Promise<CoupleEvent[] | null> {
  const session = await getCoupleSession();
  if (!session) return null;
  try {
    const r = await safeFetch(`${API_BASE}/api/v2/couple/events/${session.id}`);
    if (r?.success && Array.isArray(r.data)) return r.data as CoupleEvent[];
    return null;
  } catch { return null; }
}

// ─── Messages (vendor enquiry threads) ───────────────────────────────────────

export interface EnquiryThread {
  id: string;
  vendor_id: string;
  couple_id: string;
  status?: string;
  last_message_at?: string;
  last_message_preview?: string;
  last_message_from?: 'couple' | 'vendor' | string;
  couple_unread_count?: number;
  vendor_unread_count?: number;
  vendor?: {
    id: string;
    name?: string;
    category?: string;
    city?: string;
    portfolio_images?: string[];
    featured_photos?: string[];
    phone?: string;
  } | null;
}

export interface EnquiryMessage {
  id: string;
  enquiry_id: string;
  from_role: 'couple' | 'vendor';
  content: string;
  created_at: string;
  attachments?: any[];
}

export async function fetchMyEnquiries(): Promise<EnquiryThread[] | null> {
  const session = await getCoupleSession();
  if (!session) return null;
  try {
    const r = await safeFetch(`${API_BASE}/api/enquiries/couple/${session.id}`);
    if (r?.success && Array.isArray(r.data)) return r.data as EnquiryThread[];
    return null;
  } catch { return null; }
}

export async function fetchEnquiryThread(enquiryId: string): Promise<{
  enquiry: EnquiryThread;
  messages: EnquiryMessage[];
  vendor: any;
} | null> {
  try {
    const r = await safeFetch(`${API_BASE}/api/enquiries/${enquiryId}`);
    if (r?.success && r.data) return r.data;
    return null;
  } catch { return null; }
}

export async function sendEnquiryMessage(enquiryId: string, content: string): Promise<boolean> {
  try {
    const r = await safeFetch(`${API_BASE}/api/enquiries/${enquiryId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_role: 'couple', content }),
    });
    return !!r?.success;
  } catch { return false; }
}
