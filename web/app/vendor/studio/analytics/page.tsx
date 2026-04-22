'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';

function getSession() {
  try { const s = localStorage.getItem('vendor_web_session'); return s ? JSON.parse(s) : {}; }
  catch { return {}; }
}

const WEEK_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [discovery, setDiscovery] = useState<any>({});
  const todayIdx = (new Date().getDay() + 6) % 7; // Mon=0

  useEffect(() => {
    const { vendorId } = getSession();
    if (!vendorId) { setLoading(false); return; }
    fetch(`${BACKEND}/api/v2/vendor/today?vendorId=${vendorId}`)
      .then(r => r.json())
      .then(d => { setDiscovery(d.discovery || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const { vendorId } = getSession();
  const profilePct = vendorId ? 25 : 0;

  const metrics = [
    { label: 'VIEWS', value: discovery.views ?? 0, delta: discovery.viewsDelta ?? 0 },
    { label: 'SAVES', value: discovery.saves ?? 0, delta: discovery.savesDelta ?? 0 },
    { label: 'ENQUIRIES', value: discovery.enquiries ?? 0, delta: discovery.enquiriesDelta ?? 0 },
  ];

  const weekBars = discovery.weeklyViews || Array(7).fill(0);
  const maxBar = Math.max(...weekBars, 1);

  const deltaColor = (d: number) => d > 0 ? '#4A7C59' : d < 0 ? '#9B4545' : '#888580';
  const deltaText = (d: number) => d === 0 ? '—' : `${d > 0 ? '+' : ''}${d} this week`;

  const checks = [
    { label: 'Photos uploaded', done: !!vendorId },
    { label: 'Bio written', done: false },
    { label: 'Pricing set', done: false },
    { label: 'Services listed', done: false },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F5', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@400;500&family=Jost:wght@200&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .shimmer { background: linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%); background-size: 400% 100%; animation: shimmer 1.4s ease-in-out infinite; }
      `}</style>

      <div style={{ padding: '56px 24px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR STUDIO</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 28, color: '#111111', lineHeight: 1.1 }}>Analytics</div>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ padding: '32px 24px 0', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {metrics.map((m, i) => (
          <div key={i} style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {loading ? (
              <>
                <div className="shimmer" style={{ height: 36, width: '60%', borderRadius: 6, marginBottom: 6 }} />
                <div className="shimmer" style={{ height: 8, width: '80%', borderRadius: 4, marginBottom: 8 }} />
                <div className="shimmer" style={{ height: 11, width: '70%', borderRadius: 4 }} />
              </>
            ) : (
              <>
                <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 36, color: '#111111', lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '6px 0 8px' }}>{m.label}</div>
                <div style={{ fontSize: 11, color: deltaColor(m.delta) }}>{deltaText(m.delta)}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* This week bar chart */}
      <div style={{ padding: '32px 24px 0' }}>
        <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 20 }}>THIS WEEK</div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: '20px 16px' }}>
          {loading ? (
            <div className="shimmer" style={{ height: 80, borderRadius: 8 }} />
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
                {weekBars.map((v: number, i: number) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{
                      width: '100%', borderRadius: 3,
                      background: i === todayIdx ? '#C9A84C' : '#E2DED8',
                      height: Math.max(4, (v / maxBar) * 64),
                      willChange: 'transform', transform: 'translateZ(0)',
                      transition: 'height 0.4s cubic-bezier(0.22,1,0.36,1)'
                    }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                {WEEK_DAYS.map((d, i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 10, color: i === todayIdx ? '#111111' : '#888580' }}>{d}</div>
                ))}
              </div>
              {weekBars.every((v: number) => v === 0) && (
                <div style={{ fontSize: 12, color: '#888580', textAlign: 'center', marginTop: 12 }}>No data yet</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Profile strength */}
      <div style={{ padding: '32px 24px 48px' }}>
        <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 20 }}>PROFILE STRENGTH</div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: '20px 16px' }}>
          <div style={{ height: 4, background: '#E2DED8', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${profilePct}%`, background: '#111111', borderRadius: 2, willChange: 'transform', transform: 'translateZ(0)', transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
          </div>
          <div style={{ fontSize: 12, color: '#555250', marginBottom: 16 }}>{profilePct}% complete</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {checks.map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, color: c.done ? '#111111' : '#C8C4BE' }}>{c.done ? '✓' : '—'}</span>
                <span style={{ fontSize: 13, color: c.done ? '#111111' : '#888580' }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
