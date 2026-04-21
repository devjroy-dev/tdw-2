'use client';

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ─── Session ──────────────────────────────────────────────────────────────────
interface VendorSession {
  vendorId: string;
  vendorName: string;
}

function getSession(): VendorSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('vendor_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Client {
  id: string;
  name: string;
  event_type?: string;
  event_date?: string;
  budget?: number;
  status?: string;
  notes?: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function fmtDate(d?: string) {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtINR(n?: number) {
  if (!n) return '—';
  return '₹' + n.toLocaleString('en-IN');
}

// ─── Client Row ───────────────────────────────────────────────────────────────
function ClientRow({ client, isLast }: { client: Client; isLast: boolean }) {
  return (
    <div
      onClick={() => window.location.href = `/vendor/clients/${client.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 0',
        borderBottom: isLast ? 'none' : '0.5px solid #E2DED8',
        cursor: 'pointer',
        touchAction: 'manipulation',
        willChange: 'transform',
      }}
    >
      {/* Initials circle */}
      <div style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        background: '#F8F7F5',
        border: '0.5px solid #E2DED8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: 12,
          fontWeight: 300,
          color: '#111111',
        }}>{initials(client.name)}</span>
      </div>

      {/* Center */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 14,
          fontWeight: 400,
          color: '#111111',
          margin: '0 0 3px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{client.name}</p>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12,
          fontWeight: 300,
          color: '#888580',
          margin: 0,
        }}>
          {[client.event_type, fmtDate(client.event_date)].filter(Boolean).join(' · ') || '—'}
        </p>
      </div>

      {/* Right */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 16,
          fontWeight: 300,
          color: '#111111',
          margin: '0 0 2px',
        }}>{fmtINR(client.budget)}</p>
        {client.status && (
          <p style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 9,
            fontWeight: 300,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: '#888580',
            margin: 0,
          }}>{client.status}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VendorClientsPage() {
  const [session, setSession] = useState<VendorSession | null | undefined>(undefined);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const s = getSession();
    setSession(s);
    if (!s) return;

    fetch(`${API}/api/v2/vendor/clients/${s.vendorId}`)
      .then(r => r.json())
      .then(d => {
        setClients(Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (session === undefined) return null;
  if (!session) {
    if (typeof window !== 'undefined') window.location.replace('/vendor/login');
    return null;
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

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
      }}>
        <div style={{ padding: '0 20px' }}>

          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <p style={{
              fontFamily: "'Jost', sans-serif",
              fontSize: 9,
              fontWeight: 300,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: '#888580',
              margin: '0 0 6px',
            }}>YOUR CLIENTS</p>
            <h1 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 28,
              fontWeight: 300,
              color: '#111111',
              margin: 0,
              lineHeight: 1.1,
            }}>Clients</h1>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <Search
              size={15}
              color="#888580"
              strokeWidth={1.5}
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients..."
              style={{
                width: '100%',
                height: 40,
                background: 'transparent',
                border: 'none',
                borderBottom: '0.5px solid #E2DED8',
                borderRadius: 0,
                paddingLeft: 24,
                paddingRight: 0,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 300,
                color: '#111111',
                outline: 'none',
              }}
            />
          </div>

          {/* List */}
          {loading ? (
            <div>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: '0.5px solid #E2DED8' }}>
                  <Shimmer h={40} w={40} br={50} />
                  <div style={{ flex: 1 }}>
                    <Shimmer h={14} w="60%" br={4} />
                    <Shimmer h={12} w="40%" br={4} mt={6} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Shimmer h={16} w={60} br={4} />
                    <Shimmer h={10} w={40} br={4} mt={6} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', marginTop: 80 }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 20,
                fontWeight: 300,
                fontStyle: 'italic',
                color: '#888580',
                margin: 0,
              }}>
                {search ? 'No clients match that search.' : 'Your first client is one enquiry away.'}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((c, i) => (
                <ClientRow key={c.id} client={c} isLast={i === filtered.length - 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
