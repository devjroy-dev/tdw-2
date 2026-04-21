'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const PWD = 'Mira@2551354';
const h = { 'Content-Type': 'application/json', 'x-admin-password': PWD };

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;

type Couple = { id: string; name: string; phone: string; dreamer_type: string; wedding_date: string | null; created_at: string; };
type Filter = 'all' | 'basic' | 'gold' | 'platinum';

export default function AdminCouplesPage() {
  const [couples, setCouples] = useState<Couple[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToast] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', partner_name: '', wedding_date: '', tier: 'basic' });
  const [creating, setCreating] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/admin/couples`, { headers: h });
      const d = await r.json();
      setCouples(d.couples || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const changeTier = async (id: string, tier: string) => {
    await fetch(`${API}/api/v2/admin/couples/${id}/tier`, { method: 'PATCH', headers: h, body: JSON.stringify({ tier }) });
    setCouples(c => c.map(x => x.id === id ? { ...x, dreamer_type: tier } : x));
    showToast('Tier updated.');
  };

  const revoke = async (id: string) => {
    await fetch(`${API}/api/v2/admin/couples/${id}/revoke`, { method: 'PATCH', headers: h });
    setConfirmRevoke(null);
    showToast('Access revoked.');
    load();
  };

  const create = async () => {
    if (!form.name || !form.phone) return;
    setCreating(true);
    try {
      const r = await fetch(`${API}/api/v2/admin/couples/create`, { method: 'POST', headers: h, body: JSON.stringify(form) });
      const d = await r.json();
      if (d.success) { setShowCreate(false); setForm({ name: '', phone: '', partner_name: '', wedding_date: '', tier: 'basic' }); load(); showToast('Dreamer created.'); }
      else showToast(d.error || 'Failed.');
    } finally { setCreating(false); }
  };

  const filtered = couples.filter(c => {
    const matchS = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search);
    const matchF = filter === 'all' ? true : c.dreamer_type === filter;
    return matchS && matchF;
  });

  const lbl: React.CSSProperties = { fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: 4 };
  const fld: React.CSSProperties = { width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', outline: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#111111', padding: '6px 0', marginBottom: 14 };

  const tierColor = (t: string) => t === 'platinum' ? '#111111' : t === 'gold' ? '#C9A84C' : '#888580';

  return (
    <>
      <style>{fonts}</style>
      {toast && <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#F8F7F5', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, padding: '10px 20px', borderRadius: 4, zIndex: 9999 }}>{toast}</div>}

      {confirmRevoke && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, padding: 28, maxWidth: 360, width: '90%' }}>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 22, color: '#111111', marginBottom: 10 }}>Revoke access?</div>
            <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580', marginBottom: 24 }}>This will lock the Dreamer out of their account.</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => revoke(confirmRevoke)} style={{ background: '#111111', color: '#F8F7F5', border: 'none', padding: '11px 20px', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>Revoke</button>
              <button onClick={() => setConfirmRevoke(null)} style={{ background: 'none', border: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 9997 }}>
          <div style={{ background: '#FFFFFF', borderRadius: '8px 8px 0 0', padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 24, color: '#111111', marginBottom: 20 }}>Create Dreamer</div>
            <label style={lbl}>Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={fld} />
            <label style={lbl}>Phone *</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={fld} />
            <label style={lbl}>Partner Name</label>
            <input value={form.partner_name} onChange={e => setForm(f => ({ ...f, partner_name: e.target.value }))} style={fld} />
            <label style={lbl}>Wedding Date</label>
            <input type="date" value={form.wedding_date} onChange={e => setForm(f => ({ ...f, wedding_date: e.target.value }))} style={fld} />
            <label style={lbl}>Tier</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              {['basic', 'gold', 'platinum'].map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, tier: t }))} style={{ padding: '7px 14px', border: `0.5px solid ${form.tier === t ? '#C9A84C' : '#E2DED8'}`, background: form.tier === t ? '#111111' : 'transparent', color: form.tier === t ? '#F8F7F5' : '#888580', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', borderRadius: 3, cursor: 'pointer' }}>{t}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={create} disabled={creating} style={{ flex: 1, background: '#111111', color: '#F8F7F5', border: 'none', padding: '14px 0', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>{creating ? 'Creating…' : 'Create Dreamer'}</button>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>Admin</div>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111' }}>Dreamers</div>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ background: '#111111', color: '#F8F7F5', border: 'none', padding: '11px 20px', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>+ Create Dreamer</button>
      </div>

      <input placeholder="Search dreamers…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: '100%', maxWidth: 340, background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', outline: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#111111', padding: '8px 0', marginBottom: 16 }} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['all', 'basic', 'gold', 'platinum'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ border: `0.5px solid ${filter === f ? '#C9A84C' : '#E2DED8'}`, background: filter === f ? 'rgba(201,168,76,0.08)' : 'transparent', color: filter === f ? '#C9A84C' : '#888580', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 20, cursor: 'pointer' }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 52, background: '#FFFFFF', borderRadius: 4, border: '1px solid #E2DED8', backgroundImage: 'linear-gradient(90deg, #F8F7F5 25%, #F0EEE8 50%, #F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />)}
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Name', 'Phone', 'Tier', 'Wedding Date', 'Joined', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '40px 14px', textAlign: 'center', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580' }}>Every empty table is a dream yet to find its way here.</td></tr>
              )}
              {filtered.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid #F0EEE8' }}>
                  <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 13, color: '#111111' }}>{c.name || '—'}</td>
                  <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#555250' }}>{c.phone}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <select value={c.dreamer_type} onChange={e => changeTier(c.id, e.target.value)} style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: tierColor(c.dreamer_type), cursor: 'pointer' }}>
                      <option value="basic">Basic</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                    </select>
                  </td>
                  <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#555250' }}>{c.wedding_date ? new Date(c.wedding_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11, color: '#888580' }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <a href={`https://thedreamwedding.in/couple/today?id=${c.id}`} target="_blank" rel="noreferrer" style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', textDecoration: 'underline' }}>View</a>
                      <button onClick={() => setConfirmRevoke(c.id)} style={{ background: 'none', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C0392B', cursor: 'pointer' }}>Revoke</button>
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
