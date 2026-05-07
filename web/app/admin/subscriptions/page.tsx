'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'; }
function fmtINR(n: number) { return '₹' + (n || 0).toLocaleString('en-IN'); }

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#F8F7F5', fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap' }}>{msg}</div>;
}

interface Sub { id: string; vendor_id: string; vendor_name?: string; tier: string; amount: number; status: string; created_at: string; renewal_date?: string; }

const TIER_COLORS: Record<string, string> = { essential: '#888580', signature: '#C9A84C', prestige: '#111' };
const TIER_BG: Record<string, string> = { essential: '#F4F1EC', signature: 'rgba(201,168,76,0.1)', prestige: '#111' };
const TIER_TEXT: Record<string, string> = { essential: '#888580', signature: '#C9A84C', prestige: '#F8F7F5' };

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/v3/admin/makers`, { headers: H })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const active = (d.data || []).filter((m: any) => m.subscription_active).map((m: any) => ({
            id: m.id, vendor_id: m.id, vendor_name: m.name, tier: m.tier, amount: m.tier === 'prestige' ? 3999 : m.tier === 'signature' ? 1499 : 499, status: 'active', created_at: m.created_at,
          }));
          setSubs(active);
        }
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? subs : subs.filter(s => s.tier === filter);
  const totalMRR = subs.reduce((sum, s) => sum + (s.amount || 0), 0);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '4px 12px', border: 'none', borderRadius: 100, cursor: 'pointer',
    fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase',
    background: active ? '#111' : '#F4F1EC', color: active ? '#F8F7F5' : '#888580',
  });

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>Admin</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 32, color: '#111111', margin: 0 }}>Subscriptions</p>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 10, padding: '10px 16px', textAlign: 'right' }}>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 300, color: '#C9A84C', margin: '0 0 2px' }}>{fmtINR(totalMRR)}</p>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 7, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: 0 }}>Monthly Recurring</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['all','All'],['essential','Essential'],['signature','Signature'],['prestige','Prestige']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} style={chipStyle(filter === v)}>{l}</button>
        ))}
      </div>

      <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
          <thead>
            <tr style={{ background: '#F8F7F5' }}>
              {['Maker', 'Tier', 'Monthly Fee', 'Status', 'Since'].map(col => (
                <th key={col} style={{ padding: '10px 14px', textAlign: 'left', fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.2em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && [1,2,3,4].map(i => (
              <tr key={i}><td colSpan={5} style={{ padding: '12px 14px' }}><div style={{ height: 14, background: 'linear-gradient(90deg,#F0EEE8 25%,#E8E5DF 50%,#F0EEE8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', borderRadius: 4 }} /></td></tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 300, fontStyle: 'italic', color: '#888580' }}>No active subscriptions.</td></tr>
            )}
            {!loading && filtered.map(s => (
              <tr key={s.id} style={{ borderTop: '0.5px solid #E8E5DF' }}>
                <td style={{ padding: '11px 14px', fontFamily: "'DM Sans',sans-serif", fontWeight: 400, fontSize: 13, color: '#111111' }}>{s.vendor_name || '—'}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 100, background: TIER_BG[s.tier] || '#F4F1EC', color: TIER_TEXT[s.tier] || '#888580' }}>{s.tier}</span>
                </td>
                <td style={{ padding: '11px 14px', fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#C9A84C' }}>{fmtINR(s.amount)}/mo</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 100, background: 'rgba(74,124,89,0.1)', color: '#4A7C59' }}>Active</span>
                </td>
                <td style={{ padding: '11px 14px', fontFamily: "'DM Sans',sans-serif", fontSize: 12, color: '#888580', whiteSpace: 'nowrap' }}>{fmtDate(s.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
