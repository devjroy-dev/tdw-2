'use client';
import { useEffect, useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const H = { 'Content-Type': 'application/json', 'x-admin-password': 'Mira@2551354' };

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#F8F7F5', fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: '10px 20px', borderRadius: 100, zIndex: 9999, whiteSpace: 'nowrap' }}>{msg}</div>;
}

interface HealthData { supabase: { ok: boolean; latency_ms: number }; twilio: { ok: boolean }; railway: { ok: boolean; timestamp: string }; }

function StatusDot({ ok }: { ok: boolean }) {
  return <div style={{ width: 10, height: 10, borderRadius: '50%', background: ok ? '#4A7C59' : '#9B4545', flexShrink: 0, boxShadow: ok ? '0 0 0 3px rgba(74,124,89,0.2)' : '0 0 0 3px rgba(155,69,69,0.2)' }} />;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [pinging, setPinging] = useState(false);
  const [lastChecked, setLastChecked] = useState<string>('');

  async function ping() {
    setPinging(true); setLoading(true);
    try {
      const r = await fetch(`${API}/api/v3/admin/system/health`, { headers: H });
      const d = await r.json();
      if (d.success) { setHealth(d.data); setLastChecked(new Date().toLocaleTimeString('en-IN')); }
    } catch { setToast('Health check failed'); } finally { setPinging(false); setLoading(false); }
  }

  useEffect(() => { ping(); }, []);

  const services = health ? [
    { name: 'Supabase Database', ok: health.supabase.ok, detail: health.supabase.ok ? `${health.supabase.latency_ms}ms latency` : 'Connection failed', icon: '◈' },
    { name: 'Railway API', ok: health.railway.ok, detail: health.railway.ok ? 'Running' : 'Down', icon: '⬡' },
    { name: 'Twilio WhatsApp', ok: health.twilio.ok, detail: health.twilio.ok ? 'Configured' : 'Not configured', icon: '💬' },
  ] : [];

  const allOk = health ? Object.values(health).every(v => (v as any).ok) : false;

  return (
    <>
      {toast && <Toast msg={toast} onDone={() => setToast('')} />}

      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: "'Jost',sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 4px' }}>Admin</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 32, color: '#111', margin: 0 }}>System Health</p>
          <button onClick={ping} disabled={pinging} style={{ height: 36, padding: '0 16px', background: '#111', color: '#F8F7F5', border: 'none', borderRadius: 8, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', opacity: pinging ? 0.6 : 1 }}>
            {pinging ? '⟳ Pinging...' : '⟳ Ping All'}
          </button>
        </div>
        {lastChecked && <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: '8px 0 0' }}>Last checked: {lastChecked}</p>}
      </div>

      {/* Overall status */}
      {!loading && health && (
        <div style={{ background: allOk ? 'rgba(74,124,89,0.08)' : 'rgba(155,69,69,0.08)', border: `1px solid ${allOk ? 'rgba(74,124,89,0.3)' : 'rgba(155,69,69,0.3)'}`, borderRadius: 14, padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: allOk ? '#4A7C59' : '#9B4545', boxShadow: allOk ? '0 0 0 4px rgba(74,124,89,0.25)' : '0 0 0 4px rgba(155,69,69,0.25)' }} />
          <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 300, color: allOk ? '#4A7C59' : '#9B4545', margin: 0 }}>
            {allOk ? 'All systems operational.' : 'Some services need attention.'}
          </p>
        </div>
      )}

      {/* Service cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 72, borderRadius: 14, background: 'linear-gradient(90deg,#EEECE8 25%,#F4F2EE 50%,#EEECE8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {services.map(svc => (
            <div key={svc.name} style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 18, opacity: 0.5, flexShrink: 0 }}>{svc.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 400, color: '#111', margin: '0 0 2px' }}>{svc.name}</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>{svc.detail}</p>
              </div>
              <StatusDot ok={svc.ok} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
