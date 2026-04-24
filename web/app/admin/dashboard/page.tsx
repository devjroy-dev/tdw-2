'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

function fmtINR(n: number) { return '₹' + n.toLocaleString('en-IN'); }
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000); const h = Math.floor(diff / 3600000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; if (h < 24) return `${h}h ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function Shimmer({ h: height, w = '100%', br = 8 }: { h: number; w?: string | number; br?: number }) {
  return <div style={{ height, width: w, borderRadius: br, background: 'linear-gradient(90deg,#EEECE8 25%,#F4F2EE 50%,#EEECE8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />;
}

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#F8F7F5', fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap' }}>{msg}</div>;
}

interface Counter { total: number; today_delta?: number; delta?: number; }
interface Activity { type: string; emoji: string; text: string; at: string; id: string; }
interface Data {
  counters: { dreamers: Counter; makers: Counter; enquiries_today: Counter; muse_saves_today: Counter };
  activity: Activity[];
}

function CounterCard({ label, value, delta }: { label: string; value: number; delta?: number }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: '20px 20px 18px', flex: 1, minWidth: 0 }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 42, fontWeight: 300, color: '#111', margin: '0 0 4px', lineHeight: 1 }}>{value.toLocaleString('en-IN')}</p>
      <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 8, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888580', margin: '0 0 8px' }}>{label}</p>
      {delta !== undefined && delta !== 0 && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 300, color: delta > 0 ? '#4A7C59' : '#9B4545', margin: 0 }}>
          {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} vs yesterday
        </p>
      )}
    </div>
  );
}

export default function CommandCentrePage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [backfilling, setBackfilling] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/v3/admin/command-centre`, { headers: H });
      const d = await r.json();
      if (d.success) setData(d);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  async function backfill() {
    setBackfilling(true);
    try {
      const r = await fetch(`${API}/api/v3/admin/data/backfill-all`, { method: 'POST', headers: H });
      const d = await r.json();
      if (d.success) setToast(`✓ ${d.links_attempted} links backfilled across ${d.couples_processed} Dreamers`);
      else setToast('Backfill failed');
    } catch { setToast('Network error'); } finally { setBackfilling(false); }
  }

  function exportReport() {
    const c = data?.counters;
    if (!c) return;
    const csv = [
      ['Metric', 'Value', 'Delta'],
      ['Total Dreamers', c.dreamers.total, c.dreamers.today_delta || 0],
      ['Total Makers', c.makers.total, 0],
      ['Enquiries Today', c.enquiries_today.total, c.enquiries_today.delta || 0],
      ['Muse Saves Today', c.muse_saves_today.total, c.muse_saves_today.delta || 0],
    ].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `tdw-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setToast('Report exported');
  }

  const activityColor: Record<string, string> = {
    new_dreamer: '#F0A500', new_maker: '#4A7C59', enquiry: '#555250',
    muse_save: '#C9A84C', flagged: '#9B4545',
  };

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>Admin</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 32, color: '#111', margin: 0 }}>Command Centre</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Counters */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
          {[1,2,3,4].map(i => <Shimmer key={i} h={90} br={14} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24 }}>
          <CounterCard label="Total Dreamers" value={data?.counters.dreamers.total || 0} delta={data?.counters.dreamers.today_delta} />
          <CounterCard label="Total Makers" value={data?.counters.makers.total || 0} />
          <CounterCard label="Enquiries Today" value={data?.counters.enquiries_today.total || 0} delta={data?.counters.enquiries_today.delta} />
          <CounterCard label="Muse Saves Today" value={data?.counters.muse_saves_today.total || 0} delta={data?.counters.muse_saves_today.delta} />
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={backfill} disabled={backfilling} style={{ height: 36, padding: '0 16px', background: '#111', color: '#F8F7F5', border: 'none', borderRadius: 8, fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', opacity: backfilling ? 0.6 : 1, whiteSpace: 'nowrap' }}>
          {backfilling ? '⟳ Backfilling...' : '⟳ Backfill Entity Links'}
        </button>
        <button onClick={exportReport} style={{ height: 36, padding: '0 16px', background: 'transparent', color: '#111', border: '1px solid #E2DED8', borderRadius: 8, fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          ↓ Export Today's Report
        </button>
        <button onClick={() => router.push('/admin/images')} style={{ height: 36, padding: '0 16px', background: 'transparent', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 8, fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          ⬡ Approve Images
        </button>
      </div>

      {/* Activity Feed */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#888580', margin: 0 }}>Activity — Last 24 Hours</p>
          <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Jost', sans-serif", fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#C9A84C' }}>Refresh</button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => <Shimmer key={i} h={44} br={10} />)}
          </div>
        ) : !data?.activity?.length ? (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 32, textAlign: 'center' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300, fontStyle: 'italic', color: '#888580', margin: 0 }}>Quiet so far today.</p>
          </div>
        ) : (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, overflow: 'hidden' }}>
            {data.activity.map((item, i) => (
              <div key={i} onClick={() => {
                if (item.type === 'new_dreamer') router.push(`/admin/dreamers/${item.id}`);
                else if (item.type === 'new_maker') router.push(`/admin/makers/${item.id}`);
                else if (item.type === 'flagged') router.push('/admin/messages');
              }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < data.activity.length - 1 ? '0.5px solid #F0EEE8' : 'none', cursor: 'pointer', transition: 'background 150ms' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FAFAF8'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{item.emoji}</span>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: item.type === 'flagged' ? '#9B4545' : '#111', margin: 0, flex: 1, lineHeight: 1.4 }}>{item.text}</p>
                <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 300, color: '#C8C4BE', flexShrink: 0 }}>{timeAgo(item.at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
