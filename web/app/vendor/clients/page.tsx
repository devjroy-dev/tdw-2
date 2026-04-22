'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, X } from 'lucide-react';

const BASE = 'https://dream-wedding-production-89ae.up.railway.app';

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');`;

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function formatDate(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatBudget(b: number) {
  if (!b) return '';
  if (b >= 100000) return '₹' + (b / 100000).toFixed(b % 100000 === 0 ? 0 : 1) + 'L';
  if (b >= 1000) return '₹' + (b / 1000).toFixed(b % 1000 === 0 ? 0 : 1) + 'K';
  return '₹' + b;
}

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      background: '#111111', color: '#F8F7F5', fontFamily: 'DM Sans, sans-serif',
      fontSize: 12, fontWeight: 300, padding: '10px 16px', borderRadius: 8,
      zIndex: 200, whiteSpace: 'nowrap', willChange: 'transform, opacity',
      animation: 'toastIn 280ms cubic-bezier(0.22,1,0.36,1) forwards',
    }}>{msg}</div>
  );
}

function ShimmerRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid #E2DED8' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F8F7F5', backgroundImage: 'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 14, width: '60%', borderRadius: 4, background: '#F8F7F5', backgroundImage: 'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', marginBottom: 6 }} />
        <div style={{ height: 12, width: '40%', borderRadius: 4, background: '#F8F7F5', backgroundImage: 'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
      </div>
      <div style={{ height: 16, width: 48, borderRadius: 4, background: '#F8F7F5', backgroundImage: 'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
    </div>
  );
}

export default function VendorClientsPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', event_type: '', event_date: '', venue: '', budget: ''
  });

  useEffect(() => {
    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const s = JSON.parse(raw);
      if (!s.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(s.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }
  }, []);

  const fetchClients = useCallback(async (vid: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/v2/vendor/clients/${vid}`);
      const d = await r.json();
      if (d.success) setClients(d.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (vendorId) fetchClients(vendorId); }, [vendorId, fetchClients]);

  const filtered = clients.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));

  const handleAddClient = async () => {
    if (!form.name.trim()) { setToast('Full name is required.'); return; }
    setSubmitting(true);
    try {
      const r = await fetch(`${BASE}/api/vendor-clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          name: form.name,
          phone: form.phone,
          email: form.email,
          event_type: form.event_type,
          event_date: form.event_date || null,
          venue: form.venue,
          budget: form.budget ? Number(form.budget) : null,
        }),
      });
      const d = await r.json();
      if (d.success || r.ok) {
        setSheetOpen(false);
        setForm({ name: '', phone: '', email: '', event_type: '', event_date: '', venue: '', budget: '' });
        setToast('Client added.');
        fetchClients(vendorId);
      } else {
        setToast(d.error || d.message || 'Failed to add client.');
      }
    } catch { setToast('Network error.'); }
    setSubmitting(false);
  };

  return (
    <>
      <style>{`
        ${FONTS}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes toastIn { from{opacity:0;transform:translate(-50%,-40px)} to{opacity:1;transform:translate(-50%,0)} }
        @keyframes sheetUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F8F7F5', fontFamily: 'DM Sans, sans-serif', paddingBottom: 'calc(64px + env(safe-area-inset-bottom) + 80px)' }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR CLIENTS</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 28, color: '#111111', marginBottom: 16 }}>Clients</div>
        </div>

        {/* Search */}
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 10, padding: '10px 12px' }}>
            <Search size={16} color="#888580" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search clients"
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 300, color: '#111111' }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ padding: '0 20px' }}>
          {loading ? (
            [0,1,2,3,4].map(i => <ShimmerRow key={i} />)
          ) : filtered.length === 0 ? (
            <div style={{ paddingTop: 60, textAlign: 'center', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 20, color: '#888580', fontWeight: 300 }}>
              Your first client is one enquiry away.
            </div>
          ) : filtered.map((c, i) => (
            <div
              key={c.id}
              onClick={() => router.push('/vendor/clients/' + c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0',
                borderBottom: i < filtered.length - 1 ? '1px solid #E2DED8' : 'none',
                cursor: 'pointer', touchAction: 'manipulation',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#F8F7F5',
                border: '1px solid #E2DED8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Jost, sans-serif', fontSize: 12, color: '#111111', flexShrink: 0,
              }}>
                {getInitials(c.name || '?')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#111111', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12, color: '#888580', fontWeight: 300, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[c.event_type, c.event_date ? formatDate(c.event_date) : null].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {c.budget ? <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, color: '#111111', fontWeight: 300 }}>{formatBudget(c.budget)}</div> : null}
                {c.status ? <div style={{ fontFamily: 'Jost, sans-serif', fontSize: 9, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{c.status}</div> : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAB — gold, this is the ONE gold use */}
      <button
        onClick={() => setSheetOpen(true)}
        style={{
          position: 'fixed', bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)', right: 24,
          width: 52, height: 52, borderRadius: '50%', background: '#C9A84C',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', touchAction: 'manipulation', zIndex: 90,
          willChange: 'transform', transform: 'translateZ(0)',
          boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
        }}
      >
        <Plus size={20} color="#F8F7F5" />
      </button>

      {/* Add Client Sheet */}
      {sheetOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={e => { if (e.target === e.currentTarget) setSheetOpen(false); }}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,17,17,0.4)', willChange: 'opacity' }} />
          <div style={{
            position: 'relative', background: '#FFFFFF', borderRadius: '24px 24px 0 0',
            padding: '24px 20px calc(env(safe-area-inset-bottom) + 24px)',
            willChange: 'transform', transform: 'translateZ(0)',
            animation: 'sheetUp 320ms cubic-bezier(0.22,1,0.36,1) forwards',
            maxHeight: '88vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 300, color: '#111111' }}>Add Client</div>
              <button onClick={() => setSheetOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, touchAction: 'manipulation' }}>
                <X size={20} color="#888580" />
              </button>
            </div>

            {[
              { label: 'FULL NAME', key: 'name', type: 'text', required: true },
              { label: 'PHONE', key: 'phone', type: 'tel' },
              { label: 'EMAIL', key: 'email', type: 'email' },
              { label: 'EVENT TYPE', key: 'event_type', type: 'text', placeholder: 'Wedding, Pre-Wedding…' },
              { label: 'EVENT DATE', key: 'event_date', type: 'date' },
              { label: 'VENUE', key: 'venue', type: 'text' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  {f.label}{f.required ? ' *' : ''}
                </label>
                <input
                  type={f.type}
                  placeholder={f.placeholder || ''}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 300, color: '#111111', borderBottom: '1px solid #E2DED8', background: 'transparent', outline: 'none', padding: '10px 0', width: '100%', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0 }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 28 }}>
              <label style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>BUDGET</label>
              <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #E2DED8' }}>
                <span style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#888580', paddingRight: 4, paddingBottom: 10, paddingTop: 10 }}>₹</span>
                <input
                  type="number"
                  value={form.budget}
                  onChange={e => setForm(p => ({ ...p, budget: e.target.value }))}
                  style={{ flex: 1, fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 300, color: '#111111', background: 'transparent', outline: 'none', padding: '10px 0', border: 'none', borderRadius: 0 }}
                />
              </div>
            </div>

            <button
              onClick={handleAddClient}
              disabled={submitting}
              style={{
                width: '100%', background: '#111111', color: '#F8F7F5', border: 'none',
                fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 12, letterSpacing: '0.22em',
                textTransform: 'uppercase', padding: 16, borderRadius: 10, cursor: 'pointer',
                touchAction: 'manipulation', opacity: submitting ? 0.6 : 1, transition: 'opacity 280ms',
              }}
            >
              {submitting ? 'ADDING…' : 'ADD CLIENT'}
            </button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast} onDone={() => setToast('')} />}
    </>
  );
}
