'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'; }
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#111111', fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap' }}>{msg}</div>;
}

const TIER_COLORS: Record<string, string> = { essential: '#888580', signature: '#C9A84C', prestige: '#111' };
const TIER_BG: Record<string, string> = { essential: '#F4F1EC', signature: 'rgba(201,168,76,0.1)', prestige: '#111' };
const TIER_TEXT: Record<string, string> = { essential: '#888580', signature: '#C9A84C', prestige: '#F8F7F5' };

function TierChip({ tier }: { tier: string }) {
  return <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 100, background: TIER_BG[tier] || '#F4F1EC', color: TIER_TEXT[tier] || '#888580' }}>{tier}</span>;
}

interface Maker { id: string; name: string; category: string; city: string; phone: string; tier: string; is_verified: boolean; is_luxury: boolean; subscription_active: boolean; created_at: string; discover_enabled: boolean; }

export default function MakersPage() {
  const router = useRouter();
  const [makers, setMakers] = useState<Maker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTier, setFilterTier] = useState('all');
  const [toast, setToast] = useState('');
  const [selected, setSelected] = useState<Maker | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteInput, setDeleteInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (search) params.set('search', search);
      if (filterTier !== 'all') params.set('tier', filterTier);
      const r = await fetch(`${API}/api/v3/admin/makers?${params}`, { headers: H });
      const d = await r.json();
      if (d.success) setMakers(d.data || []);
    } finally { setLoading(false); }
  }, [search, filterTier]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  async function updateMaker(id: string, patch: object) {
    await fetch(`${API}/api/v3/admin/makers/${id}`, { method: 'PATCH', headers: H, body: JSON.stringify(patch) });
    setMakers(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
    setSelected(prev => prev?.id === id ? { ...prev, ...patch as any } : prev);
    setToast('Updated');
  }

  async function deleteMaker(id: string) {
    await fetch(`${API}/api/v2/admin/vendors/${id}`, { method: 'DELETE', headers: H });
    setMakers(prev => prev.filter(m => m.id !== id));
    setSelected(null); setDeleteConfirm(''); setDeleteInput('');
    setToast('Maker deleted');
  }

  async function approveAllImages(id: string) {
    await fetch(`${API}/api/v3/admin/makers/${id}/approve-all-images`, { method: 'POST', headers: H });
    setToast('All images approved');
  }

  async function sendWA(phone: string) {
    const msg = prompt('WhatsApp message:');
    if (!msg) return;
    await fetch(`${API}/api/v3/admin/send-whatsapp`, { method: 'POST', headers: H, body: JSON.stringify({ phone, message: msg }) });
    setToast('WhatsApp sent');
  }

  const pill = (active: boolean, onLabel: string, offLabel: string, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '2px 10px', borderRadius: 100, border: `0.5px solid ${active ? '#C9A84C' : '#E2DED8'}`, background: active ? 'rgba(201,168,76,0.1)' : 'transparent', color: active ? '#C9A84C' : '#888580', fontFamily: "'Jost',sans-serif", fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
      {active ? onLabel : offLabel}
    </button>
  );

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' }}>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, color: '#111111', margin: '0 0 8px' }}>Delete this Maker?</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: '0 0 20px', lineHeight: 1.5 }}>This cannot be undone. All their data will be permanently deleted.</p>
            <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)} style={{ width: '100%', border: '1px solid #E2DED8', borderRadius: 8, padding: '10px 12px', fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: 'none', marginBottom: 16 }} placeholder="Type DELETE to confirm" />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { if (deleteInput === 'DELETE') deleteMaker(deleteConfirm); }} disabled={deleteInput !== 'DELETE'} style={{ flex: 1, height: 44, background: deleteInput === 'DELETE' ? '#9B4545' : '#E2DED8', color: '#111111', border: 'none', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: deleteInput === 'DELETE' ? 'pointer' : 'default' }}>Delete Permanently</button>
              <button onClick={() => { setDeleteConfirm(''); setDeleteInput(''); }} style={{ height: 44, padding: '0 20px', background: 'transparent', border: '1px solid #E2DED8', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, color: '#888580', cursor: 'pointer' }}>Cancel</button>
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
                <TierChip tier={selected.tier} />
              </div>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300, color: '#111111', margin: '0 0 4px' }}>{selected.name}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: 0 }}>{selected.category}{selected.city ? ` · ${selected.city}` : ''}</p>
            </div>
            <div style={{ padding: 20 }}>
              {/* Meta */}
              <div style={{ marginBottom: 20 }}>
                {[
                  { l: 'Phone', v: selected.phone || '—' },
                  { l: 'Joined', v: fmtDate(selected.created_at) },
                  { l: 'Verified', v: selected.is_verified ? '✓ Yes' : '✗ No' },
                  { l: 'Luxury', v: selected.is_luxury ? '✓ Yes' : '✗ No' },
                  { l: 'Subscription', v: selected.subscription_active ? '✓ Active' : '✗ Inactive' },
                  { l: 'Discovery', v: selected.discover_enabled ? '✓ Enabled' : '✗ Disabled' },
                ].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #E8E5DF' }}>
                    <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888580', margin: 0 }}>{r.l}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#111111', margin: 0 }}>{r.v}</p>
                  </div>
                ))}
              </div>

              {/* Tier change */}
              <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580', margin: '0 0 8px' }}>Change Tier</p>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {['essential', 'signature', 'prestige'].map(t => (
                  <button key={t} onClick={() => updateMaker(selected.id, { tier: t })} style={{ flex: 1, height: 32, background: selected.tier === t ? '#111' : '#F4F1EC', color: selected.tier === t ? '#F8F7F5' : '#888580', border: 'none', borderRadius: 6, fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>{t}</button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => updateMaker(selected.id, { is_verified: !selected.is_verified })} style={{ height: 40, background: '#F8F7F5', border: 'none', borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#111111', cursor: 'pointer' }}>
                  {selected.is_verified ? 'Unverify' : 'Verify Maker'}
                </button>
                <button onClick={() => updateMaker(selected.id, { is_luxury: !selected.is_luxury, luxury_approved: !selected.is_luxury })} style={{ height: 40, background: '#F8F7F5', border: 'none', borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#111111', cursor: 'pointer' }}>
                  {selected.is_luxury ? 'Remove Luxury' : 'Approve as Luxury'}
                </button>
                <button onClick={() => updateMaker(selected.id, { discover_enabled: !selected.discover_enabled })} style={{ height: 40, background: '#F8F7F5', border: 'none', borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#111111', cursor: 'pointer' }}>
                  {selected.discover_enabled ? 'Disable Discovery' : 'Enable Discovery'}
                </button>
                <button onClick={() => approveAllImages(selected.id)} style={{ height: 40, background: '#F8F7F5', border: 'none', borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#111111', cursor: 'pointer' }}>Approve All Images</button>
                {selected.phone && <button onClick={() => sendWA(selected.phone)} style={{ height: 40, background: '#25D366', border: 'none', borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#111111', cursor: 'pointer' }}>Send WhatsApp</button>}
                <button onClick={() => setDeleteConfirm(selected.id)} style={{ height: 40, background: 'transparent', border: '1px solid #FFEBEE', borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#9B4545', cursor: 'pointer' }}>Delete Account</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>Admin</p>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 32, color: '#111111', margin: 0 }}>Makers <span style={{ fontSize: 18, color: '#888580' }}>({makers.length})</span></p>
        </div>
        <button onClick={() => router.push('/admin/images')} style={{ height: 36, padding: '0 16px', background: '#111111', color: '#111111', border: 'none', borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>⬡ Approve Images</button>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, phone, or city…" style={{ flex: 1, minWidth: 200, border: 'none', borderBottom: '1px solid rgba(248,247,245,0.08)', background: 'transparent', fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#111111', padding: '8px 0', outline: 'none' }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {[['all','All'],['essential','Essential'],['signature','Signature'],['prestige','Prestige']].map(([v,l]) => (
            <button key={v} onClick={() => setFilterTier(v)} style={{ padding: '4px 12px', border: 'none', borderRadius: 100, cursor: 'pointer', fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', background: filterTier === v ? '#111' : '#F4F1EC', color: filterTier === v ? '#F8F7F5' : '#888580' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
          <thead>
            <tr style={{ background: '#F8F7F5' }}>
              {['Name', 'Category', 'City', 'Tier', 'Verified', 'Discovery', 'Joined'].map(col => (
                <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.2em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && [1,2,3,4,5].map(i => (
              <tr key={i}><td colSpan={7} style={{ padding: '12px 14px' }}><div style={{ height: 14, background: 'linear-gradient(90deg,#F0EEE8 25%,#E8E5DF 50%,#F0EEE8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', borderRadius: 4 }} /></td></tr>
            ))}
            {!loading && makers.length === 0 && (
              <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 300, fontStyle: 'italic', color: '#888580' }}>No Makers found.</td></tr>
            )}
            {!loading && makers.map(m => (
              <tr key={m.id} onClick={() => setSelected(m)} style={{ borderTop: '0.5px solid #E8E5DF', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#F8F7F5'}
                onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
              >
                <td style={{ padding: '11px 14px', fontFamily: "'DM Sans',sans-serif", fontWeight: 400, fontSize: 13, color: '#111111', whiteSpace: 'nowrap' }}>{m.name || '—'}</td>
                <td style={{ padding: '11px 14px', fontFamily: "'DM Sans',sans-serif", fontWeight: 300, fontSize: 12, color: '#555250' }}>{m.category || '—'}</td>
                <td style={{ padding: '11px 14px', fontFamily: "'DM Sans',sans-serif", fontWeight: 300, fontSize: 12, color: '#555250' }}>{m.city || '—'}</td>
                <td style={{ padding: '11px 14px' }}><TierChip tier={m.tier} /></td>
                <td style={{ padding: '11px 14px', fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: m.is_verified ? '#4A7C59' : '#888580' }}>{m.is_verified ? '✓' : '—'}</td>
                <td style={{ padding: '11px 14px', fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: m.discover_enabled ? '#4A7C59' : '#888580' }}>{m.discover_enabled ? '✓' : '—'}</td>
                <td style={{ padding: '11px 14px', fontFamily: "'DM Sans',sans-serif", fontWeight: 300, fontSize: 11, color: '#888580', whiteSpace: 'nowrap' }}>{fmtDate(m.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
