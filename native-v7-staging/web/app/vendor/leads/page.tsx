'use client';

import React, { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ─── Session ──────────────────────────────────────────────────────────────────
interface VendorSession {
  vendorId: string;
  vendorName: string;
  category?: string;
  tier?: string;
}

function getSession(): VendorSession | null {
  if (typeof window === 'undefined') return null;
  try {
    // Check both keys — login paths are inconsistent about which one they write.
    const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExtractedLead {
  name: string | null;
  phone: string | null;
  wedding_date: string | null;
  event_type: string | null;
  budget: string | null;
  city: string | null;
}

interface Client {
  id: string;
  name?: string;
  event_type?: string;
  budget?: number;
  event_date?: string;
  status?: string;
  city?: string;
  notes?: string;
}

// ─── Shimmer ──────────────────────────────────────────────────────────────────
function Shimmer({ h, w = '100%', br = 8, mt = 0 }: { h: number; w?: string | number; br?: number; mt?: number }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: br, marginTop: mt,
      background: 'linear-gradient(90deg, rgba(248,247,245,0.06) 25%, rgba(248,247,245,0.12) 50%, rgba(248,247,245,0.06) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      willChange: 'background-position',
    }} />
  );
}

// ─── Lead Field Row ───────────────────────────────────────────────────────────
function LeadField({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline',
      justifyContent: 'space-between', gap: 12,
      padding: '12px 0',
      borderBottom: '0.5px solid #E2DED8',
    }}>
      <span style={{
        fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
        letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580',
        flexShrink: 0,
      }}>{label}</span>
      <span style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 300,
        color: value ? '#111111' : '#C8C4BE',
        textAlign: 'right',
      }}>{value || '—'}</span>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%',
      transform: 'translateX(-50%) translateZ(0)',
      background: '#111111', color: '#F8F7F5',
      fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300,
      padding: '10px 20px', borderRadius: 8, zIndex: 9999,
      whiteSpace: 'nowrap', willChange: 'opacity',
      animation: 'toastIn 200ms cubic-bezier(0.22,1,0.36,1) both',
    }}>{msg}</div>
  );
}

// ─── Booking Sheet ────────────────────────────────────────────────────────────
// Slides up when vendor taps "Book this couple →" on a lead card.
// Shows a summary of what will be created, then confirms.
// Separate component keeps the lead card logic clean.
function BookingSheet({
  client,
  onConfirm,
  onCancel,
  loading,
}: {
  client: Client;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.6)',
        }}
      />
      {/* Sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: '#FFFFFF', borderRadius: '20px 20px 0 0',
        padding: '20px 20px',
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        animation: 'slideUp 320ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E2DED8' }} />
        </div>

        <p style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
          letterSpacing: '0.25em', textTransform: 'uppercase',
          color: '#888580', margin: '0 0 4px',
        }}>BOOK THIS COUPLE</p>

        <p style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300,
          color: '#111111', margin: '0 0 20px', lineHeight: 1.15,
        }}>{client.name || 'Unknown'}</p>

        {/* Details summary */}
        <div style={{ marginBottom: 24 }}>
          {[
            { label: 'Event', value: client.event_type },
            { label: 'Date',  value: client.event_date
                ? new Date(client.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                : null },
            { label: 'Budget', value: client.budget
                ? '₹' + Number(client.budget).toLocaleString('en-IN')
                : null },
            { label: 'City',  value: client.city },
          ].map(row => row.value ? (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              padding: '10px 0', borderBottom: '0.5px solid #F0EEE8',
            }}>
              <span style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580',
              }}>{row.label}</span>
              <span style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
                color: '#111111',
              }}>{row.value}</span>
            </div>
          ) : null)}
        </div>

        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
          color: '#888580', margin: '0 0 20px', lineHeight: 1.5,
        }}>
          This will add them to your Clients with status <strong style={{ fontWeight: 400 }}>Active</strong>. You can edit details anytime.
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              flex: 1, height: 52, background: '#C9A84C', border: 'none',
              borderRadius: 100, cursor: loading ? 'default' : 'pointer',
              fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400,
              letterSpacing: '0.2em', textTransform: 'uppercase', color: '#111111',
              opacity: loading ? 0.6 : 1,
            }}
          >{loading ? 'Booking...' : 'Confirm Booking →'}</button>
          <button
            onClick={onCancel}
            style={{
              height: 52, padding: '0 20px', background: 'transparent',
              border: '0.5px solid #E2DED8', borderRadius: 100, cursor: 'pointer',
              fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300,
              letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580',
            }}
          >Cancel</button>
        </div>
      </div>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function VendorLeadsPage() {
  const [session, setSession]       = useState<VendorSession | null | undefined>(undefined);
  const [message, setMessage]       = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted]   = useState<ExtractedLead | null>(null);
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState<string | null>(null);
  const [clients, setClients]       = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  // Booking sheet — pre-filled from a lead card
  const [bookingTarget, setBookingTarget] = useState<Client | null>(null);
  const [booking, setBooking]             = useState(false);

  useEffect(() => {
    const s = getSession();
    setSession(s);
    if (!s) return;
    loadClients(s.vendorId);
  }, []);

  function loadClients(vendorId: string) {
    setLoadingClients(true);
    fetch(`${API}/api/v2/vendor/clients/${vendorId}`)
      .then(r => r.json())
      .then(json => {
        setClients(Array.isArray(json.data) ? json.data : []);
        setLoadingClients(false);
      })
      .catch(() => setLoadingClients(false));
  }

  function showToast(msg: string) {
    setToast(msg);
  }

  async function handleExtract() {
    if (!message.trim()) return;
    setExtracting(true);
    setExtracted(null);
    try {
      const res = await fetch(`${API}/api/v2/dreamai/whatsapp-extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setExtracted(json.data);
      } else {
        showToast('Could not extract lead details. Try again.');
      }
    } catch {
      showToast('Unable to reach DreamAi. Check your connection.');
    } finally {
      setExtracting(false);
    }
  }

  async function handleSave() {
    if (!extracted || !session) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/vendor-clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: session.vendorId,
          name: extracted.name || 'Unknown',
          phone: extracted.phone || null,
          event_type: extracted.event_type || null,
          event_date: extracted.wedding_date || null,
          budget: extracted.budget ? parseInt(extracted.budget.replace(/[^0-9]/g, '')) || null : null,
          notes: message.trim(),
          status: 'new',
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Lead saved.');
        setMessage('');
        setExtracted(null);
        loadClients(session.vendorId);
      } else {
        showToast('Could not save lead. Try again.');
      }
    } catch {
      showToast('Could not save lead. Try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    setMessage('');
    setExtracted(null);
  }

  // Book this couple → converts a lead into a full client record and marks lead converted.
  async function bookClient(client: Client) {
    if (!session || booking) return;
    setBooking(true);
    try {
      const res = await fetch(`${API}/api/v2/vendor/leads/${client.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: session.vendorId }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'Booked ✓ Added to Clients');
        setBookingTarget(null);
        loadClients(session.vendorId);
      } else {
        showToast(json.error || 'Could not book couple. Try again.');
      }
    } catch {
      showToast('Could not book couple. Check connection.');
    } finally {
      setBooking(false);
    }
  }

  if (session === undefined) return null;
  if (!session) {
    if (typeof window !== 'undefined') window.location.replace('/vendor/login');
    return null;
  }

  const filters = ['all', 'new', 'active', 'done'];
  const filtered = activeFilter === 'all'
    ? clients
    : clients.filter(c => c.status === activeFilter);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #0C0A09; }
        ::-webkit-scrollbar { display: none; }
        @keyframes shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px) translateZ(0); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) translateZ(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px) translateZ(0); }
          to   { opacity: 1; transform: translateY(0) translateZ(0); }
        }
        .page-enter { animation: fadeIn 320ms cubic-bezier(0.22,1,0.36,1) both; }
        textarea::placeholder { color: rgba(248,247,245,0.25); }
        textarea { resize: none; }
      `}</style>

      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Booking confirmation sheet */}
      {bookingTarget && (
        <BookingSheet
          client={bookingTarget}
          onConfirm={() => bookClient(bookingTarget)}
          onCancel={() => setBookingTarget(null)}
          loading={booking}
        />
      )}

      <div style={{
        minHeight: '100dvh', background: '#0C0A09',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom))',
      }}>

        {/* Top bar */}
        <div style={{
          padding: '24px 20px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 32,
        }}>
          <p style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            color: 'rgba(248,247,245,0.4)', margin: 0,
          }}>THE DREAM WEDDING</p>
        </div>

        <div className="page-enter" style={{ padding: '0 20px' }}>

          {/* Header */}
          <p style={{
            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'rgba(248,247,245,0.4)', margin: '0 0 8px',
          }}>LEADS</p>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 32,
            fontWeight: 300, color: '#F8F7F5', margin: '0 0 8px', lineHeight: 1.15,
          }}>WhatsApp Leads</h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
            color: 'rgba(248,247,245,0.5)', margin: '0 0 32px', lineHeight: 1.5,
          }}>Paste a WhatsApp message. DreamAi extracts the details.</p>

          {/* Paste area */}
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Paste WhatsApp message here..."
            rows={6}
            style={{
              width: '100%', background: 'rgba(248,247,245,0.05)',
              border: '0.5px solid rgba(248,247,245,0.15)',
              borderRadius: 16, padding: 16,
              fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 300,
              color: '#F8F7F5', outline: 'none',
              touchAction: 'manipulation',
            }}
          />

          {/* Extract CTA */}
          <button
            onClick={handleExtract}
            disabled={extracting || !message.trim()}
            style={{
              width: '100%', height: 56,
              background: message.trim() ? '#C9A84C' : 'rgba(201,168,76,0.3)',
              border: 'none', borderRadius: 16, marginTop: 12,
              fontFamily: "'Jost', sans-serif", fontSize: 11, fontWeight: 400,
              letterSpacing: '0.2em', textTransform: 'uppercase',
              color: message.trim() ? '#111111' : 'rgba(17,17,17,0.4)',
              cursor: message.trim() ? 'pointer' : 'default',
              touchAction: 'manipulation',
              transition: 'background 200ms cubic-bezier(0.22,1,0.36,1)',
              willChange: 'transform',
            }}
          >
            {extracting ? 'Extracting...' : 'Extract Lead'}
          </button>

          {/* Extracting shimmer */}
          {extracting && (
            <div style={{ marginTop: 20 }}>
              <Shimmer h={48} br={8} />
              <Shimmer h={48} br={8} mt={2} />
              <Shimmer h={48} br={8} mt={2} />
            </div>
          )}

          {/* Extracted lead card */}
          {extracted && !extracting && (
            <div style={{
              marginTop: 20,
              background: '#FFFFFF', borderRadius: 16, padding: 20,
              animation: 'fadeIn 280ms cubic-bezier(0.22,1,0.36,1) both',
            }}>
              <p style={{
                fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                letterSpacing: '0.2em', textTransform: 'uppercase',
                color: '#888580', margin: '0 0 4px',
              }}>EXTRACTED LEAD</p>
              <LeadField label="Name" value={extracted.name} />
              <LeadField label="Phone" value={extracted.phone} />
              <LeadField label="Wedding Date" value={extracted.wedding_date} />
              <LeadField label="Event Type" value={extracted.event_type} />
              <LeadField label="Budget" value={extracted.budget} />
              <LeadField label="City" value={extracted.city} />

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1, height: 48,
                    background: '#C9A84C', border: 'none', borderRadius: 12,
                    fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: '#111111', cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                    touchAction: 'manipulation',
                  }}
                >{saving ? 'Saving...' : 'Save as Lead'}</button>
                <button
                  onClick={handleClear}
                  style={{
                    flex: 1, height: 48,
                    background: 'none',
                    border: '0.5px solid #E2DED8', borderRadius: 12,
                    fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: '#888580', cursor: 'pointer',
                    touchAction: 'manipulation',
                  }}
                >Clear</button>
              </div>
            </div>
          )}

          {/* Leads list */}
          <div style={{ marginTop: 40 }}>
            <p style={{
              fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
              letterSpacing: '0.25em', textTransform: 'uppercase',
              color: 'rgba(248,247,245,0.4)', margin: '0 0 16px',
            }}>YOUR LEADS</p>

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    flexShrink: 0,
                    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                    letterSpacing: '0.15em', textTransform: 'uppercase',
                    padding: '5px 12px', borderRadius: 100,
                    border: activeFilter === f ? 'none' : '0.5px solid rgba(248,247,245,0.15)',
                    background: activeFilter === f ? '#F8F7F5' : 'transparent',
                    color: activeFilter === f ? '#111111' : 'rgba(248,247,245,0.5)',
                    cursor: 'pointer', touchAction: 'manipulation',
                  }}
                >{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
              ))}
            </div>

            {/* List */}
            {loadingClients ? (
              <div>
                <Shimmer h={72} br={8} />
                <Shimmer h={72} br={8} mt={2} />
                <Shimmer h={72} br={8} mt={2} />
              </div>
            ) : filtered.length === 0 ? (
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
                fontStyle: 'italic', color: 'rgba(248,247,245,0.3)',
                textAlign: 'center', marginTop: 40,
              }}>No leads yet.</p>
            ) : (
              filtered.map((client, i) => (
                <div key={client.id}>
                  <button
                    onClick={() => setExpandedId(expandedId === client.id ? null : client.id)}
                    style={{
                      width: '100%', textAlign: 'left',
                      background: 'rgba(248,247,245,0.04)',
                      border: '0.5px solid rgba(248,247,245,0.1)',
                      borderRadius: 10, padding: '14px 16px',
                      marginBottom: 2, cursor: 'pointer',
                      touchAction: 'manipulation',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontFamily: "'Cormorant Garamond', serif", fontSize: 17,
                        fontWeight: 300, color: '#F8F7F5', margin: '0 0 4px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>{client.name || 'Unknown'}</p>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {client.event_type && (
                          <span style={{
                            fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                            letterSpacing: '0.15em', textTransform: 'uppercase',
                            color: 'rgba(248,247,245,0.4)',
                          }}>{client.event_type}</span>
                        )}
                        {client.budget && (
                          <span style={{
                            fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                            fontWeight: 300, color: '#C9A84C',
                          }}>₹{Number(client.budget).toLocaleString('en-IN')}</span>
                        )}
                      </div>
                    </div>
                    {client.status && (
                      <span style={{
                        fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300,
                        letterSpacing: '0.15em', textTransform: 'uppercase',
                        padding: '4px 10px', borderRadius: 100, flexShrink: 0,
                        background: client.status === 'new' ? 'rgba(201,168,76,0.15)' : 'rgba(248,247,245,0.08)',
                        color: client.status === 'new' ? '#C9A84C' : 'rgba(248,247,245,0.4)',
                      }}>{client.status}</span>
                    )}
                  </button>

                  {/* Expanded detail */}
                  {expandedId === client.id && (
                    <div style={{
                      background: 'rgba(248,247,245,0.06)',
                      border: '0.5px solid rgba(248,247,245,0.1)',
                      borderTop: 'none', borderRadius: '0 0 10px 10px',
                      padding: '12px 16px', marginBottom: 2,
                      animation: 'fadeIn 200ms cubic-bezier(0.22,1,0.36,1) both',
                    }}>
                      {client.event_date && (
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(248,247,245,0.5)', margin: '0 0 6px' }}>
                          📅 {new Date(client.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                      {client.city && (
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(248,247,245,0.5)', margin: '0 0 6px' }}>
                          📍 {client.city}
                        </p>
                      )}
                      {client.notes && (
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(248,247,245,0.4)', margin: '6px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>
                          "{client.notes}"
                        </p>
                      )}

                      {/* Book this couple — converts lead to client */}
                      <button
                        onClick={() => setBookingTarget(client)}
                        style={{
                          marginTop: 14, width: '100%', height: 40,
                          background: '#C9A84C', border: 'none', borderRadius: 100,
                          cursor: 'pointer', touchAction: 'manipulation',
                          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 400,
                          letterSpacing: '0.2em', textTransform: 'uppercase', color: '#111111',
                        }}
                      >Book this couple →</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
