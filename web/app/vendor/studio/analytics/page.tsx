'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';

interface DailyEntry { date: string; impressions: number; profile_views: number; saves: number; enquiries: number; }
interface Totals { impressions: number; profile_views: number; saves: number; enquiries: number; lock_interests: number; }

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #F8F7F5 25%, #EEECE8 50%, #F8F7F5 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 8,
  willChange: 'transform',
  transform: 'translateZ(0)',
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyEntry[]>([]);
  const [totals, setTotals] = useState<Totals>({ impressions: 0, profile_views: 0, saves: 0, enquiries: 0, lock_interests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(parsed.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }
  }, []);

  const fetchAnalytics = useCallback(async (vid: string) => {
    try {
      const res = await fetch(`${BACKEND}/api/vendor-analytics/${vid}`);
      const json = await res.json();
      if (json.success) {
        if (Array.isArray(json.daily)) setDaily(json.daily);
        if (json.totals) setTotals(json.totals);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (vendorId) fetchAnalytics(vendorId);
  }, [vendorId, fetchAnalytics]);

  // Last 7 days for bar chart
  const last7 = () => {
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const match = daily.find(e => e.date?.startsWith(key));
      const dayLabel = d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3);
      result.push({ label: dayLabel, views: match?.profile_views || 0, isToday: i === 0 });
    }
    return result;
  };

  const bars = last7();
  const maxViews = Math.max(...bars.map(b => b.views), 1);
  const noData = bars.every(b => b.views === 0);

  const strengthItems = [
    { label: 'Profile active', done: !!vendorId },
    { label: 'Photos uploaded', done: false },
    { label: 'Bio written', done: false },
    { label: 'Pricing set', done: false },
  ];
  const strengthPct = strengthItems.filter(i => i.done).length * 25;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8F7F5; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F8F7F5', fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
        {/* Back */}
        <div style={{ padding: '16px 20px 0' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)' }}>
            <ArrowLeft size={20} strokeWidth={1.5} color="#111111" />
          </button>
        </div>

        {/* Header */}
        <div style={{ padding: '12px 20px 20px' }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR STUDIO</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 28, color: '#111111' }}>Analytics</h1>
        </div>

        {loading ? (
          <div style={{ padding: '0 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[1,2,3].map(i => <div key={i} style={{ ...shimmerStyle, height: 80 }} />)}
            </div>
            <div style={{ ...shimmerStyle, height: 120, marginBottom: 16 }} />
            <div style={{ ...shimmerStyle, height: 140, marginBottom: 16 }} />
          </div>
        ) : (
          <>
            {/* Metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '0 20px', marginBottom: 16 }}>
              {[
                { label: 'VIEWS', value: totals.profile_views },
                { label: 'SAVES', value: totals.saves },
                { label: 'ENQUIRIES', value: totals.enquiries },
              ].map(card => (
                <div key={card.label} style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 16, textAlign: 'center' }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 36, color: '#111111', lineHeight: 1 }}>{card.value || 0}</p>
                  <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.25em', marginTop: 4 }}>{card.label}</p>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 16, margin: '0 20px', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 16 }}>THIS WEEK</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 76 }}>
                {bars.map(bar => {
                  const h = noData ? 4 : Math.max(4, Math.round((bar.views / maxViews) * 60));
                  return (
                    <div key={bar.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: '100%', height: h, background: bar.isToday ? '#C9A84C' : '#E2DED8', borderRadius: 2, willChange: 'transform', transform: 'translateZ(0)', transition: 'height 0.4s cubic-bezier(0.22,1,0.36,1)' }} />
                      <span style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 8, color: '#888580' }}>{bar.label}</span>
                    </div>
                  );
                })}
              </div>
              {noData && <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#888580', textAlign: 'center', marginTop: 8 }}>No activity yet</p>}
            </div>

            {/* Profile strength */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 16, margin: '0 20px', marginBottom: 16 }}>
              <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 12 }}>PROFILE STRENGTH</p>
              <div style={{ height: 4, background: '#E2DED8', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${strengthPct}%`, background: '#111111', borderRadius: 2, willChange: 'transform', transform: 'translateZ(0)', transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)' }} />
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#555250', marginBottom: 12 }}>{strengthPct}% complete</p>
              {strengthItems.map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: item.done ? '#111111' : '#C8C4BE', minWidth: 14 }}>{item.done ? '✓' : '–'}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: item.done ? '#111111' : '#888580' }}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Lock interests */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 16, margin: '0 20px' }}>
              <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 6 }}>LOCK DATE INTERESTS</p>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 28, color: '#111111' }}>{totals.lock_interests || 0}</p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
