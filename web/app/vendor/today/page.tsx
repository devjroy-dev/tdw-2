'use client';

import React, { useEffect, useState } from 'react';

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
      background: '#FFFFFF',
      border: '0.5px solid #E2DED8',
      borderRadius: 8,
      padding: 16,
      marginBottom: 10,
      willChange: 'transform',
      touchAction: 'manipulation',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 17,
          fontWeight: 300,
          color: '#111111',
          margin: 0,
          flex: 1,
          paddingRight: 12,
          lineHeight: 1.3,
        }}>{item.title}</p>
        {isOverdue && item.amount && (
          <span style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 12,
            fontWeight: 400,
            color: '#C9A84C',
          }}>{fmtINR(item.amount)}</span>
        )}
      </div>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: 300,
        color: '#888580',
        margin: '0 0 12px',
        lineHeight: 1.4,
      }}>{item.subtitle}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {isOverdue && (
          <span style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 9,
            fontWeight: 400,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: '#C9A84C',
            background: 'rgba(201,168,76,0.08)',
            padding: '3px 8px',
            borderRadius: 100,
          }}>OVERDUE</span>
        )}
        <button style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: 9,
          fontWeight: 400,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: '#555250',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
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
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 32,
        fontWeight: 300,
        color: '#111111',
        margin: '0 0 2px',
        lineHeight: 1,
      }}>{value}</p>
      <p style={{
        fontFamily: "'Jost', sans-serif",
        fontSize: 9,
        fontWeight: 300,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: '#888580',
        margin: '0 0 4px',
      }}>{label}</p>
      <p style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 11,
        fontWeight: 300,
        color: '#888580',
        margin: 0,
      }}>{deltaLabel(delta)}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VendorTodayPage() {
  const [session, setSession] = useState<VendorSession | null | undefined>(undefined);
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getSession();
    setSession(s);
    if (!s) return;

    fetch(`${API}/api/v2/vendor/today/${s.vendorId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Guard
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

  return (
    <>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{
        background: '#F8F7F5',
        minHeight: '100dvh',
        paddingTop: 24,
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom) + 24px)',
        overflowX: 'hidden',
      }}>
        {/* Top bar */}
        <div style={{
          padding: '0 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
        }}>
          <p style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 9,
            fontWeight: 200,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: '#888580',
            margin: 0,
          }}>THE DREAM WEDDING</p>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#111111',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 11,
              fontWeight: 300,
              color: '#F8F7F5',
            }}>{nameInitials}</span>
          </div>
        </div>

        {/* Hero */}
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 32,
            fontWeight: 300,
            color: '#111111',
            margin: '0 0 6px',
            lineHeight: 1.15,
          }}>{getGreeting()}, {firstName}.</h1>
          {loading ? (
            <Shimmer h={14} w={180} br={4} />
          ) : (
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: 300,
              color: '#888580',
              margin: 0,
            }}>{attentionCount(attention.length)}</p>
          )}
        </div>

        {/* Section 1 — Needs Attention */}
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <p style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 9,
            fontWeight: 300,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: '#888580',
            margin: '0 0 14px',
          }}>NEEDS YOUR ATTENTION</p>

          {loading ? (
            <>
              <Shimmer h={90} br={8} />
              <Shimmer h={90} br={8} mt={10} />
              <Shimmer h={90} br={8} mt={10} />
            </>
          ) : attention.length === 0 ? (
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#888580',
              margin: 0,
            }}>All clear for now.</p>
          ) : (
            attention.slice(0, 3).map(item => (
              <AttentionCard key={item.id} item={item} />
            ))
          )}
        </div>

        {/* Section 2 — Today's Schedule */}
        <div style={{ padding: '0 20px', marginBottom: 32 }}>
          <p style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 9,
            fontWeight: 300,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: '#888580',
            margin: '0 0 14px',
          }}>TODAY'S SCHEDULE</p>

          {loading ? (
            <>
              <Shimmer h={48} br={4} />
              <Shimmer h={48} br={4} mt={2} />
            </>
          ) : schedule.length === 0 ? (
            <p style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              fontWeight: 300,
              fontStyle: 'italic',
              color: '#888580',
              margin: 0,
            }}>Nothing scheduled today.</p>
          ) : (
            schedule.map((item, i) => (
              <div key={item.id} style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 16,
                padding: '12px 0',
                borderBottom: i < schedule.length - 1 ? '0.5px solid #E2DED8' : 'none',
              }}>
                <span style={{
                  fontFamily: "'Jost', sans-serif",
                  fontSize: 11,
                  fontWeight: 300,
                  color: '#888580',
                  flexShrink: 0,
                  minWidth: 44,
                }}>{item.time}</span>
                <div style={{ flex: 1 }}>
                  <p style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 17,
                    fontWeight: 300,
                    color: '#111111',
                    margin: '0 0 2px',
                  }}>{item.event_name}</p>
                  {item.client_name && (
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      fontWeight: 300,
                      color: '#888580',
                      margin: 0,
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
              fontFamily: "'Jost', sans-serif",
              fontSize: 9,
              fontWeight: 300,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#888580',
              margin: '0 0 10px',
            }}>THIS WEEK</p>
            {loading ? (
              <Shimmer h={16} w="75%" br={4} />
            ) : (
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 300,
                color: '#555250',
                margin: 0,
                lineHeight: 1.5,
              }}>{summary}</p>
            )}
          </div>
        )}

        {/* Section 4 — Discovery Snapshot */}
        <div style={{ padding: '0 20px', marginBottom: 16 }}>
          <p style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 9,
            fontWeight: 300,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: '#888580',
            margin: '0 0 14px',
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
              background: '#FFFFFF',
              border: '0.5px solid #E2DED8',
              borderRadius: 8,
              padding: '20px 0',
              display: 'flex',
            }}>
              <SnapNum label="Views" value={snap.views} delta={snap.views_delta} />
              <div style={{ width: '0.5px', background: '#E2DED8', alignSelf: 'stretch' }} />
              <SnapNum label="Saves" value={snap.saves} delta={snap.saves_delta} />
              <div style={{ width: '0.5px', background: '#E2DED8', alignSelf: 'stretch' }} />
              <SnapNum label="Enquiries" value={snap.enquiries} delta={snap.enquiries_delta} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
