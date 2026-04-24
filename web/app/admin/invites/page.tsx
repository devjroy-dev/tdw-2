'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const PWD = 'Mira@2551354';

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`;

const h = { 'Content-Type': 'application/json', 'x-admin-password': PWD };

type Code = { id: string; code: string; role: string; tier: string; used: boolean; used_at: string | null; created_at: string; expires_at: string | null };
type Filter = 'all' | 'unused' | 'used' | 'expired';

const pill = (label: string, color: string, bg: string) => (
  <span style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase' as const, color, background: bg, padding: '3px 8px', borderRadius: 20 }}>{label}</span>
);

function codeStatus(c: Code): 'used' | 'expired' | 'unused' {
  if (c.used) return 'used';
  if (c.expires_at && new Date(c.expires_at) < new Date()) return 'expired';
  return 'unused';
}

export default function AdminInvitesPage() {
  const [codes, setCodes] = useState<Code[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'vendor' | 'dreamer'>('vendor');
  const [tier, setTier] = useState('signature');
  const [expires, setExpires] = useState('');
  const [generated, setGenerated] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/admin/invites`, { headers: h });
      const d = await r.json();
      setCodes(Array.isArray(d) ? d : d.codes || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setTier(role === 'vendor' ? 'signature' : 'basic'); }, [role]);

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await fetch(`${API}/api/v2/admin/invites/generate`, {
        method: 'POST', headers: h,
        body: JSON.stringify({ role, tier, expires_at: expires || null }),
      });
      const d = await r.json();
      if (d.code) { setGenerated(d.code); load(); }
    } finally { setGenerating(false); }
  };

  const revoke = async (id: string) => {
    if (!confirm('Revoke this invite code?')) return;
    await fetch(`${API}/api/v2/admin/invites/${id}`, { method: 'DELETE', headers: h });
    showToast('Code revoked.');
    load();
  };

  const copy = () => {
    navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const vendorTiers = ['essential', 'signature', 'prestige'];
  const dreamerTiers = ['basic', 'gold', 'platinum'];
  const tiers = role === 'vendor' ? vendorTiers : dreamerTiers;

  const filtered = codes.filter(c => {
    const s = codeStatus(c);
    if (filter === 'all') return true;
    return s === filter;
  });

  const lbl: React.CSSProperties = { fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, color: '#555250', letterSpacing: '0.22em', textTransform: 'uppercase', display: 'block', marginBottom: 4 };
  const chip = (active: boolean, onClick: () => void, label: string) => (
    <button onClick={onClick} style={{ border: `0.5px solid ${active ? '#C9A84C' : '#E2DED8'}`, background: active ? 'rgba(201,168,76,0.08)' : 'transparent', color: active ? '#C9A84C' : '#555250', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '5px 14px', borderRadius: 20, cursor: 'pointer' }}>{label}</button>
  );

  return (
    <>
      <style>{fonts}</style>
      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#111111', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, padding: '10px 20px', borderRadius: 4, zIndex: 9999 }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#555250', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>Vendors + Dreamers</div>
        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111' }}>Invite Codes</div>
      </div>

      {/* Generate card */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, padding: '24px', marginBottom: 32, maxWidth: 480 }}>
        <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#111111', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 20 }}>Generate Code</div>

        <label style={lbl}>Role</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['vendor', 'dreamer'] as const).map(r => (
            <button key={r} onClick={() => setRole(r)} style={{ padding: '7px 18px', border: `0.5px solid ${role === r ? '#C9A84C' : '#E2DED8'}`, background: role === r ? '#111111' : 'transparent', color: role === r ? '#F8F7F5' : '#555250', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', borderRadius: 3, cursor: 'pointer' }}>{r === 'vendor' ? 'Maker' : 'Dreamer'}</button>
          ))}
        </div>

        <label style={lbl}>Tier</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {tiers.map(t => (
            <button key={t} onClick={() => setTier(t)} style={{ padding: '7px 14px', border: `0.5px solid ${tier === t ? '#C9A84C' : '#E2DED8'}`, background: tier === t ? '#111111' : 'transparent', color: tier === t ? '#F8F7F5' : '#555250', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', borderRadius: 3, cursor: 'pointer' }}>{t}</button>
          ))}
        </div>

        <label style={lbl}>Expiry Date (optional)</label>
        <input type="date" value={expires} onChange={e => setExpires(e.target.value)} style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', outline: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#111111', padding: '6px 0', marginBottom: 20 }} />

        <button onClick={generate} disabled={generating} style={{ width: '100%', background: '#111111', color: '#111111', border: 'none', padding: '14px 0', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 2 }}>
          {generating ? 'Generating…' : 'Generate Code'}
        </button>

        {generated && (
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 36, color: '#C9A84C', letterSpacing: '0.15em', marginBottom: 10 }}>{generated}</div>
            <button onClick={copy} style={{ background: 'none', border: '0.5px solid #E2DED8', padding: '6px 16px', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#555250', cursor: 'pointer', borderRadius: 20 }}>{copied ? 'Copied!' : 'Copy Code'}</button>
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'unused', 'used', 'expired'] as Filter[]).map(f => chip(filter === f, () => setFilter(f), f))}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ height: 44, background: '#FFFFFF', borderRadius: 4, border: '1px solid #E2DED8', animation: 'shimmer 1.5s infinite', backgroundImage: 'linear-gradient(90deg, #F8F7F5 25%, #F0EEE8 50%, #F8F7F5 75%)', backgroundSize: '200% 100%' }} />)}
          <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Code', 'Role', 'Tier', 'Status', 'Created', 'Expires', ''].map(col => (
                  <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#555250', letterSpacing: '0.22em', textTransform: 'uppercase' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#555250' }}>Every code here is a door someone will walk through.</td></tr>
              )}
              {filtered.map(c => {
                const s = codeStatus(c);
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid #F0EEE8' }}>
                    <td style={{ padding: '10px 14px', fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 18, color: '#C9A84C', letterSpacing: '0.12em' }}>{c.code}</td>
                    <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#111111', textTransform: 'capitalize' }}>{c.role === 'vendor' ? 'Maker' : 'Dreamer'}</td>
                    <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#111111', textTransform: 'capitalize' }}>{c.tier || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {s === 'unused' && pill('Unused', '#2A7A4B', '#E8F5EE')}
                      {s === 'used' && pill('Used', '#555250', '#F0EEE8')}
                      {s === 'expired' && pill('Expired', '#C0392B', '#FFF0EE')}
                    </td>
                    <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11, color: '#555250' }}>{new Date(c.created_at).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11, color: '#555250' }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {s === 'unused' && (
                        <button onClick={() => revoke(c.id)} style={{ background: 'none', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#555250', cursor: 'pointer', textDecoration: 'underline' }}>Revoke</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
