'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const PWD = 'Mira@2551354';
const h = { 'x-admin-password': PWD };

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; } @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;

type Revenue = {
  mrr: number;
  vendor_counts: { essential: number; signature: number; prestige: number };
  couple_counts: { basic: number; gold: number; platinum: number };
  recent_payments: { id: string; amount: number; payment_type: string; status: string; created_at: string; user_id?: string; vendor_id?: string }[];
  total_subs: number;
};

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN'); }

const shimmerCard = () => (
  <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, padding: '20px 24px', backgroundImage: 'linear-gradient(90deg, #F8F7F5 25%, #F0EEE8 50%, #F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', height: 80 }} />
);

export default function AdminRevenuePage() {
  const [data, setData] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/v2/admin/revenue`, { headers: h })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d); })
      .finally(() => setLoading(false));
  }, []);

  const statusPill = (s: string) => {
    const map: Record<string, [string, string]> = {
      paid: ['#2A7A4B', '#E8F5EE'],
      captured: ['#2A7A4B', '#E8F5EE'],
      failed: ['#C0392B', '#FFF0EE'],
      created: ['#555250', '#F0EEE8'],
      pending: ['#555250', '#F0EEE8'],
    };
    const [color, bg] = map[s] || ['#555250', '#F0EEE8'];
    return <span style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color, background: bg, padding: '3px 8px', borderRadius: 20 }}>{s}</span>;
  };

  const metricCard = (label: string, value: string) => (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, padding: '20px 24px' }}>
      <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', marginBottom: 4 }}>{value}</div>
      <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#555250', letterSpacing: '0.22em', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );

  const vc = data?.vendor_counts || { essential: 0, signature: 0, prestige: 0 };
  const cc = data?.couple_counts || { basic: 0, gold: 0, platinum: 0 };
  const vendorMRR = (vc.essential * 499) + (vc.signature * 1499) + (vc.prestige * 3999);

  return (
    <>
      <style>{fonts}</style>

      <div style={{ marginBottom: 36 }}>
        <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#C9A84C', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>Money</div>
        <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111' }}>Revenue</div>
      </div>

      {/* Hero metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {loading ? [1,2,3,4].map(i => <div key={i}>{shimmerCard()}</div>) : <>
          {metricCard('Monthly Recurring Revenue', fmt(data?.mrr || 0))}
          {metricCard('Active Maker Subscriptions', String(data?.total_subs || 0))}
          {metricCard('Gold + Platinum Dreamers', String((cc.gold || 0) + (cc.platinum || 0)))}
          {metricCard('Prestige Makers', String(vc.prestige || 0))}
        </>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Vendor subscription table */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2DED8' }}>
            <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#555250', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Maker Subscriptions</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Tier', 'Count', 'Unit Price', 'Monthly Revenue'].map(col => (
                  <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#555250', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? null : [
                { label: 'Essential', count: vc.essential, price: 499 },
                { label: 'Signature', count: vc.signature, price: 1499 },
                { label: 'Prestige', count: vc.prestige, price: 3999 },
              ].map(row => (
                <tr key={row.label} style={{ borderTop: '1px solid #F0EEE8' }}>
                  <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#111111' }}>{row.label}</td>
                  <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 13, color: '#111111' }}>{row.count}</td>
                  <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#555250' }}>{fmt(row.price)}/mo</td>
                  <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 13, color: '#111111' }}>{fmt(row.count * row.price)}</td>
                </tr>
              ))}
              {!loading && (
                <tr style={{ borderTop: '2px solid #E2DED8', background: 'rgba(201,168,76,0.04)' }}>
                  <td style={{ padding: '10px 14px', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A84C' }}>Total MRR</td>
                  <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 13, color: '#111111' }}>{vc.essential + vc.signature + vc.prestige}</td>
                  <td />
                  <td style={{ padding: '10px 14px', fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 20, color: '#C9A84C' }}>{fmt(vendorMRR)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Couple tier table */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2DED8' }}>
            <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#555250', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Dreamer Tiers</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8F7F5' }}>
                {['Tier', 'Count', 'Price', 'Revenue'].map(col => (
                  <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#555250', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? null : [
                { label: 'Basic', count: cc.basic, price: 0 },
                { label: 'Gold', count: cc.gold, price: 999 },
                { label: 'Platinum', count: cc.platinum, price: 2999 },
              ].map(row => (
                <tr key={row.label} style={{ borderTop: '1px solid #F0EEE8' }}>
                  <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#111111' }}>{row.label}</td>
                  <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 13, color: '#111111' }}>{row.count}</td>
                  <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#555250' }}>{row.price === 0 ? 'Free' : fmt(row.price) + ' once'}</td>
                  <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 13, color: '#111111' }}>{row.price === 0 ? '—' : fmt(row.count * row.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent payments */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2DED8' }}>
          <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9, color: '#555250', letterSpacing: '0.22em', textTransform: 'uppercase' }}>Recent Payments</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8F7F5' }}>
              {['Type', 'Amount', 'Status', 'Date'].map(col => (
                <th key={col} style={{ padding: '9px 14px', textAlign: 'left', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#555250', letterSpacing: '0.18em', textTransform: 'uppercase' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} style={{ padding: 20 }}><div style={{ height: 40, backgroundImage: 'linear-gradient(90deg, #F8F7F5 25%, #F0EEE8 50%, #F8F7F5 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} /></td></tr>}
            {!loading && (data?.recent_payments || []).length === 0 && (
              <tr><td colSpan={4} style={{ padding: '32px 14px', textAlign: 'center', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#555250' }}>The ledger begins with the first dream that paid for itself.</td></tr>
            )}
            {(data?.recent_payments || []).map(p => (
              <tr key={p.id} style={{ borderTop: '1px solid #F0EEE8' }}>
                <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#111111', textTransform: 'capitalize' }}>{(p.payment_type || 'unknown').replace(/_/g, ' ')}</td>
                <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 13, color: '#111111' }}>{fmt(p.amount / 100)}</td>
                <td style={{ padding: '10px 14px' }}>{statusPill(p.status)}</td>
                <td style={{ padding: '10px 14px', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11, color: '#555250' }}>{new Date(p.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
