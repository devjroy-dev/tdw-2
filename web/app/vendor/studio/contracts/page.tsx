'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X, FileText } from 'lucide-react';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';

interface Contract { id: string; title: string; status: string; client_name: string; signed_at: string; file_url: string; }

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #F8F7F5 25%, #EEECE8 50%, #F8F7F5 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 8,
  willChange: 'transform',
  transform: 'translateZ(0)',
};

export default function ContractsPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'template' | 'signed'>('template');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [contractTitle, setContractTitle] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(parsed.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }
  }, []);

  const fetchContracts = useCallback(async (vid: string) => {
    try {
      const res = await fetch(`${BACKEND}/api/contracts/${vid}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setContracts(json.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (vendorId) fetchContracts(vendorId);
  }, [vendorId, fetchContracts]);

  const templates = contracts.filter(c => c.status === 'template');
  const signed = contracts.filter(c => c.status === 'signed');

  const formatDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8F7F5; }
        input:focus { outline: none; }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%) translateZ(0)', background: '#111111', color: '#F8F7F5', fontFamily: "'DM Sans', sans-serif", fontSize: 12, borderRadius: 12, padding: '10px 16px', zIndex: 9999, willChange: 'transform' }}>
          {toast}
        </div>
      )}

      {sheetOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, willChange: 'opacity', transform: 'translateZ(0)' }} onClick={() => setSheetOpen(false)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#FFFFFF', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 22, color: '#111111' }}>Upload Template</p>
              <button onClick={() => setSheetOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation' }}><X size={18} color="#888580" /></button>
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 9, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>CONTRACT TITLE</p>
              <input
                type="text"
                value={contractTitle}
                onChange={e => setContractTitle(e.target.value)}
                style={{ width: '100%', fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: '#111111', background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8', paddingBottom: 8, fontWeight: 300 }}
              />
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#888580', marginBottom: 20 }}>Contract upload coming soon. Title will be saved.</p>
            <button
              onClick={() => { showToast('Coming soon.'); setSheetOpen(false); setContractTitle(''); }}
              style={{ width: '100%', background: '#111111', color: '#F8F7F5', border: 'none', borderRadius: 8, padding: '14px 0', fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 12, letterSpacing: '0.22em', cursor: 'pointer', touchAction: 'manipulation' }}
            >
              SAVE TEMPLATE
            </button>
          </div>
        </div>
      )}

      <div style={{ minHeight: '100vh', background: '#F8F7F5', fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
        <div style={{ padding: '16px 20px 0' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)' }}>
            <ArrowLeft size={20} strokeWidth={1.5} color="#111111" />
          </button>
        </div>

        <div style={{ padding: '12px 20px 16px' }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR STUDIO</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 28, color: '#111111' }}>Contracts</h1>
        </div>

        {/* Tab strip */}
        <div style={{ borderBottom: '1px solid #E2DED8', display: 'flex', padding: '0 20px', marginBottom: 16 }}>
          {(['template', 'signed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 0', marginRight: 24,
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 400,
                color: activeTab === tab ? '#111111' : '#888580',
                borderBottom: activeTab === tab ? '2px solid #C9A84C' : '2px solid transparent',
                marginBottom: -1,
                touchAction: 'manipulation',
                transition: 'color 0.2s cubic-bezier(0.22,1,0.36,1)',
                willChange: 'opacity',
                transform: 'translateZ(0)',
              }}
            >
              {tab === 'template' ? 'TEMPLATES' : 'SIGNED'}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 20px' }}>
          {loading ? (
            [1,2].map(i => <div key={i} style={{ ...shimmerStyle, height: 60, marginBottom: 8 }} />)
          ) : activeTab === 'template' ? (
            templates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: '#888580' }}>No templates yet.</p>
              </div>
            ) : (
              templates.map(c => (
                <div key={c.id} style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileText size={16} color="#888580" strokeWidth={1.5} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#111111', flex: 1 }}>{c.title}</span>
                  {c.file_url && (
                    <button onClick={() => window.open(c.file_url)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#555250', touchAction: 'manipulation' }}>VIEW</button>
                  )}
                </div>
              ))
            )
          ) : (
            signed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: '#888580' }}>No signed contracts yet.</p>
              </div>
            ) : (
              signed.map(c => (
                <div key={c.id} style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 16, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <FileText size={16} color="#888580" strokeWidth={1.5} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#111111', marginBottom: 2 }}>{c.title}</p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#555250' }}>{c.client_name}</p>
                  </div>
                  {c.signed_at && <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#888580' }}>{formatDate(c.signed_at)}</span>}
                </div>
              ))
            )
          )}
        </div>

        {/* FAB — templates tab only */}
        {activeTab === 'template' && (
          <button
            onClick={() => setSheetOpen(true)}
            style={{
              position: 'fixed',
              bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
              right: 20,
              width: 48, height: 48,
              borderRadius: '50%',
              background: '#111111',
              border: 'none',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              touchAction: 'manipulation',
              willChange: 'transform',
              transform: 'translateZ(0)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}
          >
            <Plus size={20} color="#F8F7F5" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </>
  );
}
