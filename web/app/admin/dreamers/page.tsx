'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'; }

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#F8F7F5', fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap' }}>{msg}</div>;
}

const TIER_LABELS: Record<string,string> = { free: 'Basic', premium: 'Gold', elite: 'Platinum' };
const TIER_COLORS: Record<string,string> = { free: '#888580', premium: '#C9A84C', elite: '#111' };

function TierChip({ tier }: { tier: string }) {
  return <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 100, background: tier === 'elite' ? '#111' : tier === 'premium' ? 'rgba(201,168,76,0.12)' : '#F4F1EC', color: TIER_COLORS[tier] || '#888580' }}>{TIER_LABELS[tier] || tier}</span>;
}

interface Dreamer { id: string; name: string; phone: string; city?: string; couple_tier: string; wedding_date?: string; muse_saves: number; enquiries_sent: number; created_at: string; discover_enabled: boolean; token_balance: number; }

export default function DreamersPage() {
  const router = useRouter();
  const [dreamers, setDreamers] = useState<Dreamer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState<Dreamer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteInput, setDeleteInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (search) params.set('search', search);
      if (filterTier !== 'all') params.set('tier', filterTier);
      const r = await fetch(`${API}/api/v3/admin/dreamers?${params}`, { headers: H });
      const d = await r.json();
      if (d.success) setDreamers(d.data || []);
    } finally { setLoading(false); }
  }, [search, filterTier]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  async function updateDreamer(id: string, patch: object) {
    await fetch(`${API}/api/v3/admin/dreamers/${id}`, { method: 'PATCH', headers: H, body: JSON.stringify(patch) });
    setDreamers(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));
    setSelected(prev => prev?.id === id ? { ...prev, ...patch as any } : prev);
    setToast('Updated');
  }

  async function deleteDreamer(id: string) {
    await fetch(`${API}/api/v2/admin/couples/${id}`, { method: 'DELETE', headers: H });
    setDreamers(prev => prev.filter(d => d.id !== id));
    setSelected(null); setDeleteConfirm(''); setDeleteInput('');
    setToast('Dreamer deleted');
  }

  async function sendWA(phone: string) {
    const msg = prompt('WhatsApp message to send:');
    if (!msg) return;
    await fetch(`${API}/api/v3/admin/send-whatsapp`, { method: 'POST', headers: H, body: JSON.stringify({ phone, message: msg }) });
    setToast('WhatsApp sent');
  }

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#111', margin: '0 0 8px' }}>Delete this Dreamer?</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: '0 0 20px', lineHeight: 1.5 }}>This cannot be undone. All their data will be permanently deleted.</p>
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 8px' }}>Type DELETE to confirm</p>
            <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)} style={{ width: '100%', border: '1px solid #E2DED8', borderRadius: 8, padding: '10px 12px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, outline: 'none', marginBottom: 16 }} placeholder="DELETE" />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { if (deleteInput === 'DELETE') deleteDreamer(deleteConfirm); }} disabled={deleteInput !== 'DELETE'} style={{ flex: 1, height: 44, background: deleteInput === 'DELETE' ? '#9B4545' : '#E2DED8', color: '#FFFFFF', border: 'none', borderRadius: 100, fontFamily: "'Jost', sans-serif", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: deleteInput === 'DELETE' ? 'pointer' : 'default' }}>Delete Permanently</button>
              <button onClick={() => { setDeleteConfirm(''); setDeleteInput(''); }} style={{ height: 44, padding: '0 20px', background: 'transparent', border: '1px solid #E2DED8', borderRadius: 100, fontFamily: "'Jost', sans-serif", fontSize: 9, color: '#888580', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 340, background: '#FFFFFF', borderLeft: '1px solid #E2DED8', zIndex: 301, overflowY: 'auto' }}>
            <div style={{ padding: '20px 20px 16px', borderBottom: '0.5px solid #E2DED8' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888580', fontSize: 18 }}>✕</button>
                <TierChip tier={selected.couple_tier} />
              </div>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300, color: '#111', margin: '0 0 4px' }}>{selected.name || 'Unknown'}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: 0 }}>{selected.phone}{selected.city ? ` · ${selected.city}` : ''}</p>
            </div>
            <div style={{ padding: 20 }}>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                {[{l:'Muse', v:selected.muse_saves},{l:'Enquiries', v:selected.enquiries_sent},{l:'Tokens', v:selected.token_balance}].map(s => (
                  <div key={s.l} style={{ background: '#F8F7F5', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#111', margin: '0 0 2px' }}>{s.v}</p>
                    <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 7, fontWeight: 200, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888580', margin: 0 }}>{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Meta */}
              <div style={{ marginBottom: 20 }}>
                {[
                  { l: 'Wedding Date', v: selected.wedding_date ? fmtDate(selected.wedding_date) : 'Not set' },
                  { l: 'Joined', v: fmtDate(selected.created_at) },
                  { l: 'Discovery', v: selected.discover_enabled ? '✓ Enabled' : '✗ Disabled' },
                ].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #F0EEE8' }}>
                    <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888580', margin: 0 }}>{r.l}</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#111', margin: 0 }}>{r.v}</p>
                  </div>
                ))}
              </div>

              {/* Tier change */}
              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 8px' }}>Change Tier</p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {['free','premium','elite'].map(t => (
                  <button key={t} onClick={() => updateDreamer(selected.id, { couple_tier: t })} style={{ flex: 1, height: 32, background: selected.couple_tier === t ? '#111' : '#F4F1EC', color: selected.couple_tier === t ? '#F