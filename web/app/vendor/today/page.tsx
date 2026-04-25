'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ─── Session ──────────────────────────────────────────────────────────────────
interface VendorSession {
  vendorId: string;
  vendorName: string;
  category?: string;
  city?: string;
  tier?: string;
}

function getSession(): VendorSession | null {
  if (typeof window === 'undefined') return null;
  try {
    // Check both keys — login paths are inconsistent about which one they write.
    // vendor_session is set by some OTP paths; vendor_web_session by others.
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Normalise name — could be stored as vendorName or name
    if (!s.vendorName && s.name) s.vendorName = s.name;
    if (!s.name && s.vendorName) s.name = s.vendorName;
    return s;
  } catch { return null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface AttentionItem {
  id: string;
  type: 'invoice' | 'enquiry' | 'shoot';
  title: string;
  subtitle: string;
  amount?: number;
  cta: string;
}
interface ScheduleItem {
  id: string;
  time: string;
  event_name: string;
  client_name?: string;
}
interface Snapshot {
  views: number;
  saves: number;
  enquiries: number;
  views_delta: number;
  saves_delta: number;
  enquiries_delta: number;
}
interface TodayData {
  needs_attention: AttentionItem[];
  todays_schedule: ScheduleItem[];
  this_week_summary: string;
  snapshot: Snapshot;
}
interface DreamAiContext {
  vendor: { name: string | null; category: string | null; tier: string };
  clients: { id: string; name: string; event_type: string; event_date: string }[];
  invoices: { id: string; client_name: string; amount: number; paid: boolean; due_date: string }[];
  enquiries: { id: string; name: string; message: string; date: string }[];
  revenue: { this_month: number; last_month: number; outstanding: number };
  overdue_invoices: { client_name: string; amount: number; due_date: string }[];
}
interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  actionType?: string;
  actionLabel?: string;
  actionPreview?: string;
  actionParams?: Record<string, any>;
}

// ─── Shimmer ──────────────────────────────────────────────────────────────────
const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg,#EEEBE6 25%,#F8F7F5 50%,#EEEBE6 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 8,
};
function Shimmer({ h, w = '100%', br = 8, mt = 0 }: { h: number; w?: string | number; br?: number; mt?: number }) {
  return <div style={{ ...shimmerStyle, height: h, width: w, borderRadius: br, marginTop: mt }} />;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function attentionCount(n: number) {
  if (n === 0) return 'All clear for today.';
  if (n === 1) return 'One moment for today.';
  if (n === 2) return 'Two moments for today.';
  return 'Three moments for today.';
}

function deltaLabel(d: number) {
  if (d === 0) return '—';
  return (d > 0 ? '+' : '') + d + ' vs last week';
}

// ─── Attention Card ───────────────────────────────────────────────────────────
function AttentionCard({ item }: { item: AttentionItem }) {
  const isOverdue = item.type === 'invoice';
  return (
    <div style={{
      background: '#FFFFFF', border: '0.5px solid #E2DED8',
      borderRadius: 8, padding: 16, marginBottom: 10,
      willChange: 'transform', touchAction: 'manipulation',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 300,
          color: '#111111', margin: 0, flex: 1, paddingRight: 12, lineHeight: 1.3,
        }}>{item.title}</p>
        {isOverdue && item.amount && (
          <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, fontWeight: 400, color: '#C9A84C' }}>
            {fmtINR(item.amount)}
          </span>
        )}
      </div>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
        color: '#888580', margin: '0 0 12px', lineHeight: 1.4,
      }}>{item.subtitle}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isOverdue && (
          <span style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: '#C9A84C', background: 'rgba(201,168,76,0.08)',
            padding: '3px 8px', borderRadius: 100,
          }}>OVERDUE</span>
        )}
        <button style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
          letterSpacing: '0.2em', textTransform: 'uppercase',
          color: '#555250', background: 'none', border: 'none',
          cursor: 'pointer', padding: 0,
          marginLeft: isOverdue ? 0 : 'auto',
          touchAction: 'manipulation',
        }}>{item.cta} →</button>
      </div>
    </div>
  );
}

// ─── Snapshot Number ──────────────────────────────────────────────────────────
function SnapNum({ label, value, delta }: { label: string; value: number; delta: number }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <p style={{
        fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300,
        color: '#111111', margin: '0 0 2px', lineHeight: 1,
      }}>{value}</p>
      <p style={{
        fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
        letterSpacing: '0.2em', textTransform: 'uppercase',
        color: '#888580', margin: '0 0 4px',
      }}>{label}</p>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300,
        color: '#888580', margin: 0,
      }}>{deltaLabel(delta)}</p>
    </div>
  );
}

// Robust ACTION tag parser — handles complex JSON params
function parseActionTag(text: string) {
  const start = text.indexOf('[ACTION:');
  if (start === -1) return null;
  const end = text.lastIndexOf(']');
  if (end === -1 || end <= start) return null;
  const tagContent = text.slice(start + 8, end); // after [ACTION:
  const firstPipe = tagContent.indexOf('|');
  const secondPipe = tagContent.indexOf('|', firstPipe + 1);
  const lastBrace = tagContent.lastIndexOf('{');
  if (firstPipe === -1 || secondPipe === -1 || lastBrace === -1) return null;
  const type = tagContent.slice(0, firstPipe);
  const label = tagContent.slice(firstPipe + 1, secondPipe);
  const preview = tagContent.slice(secondPipe + 1, lastBrace - 1).trim();
  const paramsStr = tagContent.slice(lastBrace);
  let params = {};
  try { params = JSON.parse(paramsStr); } catch {}
  const cleanText = (text.slice(0, start) + text.slice(end + 1)).trim();
  return { type, label, preview, params, cleanText };
}

// ─── DreamAi Sheet ────────────────────────────────────────────────────────────
function DreamAiSheet({
  visible,
  onClose,
  context,
  vendorId,
  prefill,
}: {
  visible: boolean;
  onClose: () => void;
  context: DreamAiContext | null;
  vendorId: string;
  prefill?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Context-aware quick prompts — generated fresh from context
  const quickChips = context ? [
    (context as any).overdue_invoices?.length > 0
      ? `Who owes me money?`
      : `What's my revenue this month?`,
    (context as any).enquiries?.length > 0
      ? `Any unanswered enquiries?`
      : `What's my schedule this week?`,
    `Draft a payment reminder for my next client`,
    `Any conflicts next month?`,
  ] : [
    "Who owes me money?",
    "Any unanswered enquiries?",
    "What's my schedule this week?",
    "Draft a payment reminder",
  ];

  useEffect(() => {
    if (visible && prefill) setInput(prefill);
  }, [visible, prefill]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function executeVendorAction(type: string, params: Record<string, any>) {
    // All 8 DreamAi actions — matches the WhatsApp DreamAi tool set exactly
    const endpointMap: Record<string, string> = {
      send_payment_reminder:  '/api/v2/dreamai/vendor-action/send-payment-reminder',
      reply_to_enquiry:       '/api/v2/dreamai/vendor-action/reply-to-enquiry',
      block_date:             '/api/v2/dreamai/vendor-action/block-date',
      log_expense:            '/api/v2/dreamai/vendor-action/log-expense',
      create_invoice:         '/api/v2/dreamai/vendor-action/create-invoice',
      add_client:             '/api/v2/dreamai/vendor-action/add-client',
      create_task:            '/api/v2/dreamai/vendor-action/create-task',
      send_client_reminder:   '/api/v2/dreamai/vendor-action/send-client-reminder',
    };
    const endpoint = endpointMap[type];
    if (!endpoint) return 'Unknown action.';
    try {
      const r = await fetch(`${API}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: vendorId, ...params }),
      });
      const d = await r.json();
      return d.message || 'Done.';
    } catch { return 'Could not complete action.'; }
  }

  async function sendMessage(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v2/dreamai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: vendorId, userType: 'vendor', message: msg, context,
          history: messages.slice(-10),
        }),
      });
      const json = await res.json();
      const replyText = json.reply || 'Something went wrong. Please try again.';

      // Robust ACTION tag parser
      const parsed = parseActionTag(replyText);
      const cleanText = parsed ? parsed.cleanText : replyText.replace(/\[ACTION:[^\]]*\]/g, '').trim();
      if (parsed) {
        setMessages(prev => [...prev, {
          role: 'ai', text: cleanText,
          actionType: parsed.type, actionLabel: parsed.label,
          actionPreview: parsed.preview, actionParams: parsed.params,
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: cleanText }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Unable to reach DreamAi. Please check your connection.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(17,17,17,0.4)',
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? 'auto' : 'none',
          transition: 'opacity 280ms cubic-bezier(0.22,1,0.36,1)',
          willChange: 'opacity',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301,
        height: '92dvh', background: '#FFFFFF',
        borderRadius: '24px 24px 0 0',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
        willChange: 'transform',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px 12px', borderBottom: '0.5px solid #E2DED8',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>✦</span>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 22, fontWeight: 300, color: '#111111',
            }}>DreamAi</span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13,
            color: '#888580', padding: 4, touchAction: 'manipulation',
          }}>✕</button>
        </div>

        {/* Quick chips — context-aware */}
        {messages.length === 0 && (
          <div style={{
            display: 'flex', gap: 8, padding: '12px 20px',
            overflowX: 'auto', scrollbarWidth: 'none',
          }}>
            {quickChips.map(chip => (
              <button key={chip} onClick={() => sendMessage(chip)} style={{
                flexShrink: 0,
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
                color: '#555250', background: '#FFFFFF',
                border: '0.5px solid #E2DED8', borderRadius: 100,
                padding: '6px 14px', cursor: 'pointer',
                touchAction: 'manipulation', whiteSpace: 'nowrap',
              }}>{chip}</button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: 48 }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 18, fontWeight: 300, fontStyle: 'italic',
                color: '#888580', margin: 0,
              }}>Ask anything about your business.</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i}>
              <div style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: m.actionType ? 4 : 12,
              }}>
                <div style={{
                  maxWidth: '80%',
                  background: m.role === 'user' ? '#FFFFFF' : '#F8F7F5',
                  border: m.role === 'user' ? '0.5px solid #C9A84C' : '0.5px solid #E2DED8',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px',
                }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                    fontWeight: 300, color: '#111111', margin: 0, lineHeight: 1.5,
                  }}>{m.text || ''}</p>
                </div>
              </div>
              {m.actionType && m.actionPreview && (
                <div style={{ background: '#F8F7F5', border: '1px solid #C9A84C', borderRadius: 12, padding: '12px 14px', margin: '4px 0 12px' }}>
                  <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 6px' }}>✦ Action Preview</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111', margin: '0 0 12px', lineHeight: 1.5 }}>{m.actionPreview}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={async () => {
                      const result = await executeVendorAction(m.actionType!, m.actionParams || {});
                      setMessages(prev => [...prev, { role: 'ai', text: result }]);
                      setMessages(prev => prev.map((msg, idx) => idx === i ? { ...msg, actionType: undefined } : msg));
                    }} style={{ flex: 1, height: 36, background: '#C9A84C', border: 'none', borderRadius: 100, fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#111', cursor: 'pointer', touchAction: 'manipulation' }}>Confirm</button>
                    <button onClick={() => setMessages(prev => prev.map((msg, idx) => idx === i ? { ...msg, actionType: undefined } : msg))} style={{ height: 36, padding: '0 14px', background: 'transparent', border: '1px solid #E2DED8', borderRadius: 100, fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888580', cursor: 'pointer', touchAction: 'manipulation' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div style={{
                background: '#F8F7F5', border: '0.5px solid #E2DED8',
                borderRadius: '16px 16px 16px 4px', padding: '10px 16px',
              }}>
                <div style={{ ...shimmerStyle, height: 14, width: 120, borderRadius: 4 }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{
          display: 'flex', gap: 10, padding: '12px 16px',
          borderTop: '0.5px solid #E2DED8',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          background: '#FFFFFF',
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(input); }}
            placeholder="Ask anything about your business..."
            style={{
              flex: 1, height: 44,
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
              color: '#111111', background: '#F8F7F5',
              border: '0.5px solid #E2DED8', borderRadius: 22,
              padding: '0 16px', outline: 'none',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: input.trim() ? '#C9A84C' : '#E2DED8',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, touchAction: 'manipulation',
              transition: 'background 200ms cubic-bezier(0.22,1,0.36,1)',
              willChange: 'transform',
            }}
          >
            <span style={{ color: '#FFFFFF', fontSize: 16 }}>↑</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Quick Actions ───────────────────────────────────────────────────────────
// ─── WhatsApp Nudge — slim expandable card ───────────────────────────────────
function WhatsAppNudge({ onDone }: { onDone: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{
      background: '#0C0A09',
      border: '1px solid #C9A84C',
      borderRadius: 10,
      marginBottom: 10,
      overflow: 'hidden',
      transition: 'all 260ms cubic-bezier(0.22,1,0.36,1)',
    }}>
      {/* Slim header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '12px 16px', cursor: 'pointer', touchAction: 'manipulation',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#C9A84C', fontSize: 13 }}>✦</span>
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
            color: '#F8F7F5',
          }}>Control TDW through WhatsApp</span>
          <span style={{
            fontFamily: "'Jost', sans-serif", fontSize: 7, fontWeight: 400,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#2d7a2d', background: 'rgba(34,139,34,0.12)',
            border: '0.5px solid rgba(34,139,34,0.35)',
            borderRadius: 100, padding: '2px 7px',
          }}>Beta</span>
        </div>
        <span style={{ color: '#C9A84C', fontSize: 14, transition: 'transform 200ms ease', transform: expanded ? 'rotate(180deg)' : 'none' }}>⌄</span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: '0.5px solid rgba(201,168,76,0.2)' }}>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
            color: 'rgba(248,247,245,0.55)', margin: '12px 0 6px', lineHeight: 1.5,
          }}>
            Your AI business assistant lives on WhatsApp. Add clients, create invoices, check your revenue — all by text message.
          </p>
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300,
            color: '#C9A84C', margin: '10px 0 2px', letterSpacing: '0.05em',
          }}>+1 415 523 8886</p>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300,
            color: 'rgba(248,247,245,0.45)', margin: '0 0 14px',
          }}>
            Send: <span style={{ color: '#C9A84C' }}>"join acres-eventually"</span> · Then: <span style={{ color: '#C9A84C' }}>"What can you do?"</span>
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <a
              href="https://wa.me/14155238886?text=join%20acres-eventually"
              target="_blank" rel="noreferrer"
              onClick={onDone}
              style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                letterSpacing: '0.18em', textTransform: 'uppercase',
                color: '#C9A84C', textDecoration: 'none',
                border: '0.5px solid #C9A84C', borderRadius: 100,
                padding: '7px 14px', touchAction: 'manipulation',
              }}
            >Open WhatsApp →</a>
            <button onClick={onDone} style={{
              fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'rgba(248,247,245,0.3)', background: 'none', border: 'none',
              cursor: 'pointer', padding: 0, touchAction: 'manipulation',
            }}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Horizontally scrollable pill strip — one tap, no confirmations.
// Sits between the hero greeting and the DreamAi nudge card.
function QuickActions({
  onDreamAi,
  category,
}: {
  onDreamAi: () => void;
  category?: string;
}) {
  const router = useRouter();

  const universalActions = [
    { label: 'New Client',  icon: '＋', action: () => router.push('/vendor/clients?action=new') },
    { label: 'New Invoice', icon: '₹',  action: () => router.push('/vendor/money?action=invoice') },
    { label: 'Block Date',  icon: '◻',  action: () => router.push('/vendor/studio/calendar?action=block') },
    { label: 'Ask DreamAi',icon: '✦',  action: onDreamAi },
    { label: 'Broadcast',   icon: '◉',  action: () => router.push('/vendor/studio/broadcast') },
    { label: 'Leads',       icon: '↗',  action: () => router.push('/vendor/leads') },
  ];

  const categoryAction = ({
    photographer:  { label: 'Add Shoot',    icon: '◈', action: () => router.push('/vendor/studio/calendar?action=shoot') },
    videographer:  { label: 'Add Shoot',    icon: '◈', action: () => router.push('/vendor/studio/calendar?action=shoot') },
    mua:           { label: 'Add Trial',    icon: '◎', action: () => router.push('/vendor/clients?action=trial') },
    decorator:     { label: 'Site Visit',   icon: '⬡', action: () => router.push('/vendor/studio/calendar?action=visit') },
    venue:         { label: 'Book Tour',    icon: '⬡', action: () => router.push('/vendor/clients?action=tour') },
    event_manager: { label: 'New Brief',    icon: '◐', action: () => router.push('/vendor/clients?action=brief') },
    choreographer: { label: 'Book Session', icon: '◉', action: () => router.push('/vendor/studio/calendar?action=session') },
    mehendi:       { label: 'Add Booking',  icon: '✦', action: () => router.push('/vendor/clients?action=new') },
    caterer:       { label: 'Menu Call',    icon: '◻', action: () => router.push('/vendor/clients?action=call') },
    designer:      { label: 'Book Fitting', icon: '◎', action: () => router.push('/vendor/clients?action=fitting') },
    jeweller:      { label: 'Book Viewing', icon: '◎', action: () => router.push('/vendor/clients?action=viewing') },
  } as Record<string, { label: string; icon: string; action: () => void }>)[category?.toLowerCase() || '']
    || { label: 'Add Task', icon: '◐', action: () => router.push('/vendor/studio/calendar') };

  const allActions = [...universalActions, categoryAction];

  return (
    <div style={{ padding: '0 20px', marginBottom: 28 }}>
      <p style={{
        fontFamily: "'Jost', sans-serif",
        fontSize: 9, fontWeight: 300,
        letterSpacing: '0.25em', textTransform: 'uppercase',
        color: '#888580', margin: '0 0 12px',
      }}>QUICK ACTIONS</p>

      <div style={{
        display: 'flex', gap: 8,
        overflowX: 'auto', scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        paddingBottom: 4,
        marginRight: -20,
        paddingRight: 20,
      }}>
        {allActions.map((a, i) => (
          <button
            key={i}
            onClick={a.action}
            style={{
              flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 6,
              height: 38, padding: '0 14px',
              background: '#111111',
              border: '1px solid #C9A84C',
              borderRadius: 100,
              cursor: 'pointer',
              touchAction: 'manipulation',
              willChange: 'transform',
              transition: 'transform 120ms ease',
            }}
            onPointerDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)'; }}
            onPointerUp={e =>   { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
            onPointerLeave={e =>{ (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
          >
            <span style={{ fontSize: 12, color: '#C9A84C', lineHeight: 1 }}>{a.icon}</span>
            <span style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 9,
              fontWeight: 400,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: '#F8F7F5',
              whiteSpace: 'nowrap',
            }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
// Push notification helpers
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function savePushSubscription(vendorId: string, sub: PushSubscription) {
  await fetch(`${API}/api/v2/vendor/push-subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vendor_id: vendorId, subscription: sub.toJSON() }),
  }).catch(() => {});
}

async function subscribeToPush(vendorId: string) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await savePushSubscription(vendorId, existing);
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) return;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    await savePushSubscription(vendorId, sub);
  } catch {}
}

export default function VendorTodayPage() {
  const router = useRouter();
  const [session, setSession]         = useState<VendorSession | null | undefined>(undefined);
  const [data, setData]               = useState<TodayData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [dreamAiOpen, setDreamAiOpen] = useState(false);
  const [dreamAiPrefill, setDreamAiPrefill] = useState('');
  const [dreamAiContext, setDreamAiContext] = useState<DreamAiContext | null>(null);
  const [nudge, setNudge]             = useState<{ text: string; query: string } | null>(null);
  const [vendorCreatedAt, setVendorCreatedAt] = useState<string | null>(null);
  const [clientCount, setClientCount]         = useState<number>(-1); // -1 = loading
  const [showIntroCard, setShowIntroCard]     = useState(false);
  const [introDismissed, setIntroDismissed]   = useState(false);
  // Onboarding card completion flags — must stay here, not after early returns (Rules of Hooks)
  const [card1Done, setCard1Done] = useState(false);
  const [card2Done, setCard2Done] = useState(false);
  const [card3Done, setCard3Done] = useState(
    typeof window !== 'undefined' && !!localStorage.getItem('whatsapp_activated')
  );

  useEffect(() => {
    const s = getSession();
    setSession(s);
    if (!s) return;

    // PWA restore — redirect to last visited path if different from today
    const lastPath = typeof window !== 'undefined' ? localStorage.getItem('vendor_last_path') : null;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    if (lastPath && lastPath !== currentPath && lastPath !== '/vendor/today') {
      router.replace(lastPath);
      return;
    }

    // Fetch vendor profile to get name if missing in session
    if (!s.vendorName) {
      fetch(`${API}/api/vendors/${s.vendorId}`)
        .then(r => r.json())
        .then(d => {
          if (d.name) {
            const updated = { ...s, vendorName: d.name, name: d.name };
            localStorage.setItem('vendor_session', JSON.stringify(updated));
            localStorage.setItem('vendor_web_session', JSON.stringify(updated));
            setSession(prev => prev ? { ...prev, vendorName: d.name } : prev);
          }
        }).catch(() => {});
    }
    fetch(`${API}/api/v2/vendor/today/${s.vendorId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    // DreamAi context
    fetch(`${API}/api/v2/dreamai/vendor-context/${s.vendorId}`)
      .then(r => r.json())
      .then(json => {
        setDreamAiContext(json);
        if (json.overdue_invoices?.length > 0) {
          const total = json.overdue_invoices.reduce((s: number, i: { amount: number }) => s + (i.amount || 0), 0);
          const n = json.overdue_invoices.length;
          setNudge({
            text: `₹${total.toLocaleString('en-IN')} outstanding from ${n} client${n > 1 ? 's' : ''}.`,
            query: "Who owes me money?",
          });
        } else if (json.enquiries?.length > 0) {
          const n = json.enquiries.length;
          setNudge({
            text: `${n} new enquir${n > 1 ? 'ies' : 'y'} need your attention.`,
            query: "Draft a reply to my latest enquiry",
          });
        } else {
          setNudge({
            text: 'Your calendar looks clear for the next 30 days.',
            query: "What does my schedule look like?",
          });
        }
      })
      .catch(() => {});

    // Fetch vendor row for created_at (needed for onboarding + tip of day timing)
    fetch(`${API}/api/vendors/${s.vendorId}`)
      .then(r => r.json())
      .then(d => {
        if (d.data?.created_at) setVendorCreatedAt(d.data.created_at);
      })
      .catch(() => {});

    // Fetch client count to decide if onboarding banner should show
    fetch(`${API}/api/v2/vendor/clients/${s.vendorId}`)
      .then(r => r.json())
      .then(d => setClientCount((d.data || []).length))
      .catch(() => setClientCount(0));

    // First-login intro card — show once per device
    const seen = localStorage.getItem('onboarding_intro_seen');
    if (!seen) {
      setShowIntroCard(true);
      localStorage.setItem('onboarding_intro_seen', 'true');
    }

    // Push notification subscription
    subscribeToPush(s.vendorId);
  }, []);

  if (session === undefined) return null;
  if (!session) {
    if (typeof window !== 'undefined') window.location.replace('/vendor/login');
    return null;
  }

  const nameInitials = initials(session.vendorName || 'M');
  const firstName = (session.vendorName || 'Maker').split(' ')[0];
  const attention = data?.needs_attention || [];
  const schedule = data?.todays_schedule || [];
  const summary = data?.this_week_summary || '';
  const snap = data?.snapshot || { views: 0, saves: 0, enquiries: 0, views_delta: 0, saves_delta: 0, enquiries_delta: 0 };

  function openDreamAi(prefill?: string) {
    setDreamAiPrefill(prefill || '');
    setDreamAiOpen(true);
  }

  // ─── Onboarding + tip logic ─────────────────────────────────────────────────
  const daysSinceSignup = vendorCreatedAt
    ? Math.floor((Date.now() - new Date(vendorCreatedAt).getTime()) / 86400000)
    : null;

  // New vendor = joined < 14 days ago AND has no clients yet
  const isNewVendor = daysSinceSignup !== null && daysSinceSignup < 14 && clientCount === 0;

  // Onboarding 3-card banner: show if new vendor
  const showOnboardingBanner = isNewVendor && clientCount === 0;

  // 10-day urgency: days 8-10 from signup, if not yet submitted to Discovery
  const showUrgencyBanner = daysSinceSignup !== null && daysSinceSignup >= 8 && daysSinceSignup <= 10;

  // Post-10-day gentle nudge
  const showGentleNudge = daysSinceSignup !== null && daysSinceSignup > 10;

  // Tip of the Day: first 30 days only, rotates through 10 tips
  const TIPS_SHORT = [
    { id: 'dreamai_whatsapp', title: 'DreamAi on WhatsApp', desc: 'Run your entire business from WhatsApp.' },
    { id: 'payment_shield',   title: 'Payment Shield',      desc: 'Secure your final payment before the wedding day.' },
    { id: 'broadcast',        title: 'WhatsApp Broadcast',  desc: 'Message all your clients at once with one tap.' },
    { id: 'discovery_profile',title: 'How Couples See You', desc: 'Your photos do the selling — names come later.' },
    { id: 'progress_ring',    title: 'Client Progress Ring', desc: 'Watch each client move from enquiry to final payment.' },
    { id: 'gst_invoice',      title: 'GST Invoicing',       desc: 'Every invoice auto-calculates CGST and SGST.' },
    { id: 'block_dates',      title: 'Block Your Calendar', desc: 'Block dates the moment you confirm a booking.' },
    { id: 'referral',         title: 'Referral Discounts',  desc: 'Refer couples and earn subscription discounts.' },
    { id: 'collab_hub',       title: 'Collab Hub',          desc: 'Post when you need a vendor or find work from others.' },
    { id: 'image_hub',        title: 'Image Hub',           desc: 'Make your photos catalogue-worthy before submitting.' },
  ];
  const showTipOfDay = daysSinceSignup !== null && daysSinceSignup < 30;
  const todaysTip = showTipOfDay ? TIPS_SHORT[daysSinceSignup % TIPS_SHORT.length] : null;



  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ─── First-login intro card ─────────────────────────────────────────
          Shows once per device. Explains the 3-level discovery system.
          Not dismissable by backdrop — vendor must tap the button.
      ────────────────────────────────────────────────────────────────────── */}
      {showIntroCard && !introDismissed && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400,
          background: 'rgba(12,10,9,0.85)',
          display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            width: '100%', background: '#0C0A09',
            borderRadius: '24px 24px 0 0',
            padding: '20px 24px',
            paddingBottom: 'calc(28px + env(safe-area-inset-bottom))',
            border: '1px solid #2A2825',
            animation: 'slideUp 380ms cubic-bezier(0.22,1,0.36,1)',
          }}>
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#2A2825' }} />
            </div>

            {/* TDW wordmark */}
            <p style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
              letterSpacing: '0.3em', textTransform: 'uppercase',
              color: '#555250', textAlign: 'center', margin: '0 0 16px',
            }}>THE DREAM WEDDING</p>

            {/* Welcome */}
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300,
              color: '#F8F7F5', textAlign: 'center', margin: '0 0 6px', lineHeight: 1.1,
            }}>Welcome, {firstName}.</h2>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
              color: '#555250', textAlign: 'center', margin: '0 0 24px',
            }}>Your CRM is live. Discovery works differently here.</p>

            {/* Divider */}
            <div style={{ height: '0.5px', background: '#2A2825', margin: '0 0 20px' }} />

            {/* 3 levels */}
            {[
              { num: '①', text: 'Basic info & 4 photos', sub: 'Unlocks your Discovery profile' },
              { num: '②', text: 'Complete bio & vibe tags', sub: 'Unlocks your Submit button' },
              { num: '③', text: 'Our team reviews and lists you', sub: 'You go live on couple discovery' },
            ].map(step => (
              <div key={step.num} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16,
              }}>
                <span style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300,
                  color: '#C9A84C', flexShrink: 0, lineHeight: 1,
                }}>{step.num}</span>
                <div>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
                    color: '#F8F7F5', margin: '0 0 2px',
                  }}>{step.text}</p>
                  <p style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                    letterSpacing: '0.12em', color: '#C9A84C', margin: 0, textTransform: 'uppercase',
                  }}>{step.sub}</p>
                </div>
              </div>
            ))}

            {/* Divider */}
            <div style={{ height: '0.5px', background: '#2A2825', margin: '0 0 20px' }} />

            {/* Tagline */}
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 15, fontWeight: 300,
              fontStyle: 'italic', color: '#555250', textAlign: 'center', margin: '0 0 24px',
            }}>The CRM is yours from Day 1. Discovery is earned.</p>

            {/* CTA — only way to dismiss */}
            <button
              onClick={() => setIntroDismissed(true)}
              style={{
                width: '100%', height: 52, background: '#C9A84C', border: 'none',
                borderRadius: 100, cursor: 'pointer',
                fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 400,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0C0A09',
              }}
            >Got it — let's start →</button>
          </div>
        </div>
      )}

      <DreamAiSheet
        visible={dreamAiOpen}
        onClose={() => setDreamAiOpen(false)}
        context={dreamAiContext}
        vendorId={session.vendorId}
        prefill={dreamAiPrefill}
      />

      <div style={{
        background: '#F8F7F5', minHeight: '100dvh',
        paddingTop: 24,
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom) + 24px)',
        overflowX: 'hidden',
      }}>


        {/* Hero */}
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300,
            color: '#111111', margin: '0 0 6px', lineHeight: 1.15,
          }}>{getGreeting()}, {firstName}.</h1>
          {loading ? (
            <Shimmer h={14} w={180} br={4} />
          ) : (
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13,
              fontWeight: 300, color: '#888580', margin: 0,
            }}>{attentionCount(attention.length)}</p>
          )}
        </div>

        {/* Quick Actions */}
        <QuickActions
          onDreamAi={() => openDreamAi()}
          category={session.category}
        />

        {/* DreamAi Nudge */}
        {nudge && (
          <div style={{ padding: '0 20px', marginBottom: 24 }}>
            <button
              onClick={() => openDreamAi(nudge.query)}
              style={{
                width: '100%', textAlign: 'left',
                background: '#FFFFFF', border: '0.5px solid #E2DED8',
                borderLeft: '3px solid #C9A84C',
                borderRadius: 8, padding: 14,
                cursor: 'pointer', touchAction: 'manipulation',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, color: '#C9A84C', flexShrink: 0 }}>✦</span>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                  fontWeight: 300, color: '#111111', margin: 0, lineHeight: 1.4,
                }}>{nudge.text}</p>
              </div>
              <span style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                letterSpacing: '0.2em', color: '#C9A84C', flexShrink: 0,
              }}>ASK →</span>
            </button>
          </div>
        )}

        {/* ─── 10-day urgency banner ────────────────────────────────────────────
            Days 8-10: strong push to complete profile and submit for Discovery.
            Tone is calm urgency — "don't miss your chance", not "access expires".
        ─────────────────────────────────────────────────────────────────────── */}
        {showUrgencyBanner && (
          <div style={{ padding: '0 20px', marginBottom: 20 }}>
            <div style={{
              background: '#FFFFFF', border: '1.5px solid #C9A84C',
              borderRadius: 12, padding: '16px 18px',
            }}>
              <p style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C', margin: '0 0 6px',
              }}>DISCOVERY WINDOW</p>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
                color: '#111111', margin: '0 0 4px', lineHeight: 1.5,
              }}>
                Your profile window closes in {10 - (daysSinceSignup || 0)} day{10 - (daysSinceSignup || 0) !== 1 ? 's' : ''}.
              </p>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                color: '#888580', margin: '0 0 14px',
              }}>Complete your bio and submit for Discovery — India's first curated digital storefront.</p>
              <a href="/vendor/discovery/dash" style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C',
                textDecoration: 'none',
              }}>COMPLETE NOW →</a>
            </div>
          </div>
        )}

        {/* ─── Post-10-day gentle nudge ─────────────────────────────────────── */}
        {showGentleNudge && !showUrgencyBanner && (
          <div style={{ padding: '0 20px', marginBottom: 20 }}>
            <div style={{
              background: '#FFFFFF', border: '0.5px solid #E2DED8',
              borderRadius: 12, padding: '14px 18px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                color: '#555250', margin: 0,
              }}>Ready to go live? Your Discovery profile is waiting.</p>
              <a href="/vendor/discovery/dash" style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A84C',
                textDecoration: 'none', flexShrink: 0, marginLeft: 12,
              }}>SUBMIT →</a>
            </div>
          </div>
        )}

        {/* ─── New vendor onboarding banner ─────────────────────────────────────
            Shown if vendor is < 14 days old and has no clients yet.
            Each card disappears individually once the action is completed.
            Entire banner gone after 14 days or once all 3 cards are done.
        ─────────────────────────────────────────────────────────────────────── */}
        {showOnboardingBanner && !(card1Done && card2Done && card3Done) && (
          <div style={{ padding: '0 20px', marginBottom: 28 }}>
            <p style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
              letterSpacing: '0.25em', textTransform: 'uppercase',
              color: '#888580', margin: '0 0 12px',
            }}>THREE THINGS TO DO RIGHT NOW</p>

            {/* Card 1 — Add first client */}
            {!card1Done && (
              <div style={{
                background: '#FFFFFF', border: '0.5px solid #E2DED8',
                borderLeft: '3px solid #C9A84C',
                borderRadius: 8, padding: '14px 16px', marginBottom: 10,
              }}>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300,
                  color: '#111111', margin: '0 0 4px',
                }}>1. Add your first client</p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                  color: '#888580', margin: '0 0 12px',
                }}>Start tracking your bookings and revenue.</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a href="/vendor/clients" style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: '#C9A84C', textDecoration: 'none',
                  }}>GO TO CLIENTS →</a>
                  <button onClick={() => setCard1Done(true)} style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: '#C8C4BE', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0,
                  }}>Mark done</button>
                </div>
              </div>
            )}

            {/* Card 2 — Block dates */}
            {!card2Done && (
              <div style={{
                background: '#FFFFFF', border: '0.5px solid #E2DED8',
                borderLeft: '3px solid #C9A84C',
                borderRadius: 8, padding: '14px 16px', marginBottom: 10,
              }}>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300,
                  color: '#111111', margin: '0 0 4px',
                }}>2. Block your booked dates</p>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
                  color: '#888580', margin: '0 0 12px',
                }}>Keep your calendar accurate. Never double-book.</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <a href="/vendor/studio/calendar" style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: '#C9A84C', textDecoration: 'none',
                  }}>OPEN CALENDAR →</a>
                  <button onClick={() => setCard2Done(true)} style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: '#C8C4BE', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0,
                  }}>Mark done</button>
                </div>
              </div>
            )}

                        {/* Card 3 — WhatsApp DreamAi slim nudge */}
            {!card3Done && (
              <WhatsAppNudge onDone={() => { localStorage.setItem('whatsapp_activated', 'true'); setCard3Done(true); }} />
            )}
          </div>
        )}

        {/* Section 1 — Needs Attention */}
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <p style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            color: '#888580', margin: '0 0 14px',
          }}>NEEDS YOUR ATTENTION</p>

          {loading ? (
            <><Shimmer h={90} br={8} /><Shimmer h={90} br={8} mt={10} /><Shimmer h={90} br={8} mt={10} /></>
          ) : attention.length === 0 ? (
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 14,
              fontWeight: 300, fontStyle: 'italic', color: '#888580', margin: 0,
            }}>All clear for now.</p>
          ) : (
            attention.slice(0, 3).map(item => <AttentionCard key={item.id} item={item} />)
          )}
        </div>

        {/* Section 2 — Today's Schedule */}
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <p style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            color: '#888580', margin: '0 0 14px',
          }}>TODAY'S SCHEDULE</p>

          {loading ? (
            <><Shimmer h={48} br={4} /><Shimmer h={48} br={4} mt={2} /></>
          ) : schedule.length === 0 ? (
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 14,
              fontWeight: 300, fontStyle: 'italic', color: '#888580', margin: 0,
            }}>Nothing scheduled today.</p>
          ) : (
            schedule.map((item, i) => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'baseline', gap: 16, padding: '12px 0',
                borderBottom: i < schedule.length - 1 ? '0.5px solid #E2DED8' : 'none',
              }}>
                <span style={{
                  fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 300,
                  color: '#888580', flexShrink: 0, minWidth: 44,
                }}>{item.time}</span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif", fontSize: 17,
                    fontWeight: 300, color: '#111111', margin: '0 0 2px',
                  }}>{item.event_name}</p>
                  {item.client_name && (
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                      fontWeight: 300, color: '#888580', margin: 0,
                    }}>{item.client_name}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Section 3 — This Week */}
        {(loading || summary) && (
          <div style={{ padding: '0 20px', marginBottom: 32 }}>
            <p style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
              letterSpacing: '0.25em', textTransform: 'uppercase',
              color: '#888580', margin: '0 0 10px',
            }}>THIS WEEK</p>
            {loading ? (
              <Shimmer h={16} w="75%" br={4} />
            ) : (
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 14,
                fontWeight: 300, color: '#555250', margin: 0, lineHeight: 1.5,
              }}>{summary}</p>
            )}
          </div>
        )}

        {/* Section 4 — Discovery Snapshot */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <p style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            color: '#888580', margin: '0 0 14px',
          }}>DISCOVERY SNAPSHOT</p>

          {loading ? (
            <div style={{ display: 'flex', gap: 0 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                  <Shimmer h={32} w={48} br={4} />
                  <Shimmer h={8} w={40} br={4} mt={6} />
                  <Shimmer h={10} w={64} br={4} mt={6} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              background: '#FFFFFF', border: '0.5px solid #E2DED8',
              borderRadius: 8, padding: '20px 0', display: 'flex',
            }}>
              <SnapNum label="Views" value={snap.views} delta={snap.views_delta} />
              <div style={{ width: '0.5px', background: '#E2DED8', alignSelf: 'stretch' }} />
              <SnapNum label="Saves" value={snap.saves} delta={snap.saves_delta} />
              <div style={{ width: '0.5px', background: '#E2DED8', alignSelf: 'stretch' }} />
              <SnapNum label="Enquiries" value={snap.enquiries} delta={snap.enquiries_delta} />
            </div>
          )}
        </div>

        {/* ─── Tip of the Day ──────────────────────────────────────────────────
            Shown only in first 30 days. One subtle line at the bottom.
            Tap "Learn more" → goes to Tips & Features in Settings.
        ─────────────────────────────────────────────────────────────────── */}
        {todaysTip && (
          <div style={{ padding: '0 20px', marginBottom: 16 }}>
            <div style={{ height: '0.5px', background: '#E2DED8', marginBottom: 12 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300,
                letterSpacing: '0.2em', textTransform: 'uppercase', color: '#C9A84C',
              }}>✦ TIP</span>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
                color: '#888580', margin: 0, flex: 1, lineHeight: 1.4,
              }}>
                <strong style={{ color: '#555250', fontWeight: 400 }}>{todaysTip.title}</strong>
                {' — '}{todaysTip.desc.length > 55 ? todaysTip.desc.slice(0, 55) + '...' : todaysTip.desc}
              </p>
              <a href="/vendor/studio/settings" style={{
                fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#C9A84C', textDecoration: 'none', flexShrink: 0,
              }}>More →</a>
            </div>
          </div>
        )}

        {/* DreamAi Bar */}
        <div style={{ padding: '16px 20px 0' }}>
          <button
            onClick={() => openDreamAi()}
            style={{
              width: '100%', background: '#FFFFFF',
              border: '0.5px solid #E2DED8', borderRadius: 12,
              padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', touchAction: 'manipulation',
            }}
          >
            <span style={{ fontSize: 13, color: '#C9A84C' }}>✦</span>
            <span style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: '#888580', marginRight: 4,
            }}>DreamAi</span>
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13,
              fontWeight: 300, color: '#C8C4BE', fontStyle: 'italic',
            }}>Ask anything about your business...</span>
          </button>
        </div>
      </div>
    </>
  );
}
