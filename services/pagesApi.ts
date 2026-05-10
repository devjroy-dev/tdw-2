/**
 * services/pagesApi.ts
 *
 * Sanctuary mode + Pages screen API client.
 *
 * Lives separately from services/frostApi.ts because frostApi.ts is in the
 * auth-cleanup boundary (DO NOT TOUCH per SESSION_BOUNDARIES.md). This file
 * is a read-only consumer of getCoupleSession (imported, not modified) and
 * implements its own minimal fetch helper for the new /pages/* endpoints.
 *
 * Endpoints called:
 *   GET /api/v2/pages/summary?couple_id=…   → sub-line strings for Sanctuary blocks
 *   GET /api/v2/pages/:slice?couple_id=…    → structured payload per slice
 *
 * Slices: 'vendors' | 'money' | 'dates'.
 */

import { API_BASE, getCoupleSession } from './frostApi';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PagesSummary {
  muse: string;
  moments: string;
  pages: string;
}

export interface PagesSummaryResponse {
  success: boolean;
  data?: PagesSummary;
  cached?: boolean;
  error?: string;
}

export type PagesSliceKey = 'vendors' | 'money' | 'dates';

export interface PagesVendorRow {
  id: string;
  name: string;
  category: string | null;
  status: string | null;
  quoted_total: number | null;
  balance_due_date: string | null;
  events: any;
  phone: string | null;
  contract_url: string | null;
}

export interface PagesMoneyRow {
  id: string;
  event: string | null;
  category: string | null;
  description: string | null;
  vendor_name: string | null;
  planned_amount: number | null;
  actual_amount: number | null;
  payment_status: string | null;
  due_date: string | null;
  created_at: string;
  receipt_url: string | null;
}

export interface PagesDateRow {
  id: string;
  type: 'event' | 'expense' | 'vendor' | 'task';
  date: string;
  label: string;
  sub: string | null;
  amount?: number | null;
  ref_id: string;
}

export interface PagesSliceResponse {
  success: boolean;
  slice?: PagesSliceKey;
  data?: any;
  total?: number;
  total_rows?: number;
  totals?: { planned: number; actual: number; outstanding: number };
  group_by?: 'vendor' | 'category';
  error?: string;
}

// ─── Internal helpers ──────────────────────────────────────────────────────

/**
 * Minimal fetch helper. Mirrors safeFetch in frostApi.ts but is local to this
 * module so it stays outside the auth-cleanup boundary.
 */
async function pagesFetch(url: string, init?: RequestInit): Promise<any> {
  try {
    const r = await fetch(url, init);
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      return { success: false, error: `HTTP ${r.status}: ${body.slice(0, 120)}` };
    }
    return await r.json();
  } catch (err: any) {
    return { success: false, error: err?.message || 'network' };
  }
}

// ─── Exports ───────────────────────────────────────────────────────────────

/**
 * Fetch the three Sanctuary block sub-lines.
 * Returns Loading-state-friendly shape on failure (callers can fall back to
 * locked copy).
 */
export async function fetchPagesSummary(): Promise<PagesSummaryResponse> {
  const session = await getCoupleSession();
  if (!session) {
    return { success: false, error: 'no_session' };
  }
  const url = `${API_BASE}/api/v2/pages/summary?couple_id=${encodeURIComponent(session.id)}`;
  const r = await pagesFetch(url);
  if (!r?.success) {
    return { success: false, error: r?.error || 'unknown' };
  }
  return {
    success: true,
    data: r.data,
    cached: !!r.cached,
  };
}

/**
 * Fetch a single Pages slice.
 * For 'money', optional groupBy param (default 'vendor').
 */
export async function fetchPagesSlice(
  slice: PagesSliceKey,
  options?: { groupBy?: 'vendor' | 'category' },
): Promise<PagesSliceResponse> {
  const session = await getCoupleSession();
  if (!session) {
    return { success: false, error: 'no_session' };
  }
  let url = `${API_BASE}/api/v2/pages/${slice}?couple_id=${encodeURIComponent(session.id)}`;
  if (slice === 'money' && options?.groupBy) {
    url += `&group_by=${options.groupBy}`;
  }
  const r = await pagesFetch(url);
  if (!r?.success) {
    return { success: false, error: r?.error || 'unknown' };
  }
  return {
    success: true,
    slice: r.slice,
    data: r.data,
    total: r.total,
    total_rows: r.total_rows,
    totals: r.totals,
    group_by: r.group_by,
  };
}
