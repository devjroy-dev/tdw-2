'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const PWD = 'Mira@2551354';
const h = { 'Content-Type': 'application/json', 'x-admin-password': PWD };

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;

type Vendor = { id: string; name: string; tier: string; dreamai_access: boolean; dreamai_monthly_limit: number; };

const TIER_DEFAULTS: Record<string, number> = { essential: 20, signature: 75, prestige: 500 };

export default function AdminDreamAiPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingLimit, setEditingLimit] = useState<string | null>(null);
  const [limitVal, setLimitVal] = useState('');
  const [toast, setToast] = useState('');

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

  const toggleAccess = async (id: string, access: boolean) => {
    await fetch(`${API}/api/v2/admin/vendors/${id}/dreamai`, { method: 'PATCH', headers: h, body: JSON.stringify({ access: !access }) });
    setVendors(v => v.map(x => x.id === id ? { ...x, dreamai_access: !access } : x));
  };

  const saveLimit = async (id: string) => {
    const limit = parseInt(limitVal);
    if (isNaN(limit) || limit < 0) return;
    await fetch(`${API}/api/v2/admin/vendors/${id}/dreamai-limit`, { method: 'PATCH', headers: h, body: JSON.stringify({ limit }) });
    setVendors(v => v.map(x => x.id === id ? { ...x, dreamai_monthly_limit: limit } : x));
    setEditingLimit(null);
    showToast('Limit updated.');
  };

  const resetUsage = async (id: string) => {
    await fetch(`${API}/api/v2/admin/vendors/${id}/dreamai-reset`, { method: 'PATCH', headers: h });
    showToast('Usage reset for this month.');
  };

  const pillBtn = (on: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ border: `0.5px solid ${on ? '#C9A84C' : '#E2DED8'}`, background: on ? 'rgba(201,168,76,0.08)' : 'transparent', color: on ? '#C9A84C' : '#888580', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase' as const, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>{on ? '● Enabled' : '○ Disabled'}</button>
  );

  return (
    <>
      <style>{fonts}</style>
      {toast && <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#F8F7F5', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, padding: '10px 20px', borderRadius: 4, zIndex: 9999 }}>{toast}</div>}

      <div style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>DreamAi</div>
        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111' }}>Access & Quotas</div>
        <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580', marginTop: 4 }}>
          Tier defaults — Essential: 20/mo · Signature: 75/mo · Prestige: 500/mo
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 52, background: '#FFFFFF', borderRadius: 4, border: '1px solid #E2DED8', backgroundImage: 'linear-gradient(90deg, #F8F7F5 25%, #F0EEE8 50%, #F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />)}
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Name', 'Tier', 'Access', 'Monthly Limit', 'Tier Default', 'Actions'].map(col => (
                  <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendors.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '40px 14px', textAlign: 'center', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580' }}>No Makers yet. Every conversation here will be a dream come true.</td></tr>
              )}
              {vendors.map(v => (
                <tr key={v.id} style={{ borderTop: '1px solid #F0EEE8' }}>
                  <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 13, color: '#111111' }}>{v.name || '—'}</td>
                  <td style={{ padding: '11px 14px', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: v.tier === 'prestige' ? '#111111' : v.tier === 'signature' ? '#C9A84C' : '#888580' }}>{v.tier}</td>
                  <td style={{ padding: '11px 14px' }}>{pillBtn(v.dreamai_access, () => toggleAccess(v.id, v.dreamai_access))}</td>
                  <td style={{ padding: '11px 14px' }}>
                    {editingLimit === v.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          autoFocus
                          type="number"
                          value={limitVal}
                          onChange={e => setLimitVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveLimit(v.id); if (e.key === 'Escape') setEditingLimit(null); }}
                          style={{ width: 70, background: 'transparent', border: 'none', borderBottom: '1px solid #C9A84C', outline: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#111111', padding: '2px 0' }}
                        />
                        <button onClick={() => saveLimit(v.id)} style={{ background: 'none', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A84C', cursor: 'pointer' }}>Save</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditingLimit(v.id); setLimitVal(String(v.dreamai_monthly_limit || TIER_DEFAULTS[v.tier] || 75)); }} style={{ background: 'none', border: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 13, color: '#111111', cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
                        {v.dreamai_monthly_limit || TIER_DEFAULTS[v.tier] || 75}
                      </button>
                    )}
                  </td>
                  <td style={{ padding: '11px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#888580' }}>{TIER_DEFAULTS[v.tier] || 75}/mo</td>
                  <td style={{ padding: '11px 14px' }}>
                    <button onClick={() => resetUsage(v.id)} style={{ background: 'none', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#888580', cursor: 'pointer', textDecoration: 'underline' }}>Reset</button>
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
