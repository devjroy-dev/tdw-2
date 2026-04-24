'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
}

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#F8F7F5', fontFamily: 'DM Sans, sans-serif', fontSize: 13, padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap' }}>
      {msg}
    </div>
  );
}

const TIER_LABELS: Record<string, string> = { free: 'Basic', premium: 'Gold', elite: 'Platinum' };

function TierChip({ tier }: { tier: string }) {
  const bg = tier === 'elite' ? '#111' : tier === 'premium' ? 'rgba(201,168,76,0.12)' : '#F4F1EC';
  const color = tier === 'elite' ? '#F8F7F5' : tier === 'premium' ? '#C9A84C' : '#888580';
  return (
    <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 8, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 100, background: bg, color }}>
      {TIER_LABELS[tier] || tier}
    </span>
  );
}

interface Dreamer {
  id: string; name: string; phone: string; city?: string;
  couple_tier: string; wedding_date?: string;
  muse_saves: number; enquiries_sent: number;
  created_at: string; discover_enabled: boolean; token_balance: number;
}

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

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

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

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px', border: 'none', borderRadius: 100, cursor: 'pointer',
    fontFamily: 'Jost, sans-serif', fontSize: 8, fontWeight: 300,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    background: active ? '#111' : '#F4F1EC',
    color: active ? '#F8F7F5' : '#888580',
  });

  const metaRow = (label: string, value: string) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid rgba(248,247,245,0.06)' }}>
      <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 9, fontWeight: 200, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)', margin: 0 }}>{label}</p>
      <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 300, color: '#F8F7F5', margin: 0 }}>{value}</p>
    </div>
  );

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFF', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' }}>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 300, color: '#F8F7F5', margin: '0 0 8px' }}>Delete this Dreamer?</p>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 300, color: 'rgba(248,247,245,0.4)', margin: '0 0 20px', lineHeight: 1.5 }}>This cannot be undone. All their data will be permanently deleted.</p>
            <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)', margin: '0 0 8px' }}>Type DELETE to confirm</p>
            <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)} style={{ width: '100%', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 8, padding: '10px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: 14, outline: 'none', marginBottom: 16 }} placeholder="DELETE" />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { if (deleteInput === 'DELETE') deleteDreamer(deleteConfirm); }} disabled={deleteInput !== 'DELETE'} style={{ flex: 1, height: 44, background: deleteInput === 'DELETE' ? '#9B4545' : '#E2DED8', color: '#FFF', border: 'none', borderRadius: 100, fontFamily: 'Jost, sans-serif', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: deleteInput === 'DELETE' ? 'pointer' : 'default' }}>Delete Permanently</button>
              <button onClick={() => { setDeleteConfirm(''); setDeleteInput(''); }} style={{ height: 44, padding: '0 20px', background: 'transparent', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 100, fontFamily: 'Jost, sans-serif', fontSize: 9, color: 'rgba(248,247,245,0.4)', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 300 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 340, background: '#FFF', borderLeft: '1px solid #E2DED8', zIndex: 301, overflowY: 'auto' }}>
            <div style={{ padding: '20px 20px 16px', borderBottom: '0.5px solid rgba(248,247,245,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(248,247,245,0.4)', fontSize: 18 }}>✕</button>
                <TierChip tier={selected.couple_tier} />
              </div>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, fontWeight: 300, color: '#F8F7F5', margin: '0 0 4px' }}>{selected.name || 'Unknown'}</p>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 300, color: 'rgba(248,247,245,0.4)', margin: 0 }}>{selected.phone}{selected.city ? ` · ${selected.city}` : ''}</p>
            </div>

            <div style={{ padding: 20 }}>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
                {[{ l: 'Muse', v: selected.muse_saves }, { l: 'Enquiries', v: selected.enquiries_sent }, { l: 'Tokens', v: selected.token_balance }].map(s => (
                  <div key={s.l} style={{ background: '#0C0A09', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                    <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 300, color: '#F8F7F5', margin: '0 0 2px' }}>{s.v}</p>
                    <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 7, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)', margin: 0 }}>{s.l}</p>
                  </div>
                ))}
              </div>

              {/* Meta */}
              <div style={{ marginBottom: 20 }}>
                {metaRow('Wedding Date', selected.wedding_date ? fmtDate(selected.wedding_date) : 'Not set')}
                {metaRow('Joined', fmtDate(selected.created_at))}
                {metaRow('Discovery', selected.discover_enabled ? '✓ Enabled' : '✗ Disabled')}
              </div>

              {/* Tier */}
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)', margin: '0 0 8px' }}>Change Tier</p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {['free', 'premium', 'elite'].map(t => {
                  const isActive = selected.couple_tier === t;
                  return (
                    <button key={t} onClick={() => updateDreamer(selected.id, { couple_tier: t })} style={{ flex: 1, height: 32, background: isActive ? '#111' : '#F4F1EC', color: isActive ? '#F8F7F5' : '#888580', border: 'none', borderRadius: 6, fontFamily: 'Jost, sans-serif', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                      {TIER_LABELS[t]}
                    </button>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => updateDreamer(selected.id, { discover_enabled: !selected.discover_enabled })} style={{ height: 40, background: '#1E1C1A', border: 'none', borderRadius: 8, fontFamily: 'Jost, sans-serif', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F8F7F5', cursor: 'pointer' }}>
                  {selected.discover_enabled ? 'Disable Discovery' : 'Enable Discovery'}
                </button>
                <button onClick={() => { const n = prompt('Tokens to add:'); if (n && !isNaN(Number(n))) updateDreamer(selected.id, { token_balance: (selected.token_balance || 0) + Number(n) }); }} style={{ height: 40, background: '#1E1C1A', border: 'none', borderRadius: 8, fontFamily: 'Jost, sans-serif', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F8F7F5', cursor: 'pointer' }}>
                  + Add Tokens
                </button>
                <button onClick={() => { if (selected.phone) sendWA(selected.phone); }} style={{ height: 40, background: '#25D366', border: 'none', borderRadius: 8, fontFamily: 'Jost, sans-serif', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#FFF', cursor: 'pointer' }}>
                  Send WhatsApp
                </button>
                <button onClick={() => setDeleteConfirm(selected.id)} style={{ height: 40, background: 'transparent', border: '1px solid #FFEBEE', borderRadius: 8, fontFamily: 'Jost, sans-serif', fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B4545', cursor: 'pointer' }}>
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, color: 'rgba(248,247,245,0.4)', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>Admin</p>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 32, color: '#F8F7F5', margin: 0 }}>
            Dreamers <span style={{ fontSize: 18, color: 'rgba(248,247,245,0.4)' }}>({dreamers.length})</span>
          </p>
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone…" style={{ flex: 1, minWidth: 200, border: 'none', borderBottom: '1px solid rgba(248,247,245,0.08)', background: 'transparent', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 300, color: '#F8F7F5', padding: '8px 0', outline: 'none', color: '#F8F7F5' }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['all', 'All'], ['free', 'Basic'], ['premium', 'Gold'], ['elite', 'Platinum']].map(([v, l]) => (
            <button key={v} onClick={() => setFilterTier(v)} style={chipStyle(filterTier === v)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#FFF', border: '1px solid rgba(248,247,245,0.1)', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
          <thead>
            <tr style={{ background: '#0C0A09' }}>
              {['Name', 'Phone', 'Tier', 'Wedding', 'Muse', 'Enquiries', 'Joined'].map(col => (
                <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 8, color: 'rgba(248,247,245,0.4)', letterSpacing: '0.2em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && [1, 2, 3, 4, 5].map(i => (
              <tr key={i}><td colSpan={7} style={{ padding: '12px 14px' }}><div style={{ height: 14, background: 'linear-gradient(90deg,#1E1C1A 25%,#2A2825 50%,#1E1C1A 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', borderRadius: 4 }} /></td></tr>
            ))}
            {!loading && dreamers.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', fontFamily: 'Cormorant Garamond, serif', fontSize: 18, fontWeight: 300, fontStyle: 'italic', color: 'rgba(248,247,245,0.4)' }}>No Dreamers found.</td></tr>
            )}
            {!loading && dreamers.map(d => (
              <tr key={d.id} onClick={() => setSelected(d)} style={{ borderTop: '0.5px solid rgba(248,247,245,0.06)', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#1E1C1A'} onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                <td style={{ padding: '11px 14px', fontFamily: 'DM Sans, sans-serif', fontWeight: 400, fontSize: 13, color: '#F8F7F5', whiteSpace: 'nowrap' }}>{d.name || '—'}</td>
                <td style={{ padding: '11px 14px', fontFamily: 'DM Sans, sans-serif', fontWeight: 300, fontSize: 12, color: 'rgba(248,247,245,0.55)' }}>{d.phone || '—'}</td>
                <td style={{ padding: '11px 14px' }}><TierChip tier={d.couple_tier} /></td>
                <td style={{ padding: '11px 14px', fontFamily: 'DM Sans, sans-serif', fontWeight: 300, fontSize: 12, color: 'rgba(248,247,245,0.55)', whiteSpace: 'nowrap' }}>{d.wedding_date ? fmtDate(d.wedding_date) : '—'}</td>
                <td style={{ padding: '11px 14px', fontFamily: 'DM Sans, sans-serif', fontWeight: 300, fontSize: 12, color: 'rgba(248,247,245,0.55)', textAlign: 'center' }}>{d.muse_saves}</td>
                <td style={{ padding: '11px 14px', fontFamily: 'DM Sans, sans-serif', fontWeight: 300, fontSize: 12, color: 'rgba(248,247,245,0.55)', textAlign: 'center' }}>{d.enquiries_sent}</td>
                <td style={{ padding: '11px 14px', fontFamily: 'DM Sans, sans-serif', fontWeight: 300, fontSize: 11, color: 'rgba(248,247,245,0.4)', whiteSpace: 'nowrap' }}>{fmtDate(d.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
