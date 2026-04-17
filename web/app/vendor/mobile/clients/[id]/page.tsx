'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Phone, MessageCircle, FileText, CreditCard,
  Briefcase, Calendar, User as UserIcon, Mail, MapPin,
  CheckCircle, AlertCircle, Plus, Edit2, Clock, DollarSign,
} from 'react-feather';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ── Brand tokens (match /vendor/mobile) ─────────────────────────────────

const C = {
  cream: '#FAF6F0',
  ivory: '#FFFFFF',
  pearl: '#FBF8F2',
  champagne: '#FFFDF7',
  goldSoft: '#FFF8EC',
  goldMist: '#FFF3DB',
  goldBorder: '#E8D9B5',
  border: '#EDE8E0',
  borderSoft: '#F2EDE4',
  dark: '#2C2420',
  gold: '#C9A84C',
  goldDeep: '#B8963A',
  muted: '#8C7B6E',
  light: '#B8ADA4',
  green: '#4CAF50',
  greenSoft: 'rgba(76,175,80,0.08)',
  red: '#E57373',
  redSoft: 'rgba(229,115,115,0.06)',
  redBorder: 'rgba(229,115,115,0.22)',
};

function fmtINR(n: number): string {
  if (!n && n !== 0) return '0';
  return n.toLocaleString('en-IN');
}

function fmtDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function fmtDateShort(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

function getSession() {
  if (typeof window === 'undefined') return null;
  try { const s = localStorage.getItem('vendor_web_session'); return s ? JSON.parse(s) : null; } catch { return null; }
}

// ══════════════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════════════

type TabKey = 'overview' | 'invoices' | 'payments' | 'contracts' | 'notes';

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>();
  const clientId = params?.id || '';

  const [session, setSession] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [paymentSchedules, setPaymentSchedules] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');

  // Note editing
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [savedNoteAt, setSavedNoteAt] = useState<number | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s?.vendorId) { window.location.href = '/vendor/mobile/login'; return; }
    setSession(s);

    if (!clientId) { setLoading(false); return; }

    (async () => {
      try {
        const [clientRes, invoicesRes, bookingsRes, schedRes, contractsRes] = await Promise.all([
          fetch(`${API}/api/vendor-clients/by-id/${clientId}`).then(r => r.json()).catch(() => null),
          fetch(`${API}/api/invoices/${s.vendorId}`).then(r => r.json()).catch(() => ({ data: [] })),
          fetch(`${API}/api/bookings/${s.vendorId}`).then(r => r.json()).catch(() => ({ data: [] })),
          fetch(`${API}/api/payment-schedules/${s.vendorId}`).then(r => r.json()).catch(() => ({ data: [] })),
          fetch(`${API}/api/contracts/${s.vendorId}`).then(r => r.json()).catch(() => ({ data: [] })),
        ]);

        if (clientRes?.success && clientRes.data) {
          setClient(clientRes.data);
          setNoteDraft(clientRes.data.notes || '');
        }

        const cname = clientRes?.data?.name || '';
        const cphone = clientRes?.data?.phone || '';

        // Filter invoices by client_id OR client name + phone
        const allInvoices = invoicesRes?.data || [];
        setInvoices(allInvoices.filter((i: any) =>
          i.client_id === clientId ||
          (i.client_name === cname && i.client_phone === cphone)
        ));

        // Filter bookings similarly
        const allBookings = bookingsRes?.data || [];
        setBookings(allBookings.filter((b: any) =>
          (b.couple_name || b.client_name) === cname ||
          b.client_phone === cphone
        ));

        // Payment schedules
        const allScheds = schedRes?.data || [];
        setPaymentSchedules(allScheds.filter((s: any) =>
          s.client_id === clientId || s.client_name === cname
        ));

        // Contracts
        const allContracts = contractsRes?.data || [];
        setContracts(allContracts.filter((c: any) =>
          c.client_id === clientId || c.client_name === cname
        ));
      } catch (err) {
        // Silent
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  const handleSaveNote = async () => {
    if (!clientId || noteDraft === (client?.notes || '')) return;
    setSavingNote(true);
    try {
      const r = await fetch(`${API}/api/vendor-clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteDraft }),
      });
      const d = await r.json();
      if (d.success) {
        setClient({ ...client, notes: noteDraft });
        setSavedNoteAt(Date.now());
        setTimeout(() => setSavedNoteAt(null), 2000);
      }
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh', background: C.cream,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'DM Sans, sans-serif', color: C.muted, fontSize: '13px',
      }}>Loading client…</div>
    );
  }

  if (!client) {
    return (
      <div style={{
        minHeight: '100dvh', background: C.cream,
        fontFamily: 'DM Sans, sans-serif', padding: '40px 20px',
        maxWidth: '480px', margin: '0 auto',
      }}>
        <button
          onClick={() => { window.location.href = '/vendor/mobile'; }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '20px', color: C.gold, fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ textAlign: 'center', padding: '40px 20px', background: C.ivory, borderRadius: '14px', border: `1px solid ${C.border}` }}>
          <UserIcon size={32} color={C.light} style={{ marginBottom: '12px' }} />
          <div style={{ fontSize: '15px', color: C.dark, fontWeight: 500 }}>Client not found</div>
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px' }}>This client may have been deleted or the link is invalid.</div>
        </div>
      </div>
    );
  }

  // ── Computed ───────────────────────────────────────────────────────────
  const totalBilled = invoices.reduce((s, i) => s + (parseInt(i.amount) || 0), 0);
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (parseInt(i.amount) || 0), 0);
  const totalOwed = totalBilled - totalPaid;
  const unpaidCount = invoices.filter(i => i.status !== 'paid').length;
  const upcomingBookings = bookings.filter((b: any) => b.event_date && new Date(b.event_date) >= new Date()).sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime());
  const pastBookings = bookings.filter((b: any) => b.event_date && new Date(b.event_date) < new Date()).sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

  const clientPhoneNorm = (client.phone || '').replace(/\D/g, '');
  const hasWhatsApp = clientPhoneNorm.length >= 10;
  const waLink = (text: string) => `https://wa.me/91${clientPhoneNorm.slice(-10)}?text=${encodeURIComponent(text)}`;

  const initials = (client.name || '?').split(/\s+/).slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join('');

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100dvh',
      background: C.cream,
      fontFamily: 'DM Sans, sans-serif',
      color: C.dark,
      paddingBottom: 'calc(40px + env(safe-area-inset-bottom))',
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      {/* ── Header ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: C.cream, padding: '16px 18px 12px',
        borderBottom: `1px solid ${C.borderSoft}`,
        display: 'flex', alignItems: 'center', gap: '12px',
      }}>
        <button
          onClick={() => { window.history.length > 1 ? window.history.back() : (window.location.href = '/vendor/mobile'); }}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center' }}
          aria-label="Back"
        ><ArrowLeft size={20} color={C.dark} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '20px', color: C.dark, fontWeight: 400,
            letterSpacing: '0.2px', lineHeight: 1,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{client.name || 'Client'}</div>
          <div style={{
            fontSize: '10px', color: C.muted, marginTop: '4px',
            fontWeight: 500, letterSpacing: '1.2px', textTransform: 'uppercase',
          }}>{client.event_type || 'Client'}{client.event_date ? ` · ${fmtDateShort(client.event_date)}` : ''}</div>
        </div>
      </div>

      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* ── Hero card ── */}
        <div style={{
          background: C.ivory,
          borderRadius: '18px',
          border: `1px solid ${C.goldBorder}`,
          padding: '20px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: `linear-gradient(90deg, transparent 0%, ${C.gold} 50%, transparent 100%)`,
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Playfair Display', serif",
              fontSize: '20px', color: C.goldDeep, fontWeight: 400,
              flexShrink: 0,
            }}>{initials || '?'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {client.phone && (
                <div style={{ fontSize: '12px', color: C.muted, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={11} /> {client.phone}
                </div>
              )}
              {client.email && (
                <div style={{ fontSize: '12px', color: C.muted, display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Mail size={11} /> {client.email}
                </div>
              )}
              {client.venue && (
                <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MapPin size={11} /> {client.venue}
                </div>
              )}
            </div>
          </div>

          {/* Quick contact actions */}
          {client.phone && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <a href={`tel:${client.phone}`} style={{
                flex: 1, background: C.goldSoft, color: C.goldDeep,
                border: `1px solid ${C.goldBorder}`, borderRadius: '10px',
                padding: '10px', textDecoration: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase',
              }}><Phone size={12} /> Call</a>
              {hasWhatsApp && (
                <a
                  href={waLink(`Hi ${client.name || 'there'}, hope you're doing well.`)}
                  target="_blank" rel="noreferrer"
                  style={{
                    flex: 1, background: '#25D366', color: C.ivory,
                    border: 'none', borderRadius: '10px',
                    padding: '10px', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase',
                  }}><MessageCircle size={12} /> Message</a>
              )}
            </div>
          )}
        </div>

        {/* ── At a glance stats (only if any data) ── */}
        {(totalBilled > 0 || bookings.length > 0) && (
          <div style={{
            background: C.ivory,
            borderRadius: '14px',
            border: `1px solid ${C.border}`,
            padding: '16px',
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px',
          }}>
            <div>
              <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 600 }}>Events</div>
              <div style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: C.dark, marginTop: '2px' }}>{bookings.length}</div>
            </div>
            <div>
              <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 600 }}>Billed</div>
              <div style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: C.dark, marginTop: '2px' }}>₹{fmtINR(totalBilled)}</div>
            </div>
            <div>
              <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 600 }}>Owed</div>
              <div style={{ fontSize: '18px', fontFamily: "'Playfair Display', serif", color: totalOwed > 0 ? C.red : C.green, marginTop: '2px' }}>₹{fmtINR(totalOwed)}</div>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex', gap: '6px',
          borderBottom: `1px solid ${C.borderSoft}`,
          paddingBottom: '2px', overflowX: 'auto',
        }}>
          {([
            { k: 'overview', label: 'Overview' },
            { k: 'invoices', label: `Invoices${invoices.length ? ` (${invoices.length})` : ''}` },
            { k: 'payments', label: 'Payments' },
            { k: 'contracts', label: 'Contracts' },
            { k: 'notes', label: 'Notes' },
          ] as const).map(t => {
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k as TabKey)}
                style={{
                  background: 'transparent', border: 'none',
                  padding: '10px 2px', marginRight: '8px',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px', fontWeight: 600,
                  letterSpacing: '1.2px', textTransform: 'uppercase',
                  color: active ? C.goldDeep : C.muted,
                  borderBottom: `2px solid ${active ? C.gold : 'transparent'}`,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >{t.label}</button>
            );
          })}
        </div>

        {/* ── Tab content ── */}
        {tab === 'overview' && (
          <OverviewPanel
            client={client}
            upcoming={upcomingBookings}
            past={pastBookings}
            invoices={invoices}
            waLink={waLink}
            hasWhatsApp={hasWhatsApp}
            onJumpTab={setTab}
          />
        )}
        {tab === 'invoices' && (
          <InvoicesPanel
            invoices={invoices}
            client={client}
            session={session}
            waLink={waLink}
            hasWhatsApp={hasWhatsApp}
          />
        )}
        {tab === 'payments' && (
          <PaymentsPanel
            schedules={paymentSchedules}
            client={client}
            waLink={waLink}
            hasWhatsApp={hasWhatsApp}
          />
        )}
        {tab === 'contracts' && (
          <ContractsPanel
            contracts={contracts}
            client={client}
            waLink={waLink}
            hasWhatsApp={hasWhatsApp}
          />
        )}
        {tab === 'notes' && (
          <NotesPanel
            value={noteDraft}
            onChange={setNoteDraft}
            onSave={handleSaveNote}
            saving={savingNote}
            savedAt={savedNoteAt}
          />
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// OVERVIEW PANEL
// ══════════════════════════════════════════════════════════════════════════

function OverviewPanel({ client, upcoming, past, invoices, waLink, hasWhatsApp, onJumpTab }: any) {
  const nextEvent = upcoming[0];

  return (
    <>
      {/* Next event */}
      {nextEvent && (
        <div style={{
          background: C.champagne,
          border: `1px solid ${C.goldBorder}`,
          borderRadius: '16px',
          padding: '18px',
        }}>
          <div style={{ fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', color: C.goldDeep, fontWeight: 600, marginBottom: '8px' }}>Next Event</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '18px', color: C.dark }}>
            {nextEvent.event_type || 'Event'}
          </div>
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '4px' }}>
            {fmtDate(nextEvent.event_date)}
            {nextEvent.venue ? ` · ${nextEvent.venue}` : ''}
          </div>
        </div>
      )}

      {/* Upcoming events */}
      {upcoming.length > 0 && (
        <div>
          <SectionLabel>Upcoming · {upcoming.length}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {upcoming.slice(0, 3).map((ev: any) => (
              <div key={ev.id} style={{
                background: C.ivory,
                border: `1px solid ${C.border}`,
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '10px',
                  background: C.goldSoft, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{ fontSize: '15px', fontFamily: "'Playfair Display', serif", color: C.goldDeep, lineHeight: 1 }}>
                    {new Date(ev.event_date).getDate()}
                  </div>
                  <div style={{ fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: C.muted, marginTop: '2px' }}>
                    {new Date(ev.event_date).toLocaleDateString('en-IN', { month: 'short' })}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: C.dark, fontWeight: 500 }}>
                    {ev.event_type || ev.couple_name || 'Event'}
                  </div>
                  {ev.venue && (
                    <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{ev.venue}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent invoices */}
      {invoices.length > 0 && (
        <div>
          <SectionLabel>Recent Invoices</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {invoices.slice(0, 3).map((inv: any) => (
              <div key={inv.id} style={{
                background: C.ivory,
                border: `1px solid ${C.border}`,
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', color: C.dark, fontWeight: 500 }}>{inv.invoice_number || 'Invoice'}</div>
                  <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{fmtDateShort(inv.issue_date || inv.created_at)}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: C.dark }}>₹{fmtINR(parseInt(inv.amount) || 0)}</div>
                  <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '50px', background: inv.status === 'paid' ? C.greenSoft : C.goldSoft, color: inv.status === 'paid' ? C.green : C.goldDeep, border: `1px solid ${inv.status === 'paid' ? C.green + '40' : C.goldBorder}`, marginTop: '4px', display: 'inline-block' }}>
                    {inv.status || 'unpaid'}
                  </span>
                </div>
              </div>
            ))}
            {invoices.length > 3 && (
              <button onClick={() => onJumpTab('invoices')} style={{
                background: 'transparent', border: 'none',
                color: C.goldDeep, fontSize: '11px', fontWeight: 600,
                letterSpacing: '1.5px', textTransform: 'uppercase',
                cursor: 'pointer', padding: '10px', fontFamily: 'inherit',
              }}>View all {invoices.length} invoices</button>
            )}
          </div>
        </div>
      )}

      {/* Past events */}
      {past.length > 0 && (
        <div>
          <SectionLabel>Past · {past.length}</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {past.slice(0, 5).map((ev: any) => (
              <div key={ev.id} style={{
                background: C.pearl,
                border: `1px solid ${C.borderSoft}`,
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '12px', color: C.muted,
                display: 'flex', justifyContent: 'space-between', gap: '10px',
              }}>
                <span>{ev.event_type || 'Event'}</span>
                <span>{fmtDateShort(ev.event_date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty fallback */}
      {upcoming.length === 0 && past.length === 0 && invoices.length === 0 && (
        <div style={{
          background: C.pearl,
          borderRadius: '14px',
          padding: '32px 20px',
          textAlign: 'center',
          border: `1px dashed ${C.borderSoft}`,
        }}>
          <Calendar size={28} color={C.light} />
          <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500, marginTop: '12px' }}>Nothing yet</div>
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px', lineHeight: 1.5 }}>
            Send an invoice, block their event date, or message them to get started.
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// INVOICES PANEL
// ══════════════════════════════════════════════════════════════════════════

function InvoicesPanel({ invoices, client, session, waLink, hasWhatsApp }: any) {
  if (invoices.length === 0) {
    return (
      <div style={{
        background: C.pearl,
        border: `1px dashed ${C.borderSoft}`,
        borderRadius: '14px',
        padding: '32px 20px',
        textAlign: 'center',
      }}>
        <FileText size={28} color={C.light} />
        <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500, marginTop: '12px' }}>No invoices yet</div>
        <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px', lineHeight: 1.5 }}>
          Use Quick Actions → Invoice on Home to create one.
        </div>
      </div>
    );
  }

  const vendorName = session?.vendorName || 'our studio';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {invoices.map((inv: any) => {
        const msg = `Hi ${client.name || 'there'}, sharing your invoice from ${vendorName} — ${inv.invoice_number || 'Invoice'} for ₹${fmtINR(parseInt(inv.amount) || 0)}${inv.status === 'paid' ? ' (paid)' : ''}. Let me know if you have any questions.`;
        return (
          <div key={inv.id} style={{
            background: C.ivory,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            padding: '14px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', color: C.dark, fontWeight: 500 }}>{inv.invoice_number || 'Invoice'}</div>
              <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>{fmtDateShort(inv.issue_date || inv.created_at)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: C.dark }}>₹{fmtINR(parseInt(inv.amount) || 0)}</span>
                <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '2px 8px', borderRadius: '50px', background: inv.status === 'paid' ? C.greenSoft : C.goldSoft, color: inv.status === 'paid' ? C.green : C.goldDeep, border: `1px solid ${inv.status === 'paid' ? C.green + '40' : C.goldBorder}` }}>
                  {inv.status || 'unpaid'}
                </span>
              </div>
            </div>
            {hasWhatsApp && (
              <a
                href={waLink(msg)}
                target="_blank" rel="noreferrer"
                aria-label="Send on WhatsApp"
                style={{
                  background: '#25D366', borderRadius: '50%',
                  width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, textDecoration: 'none',
                }}
              ><MessageCircle size={16} color={C.ivory} /></a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// PAYMENTS PANEL
// ══════════════════════════════════════════════════════════════════════════

function PaymentsPanel({ schedules, client, waLink, hasWhatsApp }: any) {
  if (schedules.length === 0) {
    return (
      <div style={{
        background: C.pearl,
        border: `1px dashed ${C.borderSoft}`,
        borderRadius: '14px',
        padding: '32px 20px',
        textAlign: 'center',
      }}>
        <CreditCard size={28} color={C.light} />
        <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500, marginTop: '12px' }}>No payment schedule</div>
        <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px', lineHeight: 1.5 }}>
          Set up instalment schedules from the business portal for large bookings.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {schedules.map((sched: any) => {
        const instalments = sched.instalments || [];
        const totalAmount = instalments.reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);
        const paidAmount = instalments.filter((i: any) => i.paid).reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0);
        const overdue = instalments.filter((i: any) => !i.paid && i.due_date && new Date(i.due_date) < new Date());

        return (
          <div key={sched.id} style={{
            background: C.ivory,
            border: `1px solid ${overdue.length > 0 ? C.redBorder : C.border}`,
            borderRadius: '14px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 600 }}>Total</div>
                <div style={{ fontSize: '16px', fontFamily: "'Playfair Display', serif", color: C.dark }}>₹{fmtINR(totalAmount)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', color: C.muted, fontWeight: 600 }}>Paid</div>
                <div style={{ fontSize: '16px', fontFamily: "'Playfair Display', serif", color: C.green }}>₹{fmtINR(paidAmount)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {instalments.map((inst: any, i: number) => {
                const isOverdue = !inst.paid && inst.due_date && new Date(inst.due_date) < new Date();
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: i < instalments.length - 1 ? `1px solid ${C.borderSoft}` : 'none',
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', color: C.dark }}>
                        {inst.label || `Instalment ${i + 1}`}
                      </div>
                      <div style={{ fontSize: '10px', color: isOverdue ? C.red : C.muted, marginTop: '2px' }}>
                        {inst.paid ? 'Paid' : isOverdue ? `Overdue · ${fmtDateShort(inst.due_date)}` : `Due ${fmtDateShort(inst.due_date)}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: C.dark }}>₹{fmtINR(parseInt(inst.amount) || 0)}</span>
                      {inst.paid ? (
                        <CheckCircle size={14} color={C.green} />
                      ) : isOverdue ? (
                        <AlertCircle size={14} color={C.red} />
                      ) : (
                        <Clock size={14} color={C.light} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {overdue.length > 0 && hasWhatsApp && (
              <a
                href={waLink(`Hi ${client.name || 'there'}, a gentle reminder about your pending instalment of ₹${fmtINR(overdue.reduce((s: number, i: any) => s + (parseInt(i.amount) || 0), 0))}. Would appreciate your quick attention.`)}
                target="_blank" rel="noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  background: '#25D366', color: C.ivory,
                  textDecoration: 'none', borderRadius: '10px',
                  padding: '10px', marginTop: '12px',
                  fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase',
                }}
              ><MessageCircle size={12} /> Send Payment Reminder</a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CONTRACTS PANEL
// ══════════════════════════════════════════════════════════════════════════

function ContractsPanel({ contracts, client, waLink, hasWhatsApp }: any) {
  if (contracts.length === 0) {
    return (
      <div style={{
        background: C.pearl,
        border: `1px dashed ${C.borderSoft}`,
        borderRadius: '14px',
        padding: '32px 20px',
        textAlign: 'center',
      }}>
        <Briefcase size={28} color={C.light} />
        <div style={{ fontSize: '14px', color: C.dark, fontWeight: 500, marginTop: '12px' }}>No contracts yet</div>
        <div style={{ fontSize: '12px', color: C.muted, marginTop: '6px', lineHeight: 1.5 }}>
          Draft contracts from the business portal to share with this client.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {contracts.map((co: any) => {
        const msg = `Hi ${client.name || 'there'}, sharing our contract — ${co.title || 'Contract'}. Please review at your convenience.${co.document_url ? ` ${co.document_url}` : ''}`;
        return (
          <div key={co.id} style={{
            background: C.ivory,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            padding: '14px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: C.goldSoft, border: `1px solid ${C.goldBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Briefcase size={14} color={C.goldDeep} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', color: C.dark, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.title || 'Contract'}</div>
              <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                {co.status || 'draft'} · {fmtDateShort(co.created_at)}
              </div>
            </div>
            {hasWhatsApp && (
              <a
                href={waLink(msg)}
                target="_blank" rel="noreferrer"
                aria-label="Send on WhatsApp"
                style={{
                  background: '#25D366', borderRadius: '50%',
                  width: '36px', height: '36px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, textDecoration: 'none',
                }}
              ><MessageCircle size={16} color={C.ivory} /></a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// NOTES PANEL
// ══════════════════════════════════════════════════════════════════════════

function NotesPanel({ value, onChange, onSave, saving, savedAt }: any) {
  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSave}
        placeholder="Private notes about this client. Preferences, sensitivities, anything helpful to remember."
        rows={10}
        style={{
          width: '100%',
          background: C.ivory,
          border: `1px solid ${C.border}`,
          borderRadius: '12px',
          padding: '14px',
          fontSize: '14px', color: C.dark,
          fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6,
          resize: 'vertical', outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <div style={{
        marginTop: '8px',
        fontSize: '10px', color: savedAt ? C.green : C.muted,
        fontStyle: 'italic',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        {saving ? 'Saving...' : savedAt ? '✓ Saved' : 'Notes autosave when you tap away.'}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'DM Sans, sans-serif',
      fontSize: '9px', fontWeight: 600,
      letterSpacing: '2.5px', textTransform: 'uppercase',
      color: C.goldDeep, marginBottom: '10px',
    }}>{children}</div>
  );
}
