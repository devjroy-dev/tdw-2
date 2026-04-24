'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#111111', fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap' }}>{msg}</div>;
}

interface LinkStat { link_type: string; count: number; }

export default function DataToolsPage() {
  const [toast, setToast] = useState('');
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<any>(null);
  const [linkStats, setLinkStats] = useState<LinkStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showBackfillConfirm, setShowBackfillConfirm] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v3/admin/data/entity-link-stats`, { headers: H })
      .then(r => r.json()).then(d => { if (d.success) setLinkStats(d.data || []); setStatsLoading(false); }).catch(() => setStatsLoading(false));
  }, [backfillResult]);

  async function runBackfill() {
    setBackfilling(true); setShowBackfillConfirm(false);
    try {
      const r = await fetch(`${API}/api/v3/admin/data/backfill-all`, { method: 'POST', headers: H });
      const d = await r.json();
      if (d.success) { setBackfillResult(d); setToast(`✓ ${d.links_attempted} links across ${d.couples_processed} Dreamers`); }
      else setToast('Backfill failed');
    } catch { setToast('Network error'); } finally { setBackfilling(false); }
  }

  const totalLinks = linkStats.reduce((s, l) => s + l.count, 0);

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      {showBackfillConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 28, maxWidth: 380, width: '100%' }}>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 300, color: '#111111', margin: '0 0 12px' }}>Backfill Entity Links?</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: '0 0 24px', lineHeight: 1.6 }}>This will scan moodboard_items, vendor_enquiries, and couple_vendors for all Dreamers and create missing entity_links rows. Safe to run multiple times — uses ON CONFLICT DO NOTHING.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={runBackfill} style={{ flex: 1, height: 44, background: '#111111', color: '#111111', border: 'none', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer' }}>Run Backfill</button>
              <button onClick={() => setShowBackfillConfirm(false)} style={{ height: 44, padding: '0 20px', background: 'transparent', border: '1px solid #E2DED8', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, color: '#888580', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>Admin</p>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 32, color: '#111111', margin: 0 }}>Data Tools</p>
      </div>

      {/* Backfill card */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, color: '#111111', margin: '0 0 6px' }}>Entity Links Backfill</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: 0, lineHeight: 1.5 }}>Scans all Dreamer data and creates missing graph links. Safe to run anytime.</p>
            {backfillResult && (
              <div style={{ marginTop: 12, background: '#F8F7F5', borderRadius: 8, padding: '10px 14px' }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#4A7C59', margin: '0 0 2px' }}>✓ Last run complete</p>
                <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 200, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888580', margin: 0 }}>
                  {backfillResult.links_attempted} links · {backfillResult.couples_processed} Dreamers processed
                </p>
              </div>
            )}
          </div>
          <button onClick={() => setShowBackfillConfirm(true)} disabled={backfilling} style={{ height: 44, padding: '0 20px', background: '#111111', color: '#111111', border: 'none', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', opacity: backfilling ? 0.6 : 1, whiteSpace: 'nowrap' }}>
            {backfilling ? '⟳ Running...' : '⟳ Run Backfill'}
          </button>
        </div>
      </div>

      {/* Graph stats */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, color: '#111111', margin: '0 0 4px' }}>Graph Stats</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', margin: 0 }}>Live entity_links counts by type</p>
          </div>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: '#C9A84C', margin: 0 }}>{totalLinks.toLocaleString('en-IN')}</p>
        </div>

        {statsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1,2,3,4,5].map(i => <div key={i} style={{ height: 40, borderRadius: 8, background: 'linear-gradient(90deg,#F0EEE8 25%,#E8E5DF 50%,#F0EEE8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />)}
          </div>
        ) : linkStats.length === 0 ? (
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', fontStyle: 'italic' }}>No entity links yet. Run backfill to populate.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {linkStats.map(stat => {
              const pct = totalLinks > 0 ? (stat.count / totalLinks) * 100 : 0;
              return (
                <div key={stat.link_type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.1em', color: '#555250', margin: 0, width: 160, flexShrink: 0 }}>{stat.link_type}</p>
                  <div style={{ flex: 1, height: 6, background: '#F8F7F5', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#C9A84C', borderRadius: 3, transition: 'width 600ms cubic-bezier(0.22,1,0.36,1)' }} />
                  </div>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 400, color: '#111111', margin: 0, width: 40, textAlign: 'right', flexShrink: 0 }}>{stat.count}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
