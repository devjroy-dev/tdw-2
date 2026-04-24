'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

function fmtINR(n: number) { return '₹' + (n || 0).toLocaleString('en-IN'); }
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#111111', fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap' }}>{msg}</div>;
}

interface MoneyData {
  lock_date_revenue: number;
  appointment_revenue: number;
  subscription_revenue_fy: number;
  this_month: number;
  monthly_chart: { month: string; revenue: number }[];
  subscriptions_by_tier: { essential: number; signature: number; prestige: number };
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: '20px 20px 18px' }}>
      <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, fontWeight: 300, color: '#111111', margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: 0 }}>{label}</p>
      {sub && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 11, fontWeight: 300, color: '#C9A84C', margin: '6px 0 0' }}>{sub}</p>}
    </div>
  );
}

export default function MoneyPage() {
  const [data, setData] = useState<MoneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetch(`${API}/api/v3/admin/money/overview`, { headers: H })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function exportCSV() {
    if (!data) return;
    const rows = [
      ['Source', 'Amount'],
      ['Lock Date Revenue', data.lock_date_revenue],
      ['Appointment Revenue', data.appointment_revenue],
      ['Subscription Revenue (FY)', data.subscription_revenue_fy],
      ['This Month', data.this_month],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `tdw-revenue-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setToast('Revenue exported');
  }

  const maxRevenue = data?.monthly_chart ? Math.max(...data.monthly_chart.map(m => m.revenue), 1) : 1;

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>Admin</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 32, color: '#111111', margin: 0 }}>Money & Revenue</p>
          <button onClick={exportCSV} style={{ height: 36, padding: '0 16px', background: 'transparent', border: '1px solid #E2DED8', borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555250', cursor: 'pointer' }}>↓ Export CSV</button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 90, borderRadius: 14, background: 'linear-gradient(90deg,#F0EEE8 25%,#E8E5DF 50%,#F0EEE8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />)}
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
            <StatCard label="This Month" value={fmtINR(data?.this_month || 0)} />
            <StatCard label="Subscription Revenue FY" value={fmtINR(data?.subscription_revenue_fy || 0)} />
            <StatCard label="Lock Date Holds" value={fmtINR(data?.lock_date_revenue || 0)} sub="Held in escrow" />
            <StatCard label="Appointment Revenue" value={fmtINR(data?.appointment_revenue || 0)} sub="Couture platform share" />
          </div>

          {/* Subscription breakdown */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, color: '#111111', margin: '0 0 16px' }}>Subscriptions by Tier</p>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { tier: 'Essential', count: data?.subscriptions_by_tier?.essential || 0, color: '#888580', bg: '#F4F1EC' },
                { tier: 'Signature', count: data?.subscriptions_by_tier?.signature || 0, color: '#C9A84C', bg: 'rgba(201,168,76,0.1)' },
                { tier: 'Prestige', count: data?.subscriptions_by_tier?.prestige || 0, color: '#111111', bg: '#111' },
              ].map((t, i) => (
                <div key={t.tier} style={{ flex: 1, padding: '14px 16px', background: t.bg, borderRadius: i === 0 ? '10px 0 0 10px' : i === 2 ? '0 10px 10px 0' : 0, borderRight: i < 2 ? '1px solid #E2DED8' : 'none' }}>
                  <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: i === 2 ? '#F8F7F5' : '#111', margin: '0 0 4px' }}>{t.count}</p>
                  <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.15em', textTransform: 'uppercase', color: i === 2 ? 'rgba(248,247,245,0.6)' : t.color, margin: 0 }}>{t.tier}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly chart */}
          {data?.monthly_chart && data.monthly_chart.length > 0 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: 20 }}>
              <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, color: '#111111', margin: '0 0 20px' }}>Monthly Revenue — Last 12 Months</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, overflowX: 'auto', paddingBottom: 8 }}>
                {data.monthly_chart.map((m, i) => {
                  const pct = (m.revenue / maxRevenue) * 100;
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 36 }}>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 9, fontWeight: 300, color: '#888580', margin: 0, whiteSpace: 'nowrap' }}>{m.revenue > 0 ? fmtINR(m.revenue) : ''}</p>
                      <div style={{ width: '100%', maxWidth: 32, background: pct > 0 ? '#C9A84C' : '#F0EEE8', borderRadius: '4px 4px 0 0', height: `${Math.max(pct, 4)}%`, transition: 'height 600ms cubic-bezier(0.22,1,0.36,1)', minHeight: 4 }} />
                      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 7, fontWeight: 200, letterSpacing: '0.1em', color: '#888580', margin: 0, whiteSpace: 'nowrap' }}>{m.month}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
