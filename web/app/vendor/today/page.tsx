'use client';

import React, { useEffect, useState, useRef } from 'react';

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
    const raw = localStorage.getItem('vendor_web_session');
    return raw ? JSON.parse(raw) : null;
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

  const QUICK_CHIPS = [
    "Who owes me money?",
    "Any conflicts next month?",
    "Draft a reply to my latest enquiry",
  ];

  useEffect(() => {
    if (visible && prefill) setInput(prefill);
  }, [visible, prefill]);

  useEffect(() => {
    if (visible) setTimeout(() => inputRef.current?.focus(), 400);
  }, [visible]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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
        body: JSON.stringify({ userId: vendorId, userType: 'vendor', message: msg, context }),
      });
      const json = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: json.reply || 'Something went wrong. Please try again.' }]);
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

        {/* Quick chips */}
        {messages.length === 0 && (
          <div style={{
            display: 'flex', gap: 8, padding: '12px 20px',
            overflowX: 'auto', scrollbarWidth: 'none',
          }}>
            {QUICK_CHIPS.map(chip => (
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
            <div key={i} style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 12,
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
                }}>{m.text}</p>
              </div>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VendorTodayPage() {
  const [session, setSession]         = useState<VendorSession | null | undefined>(undefined);
  const [data, setData]               = useState<TodayData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [dreamAiOpen, setDreamAiOpen] = useState(false);
  const [dreamAiPrefill, setDreamAiPrefill] = useState('');
  const [dreamAiContext, setDreamAiContext] = useState<DreamAiContext | null>(null);
  const [nudge, setNudge]             = useState<{ text: string; query: string } | null>(null);

  useEffect(() => {
    const s = getSession();
    setSession(s);
    if (!s) return;

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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

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
        {/* Top bar */}
        <div style={{
          padding: '0 20px', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', marginBottom: 32,
        }}>
          <p style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
            letterSpacing: '0.25em', textTransform: 'uppercase', color: '#888580', margin: 0,
          }}>THE DREAM WEDDING</p>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#111111', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{
              fontFamily: "'Jost', sans-serif", fontSize: 11,
              fontWeight: 300, color: '#F8F7F5',
            }}>{nameInitials}</span>
          </div>
        </div>

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
