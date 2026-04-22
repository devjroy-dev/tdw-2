'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Phone, Mail, MessageCircle } from 'lucide-react';

const BASE = 'https://dream-wedding-production-89ae.up.railway.app';
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');`;

function formatDate(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      background: '#111111', color: '#F8F7F5', fontFamily: 'DM Sans, sans-serif',
      fontSize: 12, fontWeight: 300, padding: '10px 16px', borderRadius: 8, zIndex: 200,
      whiteSpace: 'nowrap', willChange: 'transform, opacity',
      animation: 'toastIn 280ms cubic-bezier(0.22,1,0.36,1) forwards',
    }}>{msg}</div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 20, ...style }}>
      {children}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  if (s === 'active') return <span style={{ background: '#111111', color: '#F8F7F5', fontFamily: 'Jost, sans-serif', fontSize: 9, fontWeight: 200, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20 }}>{status}</span>;
  return <span style={{ background: '#E2DED8', color: '#888580', fontFamily: 'Jost, sans-serif', fontSize: 9, fontWeight: 200, letterSpacing: '0.15em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20 }}>{status}</span>;
}

function InvoiceChip({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  if (s === 'paid') return <span style={{ background: '#E8F5E9', color: '#4A7C59', fontFamily: 'Jost, sans-serif', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20 }}>PAID</span>;
  if (s === 'overdue') return <span style={{ background: '#FFEBEE', color: '#9B4545', fontFamily: 'Jost, sans-serif', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20 }}>OVERDUE</span>;
  return <span style={{ background: '#E2DED8', color: '#888580', fontFamily: 'Jost, sans-serif', fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20 }}>PENDING</span>;
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;

  const [vendorId, setVendorId] = useState('');
  const [client, setClient] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [saveLabel, setSaveLabel] = useState('');
  const [toast, setToast] = useState('');
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const s = JSON.parse(raw);
      if (!s.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(s.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }
  }, []);

  const fetchAll = useCallback(async (vid: string) => {
    setLoading(true);
    try {
      const [cr, ir] = await Promise.all([
        fetch(`${BASE}/api/vendor-clients/by-id/${clientId}`),
        fetch(`${BASE}/api/invoices/${vid}`),
      ]);
      const cd = await cr.json();
      const id = await ir.json();
      if (cd.success && cd.data) {
        setClient(cd.data);
        setNotes(cd.data.notes || '');
      }
      if (id.success || Array.isArray(id.data)) {
        const all = id.data || id || [];
        setInvoices(Array.isArray(all) ? all.filter((inv: any) => inv.client_id === clientId || inv.client_name === cd?.data?.name) : []);
      }
    } catch {}
    setLoading(false);
  }, [clientId]);

  useEffect(() => { if (vendorId && clientId) fetchAll(vendorId); }, [vendorId, clientId, fetchAll]);

  const handleNotesChange = (val: string) => {
    setNotes(val);
    setSaveLabel('');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await fetch(`${BASE}/api/vendor-clients/${clientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: val }),
        });
        setSaveLabel('Saved');
      } catch {}
    }, 1200);
  };

  const handleBlockCalendar = async () => {
    if (!client) return;
    try {
      const r = await fetch(`${BASE}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          client_id: client.id,
          client_name: client.name,
          event_date: client.event_date,
          event_type: client.event_type,
          venue: client.venue,
          status: 'confirmed',
        }),
      });
      const d = await r.json();
      if (d.success || r.ok) setToast('Booking confirmed.');
      else setToast(d.error || d.message || 'Failed.');
    } catch { setToast('Network error.'); }
  };

  const phone = client?.phone || '';
  const waPhone = '91' + phone.replace(/\D/g, '');

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F8F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{FONTS}</style>
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, color: '#888580', fontWeight: 300, fontStyle: 'italic' }}>Loading…</div>
    </div>
  );

  if (!client) return (
    <div style={{ minHeight: '100vh', background: '#F8F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{FONTS}</style>
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, color: '#888580', fontStyle: 'italic' }}>Client not found.</div>
    </div>
  );

  return (
    <>
      <style>{`
        ${FONTS}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes toastIn { from{opacity:0;transform:translate(-50%,-40px)} to{opacity:1;transform:translate(-50%,0)} }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F8F7F5', fontFamily: 'DM Sans, sans-serif', paddingBottom: 100 }}>

        {/* Back + Header */}
        <div style={{ padding: '16px 20px 0' }}>
          <button
            onClick={() => router.push('/vendor/clients')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4, touchAction: 'manipulation' }}
          >
            <ArrowLeft size={20} color="#111111" />
          </button>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 32, color: '#111111', lineHeight: 1.15 }}>{client.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            {client.event_date && <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#888580', fontWeight: 300 }}>{formatDate(client.event_date)}</span>}
            {client.status && <StatusChip status={client.status} />}
          </div>
        </div>

        <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Contact */}
          <Card>
            <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 14 }}>CONTACT</div>
            {phone && (
              <a href={`tel:${phone}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 12, touchAction: 'manipulation' }}>
                <Phone size={16} color="#888580" />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#111111', fontWeight: 300 }}>{phone}</span>
              </a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 16, touchAction: 'manipulation' }}>
                <Mail size={16} color="#888580" />
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#111111', fontWeight: 300 }}>{client.email}</span>
              </a>
            )}
            {phone && (
              <button
                onClick={() => window.location.href = `https://wa.me/${waPhone}`}
                style={{
                  width: '100%', background: '#111111', color: '#F8F7F5', border: 'none',
                  fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.22em',
                  textTransform: 'uppercase', padding: '12px 0', borderRadius: 8, cursor: 'pointer', touchAction: 'manipulation',
                }}
              >
                OPEN WHATSAPP
              </button>
            )}
          </Card>

          {/* Events */}
          <Card>
            <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 14 }}>EVENTS</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#111111', fontWeight: 400 }}>{client.event_type || '—'}</div>
              {client.event_date && <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#888580', fontWeight: 300, marginTop: 2 }}>{formatDate(client.event_date)}</div>}
              {client.venue && <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#888580', fontWeight: 300, marginTop: 2 }}>{client.venue}</div>}
            </div>
            <button
              onClick={handleBlockCalendar}
              style={{
                width: '100%', background: '#F8F7F5', color: '#111111', border: '1px solid #E2DED8',
                fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.22em',
                textTransform: 'uppercase', padding: '12px 0', borderRadius: 8, cursor: 'pointer', touchAction: 'manipulation',
              }}
            >
              BLOCK CALENDAR
            </button>
          </Card>

          {/* Invoices */}
          <Card>
            <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 14 }}>INVOICES</div>
            {invoices.length === 0 ? (
              <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontStyle: 'italic', color: '#888580', marginBottom: 14 }}>No invoices yet.</div>
            ) : invoices.map((inv, i) => (
              <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < invoices.length - 1 ? '1px solid #E2DED8' : 'none' }}>
                <div>
                  <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#111111', fontWeight: 400 }}>{inv.description || 'Invoice'}</div>
                  {inv.due_date && <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 11, color: '#888580', fontWeight: 300, marginTop: 2 }}>Due {formatDate(inv.due_date)}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, color: '#111111', fontWeight: 300 }}>₹{(inv.total_amount || inv.amount || 0).toLocaleString('en-IN')}</div>
                  <div style={{ marginTop: 4 }}><InvoiceChip status={inv.status} /></div>
                </div>
              </div>
            ))}
            <button
              onClick={() => router.push(`/vendor/money?action=create&clientId=${client.id}&clientName=${encodeURIComponent(client.name)}&phone=${client.phone || ''}`)}
              style={{
                width: '100%', marginTop: 12, background: '#F8F7F5', color: '#111111', border: '1px solid #E2DED8',
                fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.22em',
                textTransform: 'uppercase', padding: '12px 0', borderRadius: 8, cursor: 'pointer', touchAction: 'manipulation',
              }}
            >
              CREATE INVOICE
            </button>
          </Card>

          {/* Notes */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase' }}>NOTES</div>
              {saveLabel && <span style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.1em' }}>{saveLabel}</span>}
            </div>
            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Private notes about this client…"
              style={{
                width: '100%', minHeight: 100, fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#111111',
                fontWeight: 300, lineHeight: 1.6, background: 'transparent', border: 'none', outline: 'none',
                resize: 'none', padding: 0,
              }}
            />
          </Card>
        </div>

        {/* Bottom actions */}
        <div style={{ padding: '20px 20px 0', display: 'flex', gap: 12 }}>
          <button
            onClick={() => window.open(`https://wa.me/${waPhone}`, '_blank')}
            style={{
              flex: 1, background: '#F8F7F5', color: '#111111', border: '1px solid #E2DED8',
              borderRadius: 12, fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 300,
              padding: 14, cursor: 'pointer', touchAction: 'manipulation',
            }}
          >
            SEND MESSAGE
          </button>
          <button
            onClick={() => router.push(`/vendor/money?action=create&clientId=${client.id}&clientName=${encodeURIComponent(client.name)}`)}
            style={{
              flex: 1, background: '#F8F7F5', color: '#111111', border: '1px solid #E2DED8',
              borderRadius: 12, fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 300,
              padding: 14, cursor: 'pointer', touchAction: 'manipulation',
            }}
          >
            ADD PAYMENT
          </button>
        </div>
      </div>

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </>
  );
}
