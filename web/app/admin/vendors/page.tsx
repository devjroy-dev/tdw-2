'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const PWD = 'Mira@2551354';
const h = { 'Content-Type': 'application/json', 'x-admin-password': PWD };

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;

type Vendor = { id: string; name: string; category: string; city: string; phone: string; tier: string; is_approved: boolean; dreamai_access: boolean; created_at: string; };
type Filter = 'all' | 'pending' | 'essential' | 'signature' | 'prestige';

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToast] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [form, setForm] = useState({ business_name: '', category: 'Photographer', city: '', phone: '', tier: 'signature' });
  const [creating, setCreating] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/admin/vendors`, { headers: h });
      const d = await r.json();
      setVendors(d.vendors || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    await fetch(`${API}/api/v2/admin/vendors/${id}/approve`, { method: 'PATCH', headers: h });
    setVendors(v => v.map(x => x.id === id ? { ...x, is_approved: !x.is_approved } : x));
  };

  const changeTier = async (id: string, tier: string) => {
    await fetch(`${API}/api/v2/admin/vendors/${id}/tier`, { method: 'PATCH', headers: h, body: JSON.stringify({ tier }) });
    setVendors(v => v.map(x => x.id === id ? { ...x, tier } : x));
    showToast('Tier updated.');
  };

  const toggleDreamAi = async (id: string, access: boolean) => {
    await fetch(`${API}/api/v2/admin/vendors/${id}/dreamai`, { method: 'PATCH', headers: h, body: JSON.stringify({ access: !access }) });
    setVendors(v => v.map(x => x.id === id ? { ...x, dreamai_access: !access } : x));
  };

  const revoke = async (id: string) => {
    await fetch(`${API}/api/v2/admin/vendors/${id}/revoke`, { method: 'PATCH', headers: h });
    setVendors(v => v.map(x => x.id === id ? { ...x, is_approved: false } : x));
    setConfirmRevoke(null);
    showToast('Access revoked.');
  };

  const create = async () => {
    if (!form.business_name || !form.phone) return;
    setCreating(true);
    try {
      const r = await fetch(`${API}/api/v2/admin/vendors/create`, { method: 'POST', headers: h, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.success) { setShowCreate(false); setForm({ business_name: '', category: 'Photographer', city: '', phone: '', tier: 'signature' }); load(); showToast('Maker created.'); }
      else showToast(d.error || 'Failed to create.');
    } finally { setCreating(false); }
  };

  const filtered = vendors.filter(v => {
    const matchSearch = !search || v.name?.toLowerCase().includes(search.toLowerCase()) || v.phone?.includes(search);
    const matchFilter = filter === 'all' ? true : filter === 'pending' ? !v.is_approved : v.tier === filter;
    return matchSearch && matchFilter;
  });

  const lbl: React.CSSProperties = { fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: 4 };
  const fld: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', outline: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#111111', padding: '6px 0', marginBottom: 14 };
  const pillBtn = (on: boolean, onClick: () => void, onLabel: string, offLabel: string) => (
    <button onClick={onClick} style={{ border: `0.5px solid ${on ? '#C9A84C' : '#E2DED8'}`, background: on ? 'rgba(201,168,76,0.08)' : 'transparent', color: on ? '#C9A84C' : '#888580', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>{on ? onLabel : offLabel}</button>
  );
  const filterChip = (f: Filter, label: string) => (
    <button key={f} onClick={() => setFilter(f)} style={{ border: `0.5px solid ${filter === f ? '#C9A84C' : '#E2DED8'}`, background: filter === f ? 'rgba(201,168,76,0.08)' : 'transparent', color: filter === f ? '#C9A84C' : '#888580', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 20, cursor: 'pointer' }}>{label}</button>
  );

  return (
    <>
      <style>{fonts}</style>
      {toast && <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#F8F7F5', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, padding: '10px 20px', borderRadius: 4, zIndex: 9999 }}>{toast}</div>}

      {/* Confirm modal */}
      {confirmRevoke && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, padding: 28, maxWidth: 360, width: '90%' }}>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 22, color: '#111111', marginBottom: 10 }}>Revoke access?</div>
            <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580', marginBottom: 24 }}>This will lock the Maker out of their dashboard immediately.</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => revoke(confirmRevoke)} style={{ background: '#111111', color: '#F8F7F5', border: 'none', padding: '11px 20px', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>Revoke</button>
              <button onClick={() => setConfirmRevoke(null)} style={{ background: 'none', border: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create sheet */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9997 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '8px 8px 0 0', padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 24, color: '#111111', marginBottom: 20 }}>Create Maker</div>
            <label style={lbl}>Business Name *</label>
            <input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} style={fld} />
            <label style={lbl}>Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ ...fld, cursor: 'pointer' }}>
              {['Photographer', 'MUA', 'Decorator', 'Caterer', 'Venue', 'Other'].map(c => <option key={c}>{c}</option>)}
            </select>
            <label style={lbl}>City</label>
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} style={fld} />
            <label style={lbl}>Phone *</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={fld} />
            <label style={lbl}>Tier</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['essential', 'signature', 'prestige'].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, tier: t }))} style={{ padding: '7px 14px', border: `0.5px solid ${form.tier === t ? '#C9A84C' : '#E2DED8'}`, background: form.tier === t ? '#111111' : 'transparent', color: form.tier === t ? '#F8F7F5' : '#888580', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', borderRadius: 3, cursor: 'pointer' }}>{t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={create} disabled={creating} style={{ flex: 1, background: '#111111', color: '#F8F7F5', border: 'none', padding: '14px 0', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>{creating ? 'Creating…' : 'Create Maker'}</button>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>Admin</div>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111' }}>Makers</div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ background: '#111111', color: '#F8F7F5', border: 'none', padding: '11px 20px', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>+ Create Maker</button>
      </div>

      {/* Search */}
      <input placeholder="Search makers…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', maxWidth: 340, background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', outline: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#111111', padding: '8px 0', marginBottom: 16 }} />

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {([['all', 'All'], ['pending', 'Pending'], ['essential', 'Essential'], ['signature', 'Signature'], ['prestige', 'Prestige']] as [Filter, string][]).map(([f, l]) => filterChip(f, l))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 52, background: '#FFFFFF', borderRadius: 4, border: '1px solid #E2DED8', backgroundImage: 'linear-gradient(90deg, #F8F7F5 25%, #F0EEE8 50%, #F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />)}
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Name', 'Category', 'City', 'Tier', 'Approved', 'DreamAi', 'Joined', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '40px 14px', textAlign: 'center', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580' }}>Every dream starts with a Maker who dares to show up.</td></tr>
              )}
              {filtered.map(v => (
                <tr key={v.id} style={{ borderTop: '1px solid #F0EEE8' }}>
                  <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 13, color: '#111111' }}>{v.name || '—'}</td>
                  <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#555250' }}>{v.category || '—'}</td>
                  <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#555250' }}>{v.city || '—'}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <select value={v.tier} onChange={e => changeTier(v.id, e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: v.tier === 'prestige' ? '#111111' : v.tier === 'signature' ? '#C9A84C' : '#888580', cursor: 'pointer' }}>
                      <option value="essential">Essential</option>
                      <option value="signature">Signature</option>
                      <option value="prestige">Prestige</option>
                    </select>
                  </td>
                  <td style={{ padding: '11px 14px' }}>{pillBtn(v.is_approved, () => approve(v.id), '● Approved', '○ Pending')}</td>
                  <td style={{ padding: '11px 14px' }}>{pillBtn(v.dreamai_access, () => toggleDreamAi(v.id, v.dreamai_access), '● On', '○ Off')}</td>
                  <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11, color: '#888580', whiteSpace: 'nowrap' }}>{new Date(v.created_at).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <a href={`https://vendor.thedreamwedding.in/vendor/dashboard?id=${v.id}`} target="_blank" rel="noreferrer" style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', textDecoration: 'underline' }}>View</a>
                      <button onClick={() => setConfirmRevoke(v.id)} style={{ background: 'none', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C0392B', cursor: 'pointer' }}>Revoke</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
