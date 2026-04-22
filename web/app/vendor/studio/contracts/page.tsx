'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';

const BASE = 'https://dream-wedding-production-89ae.up.railway.app';
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');`;

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}

export default function VendorContractsPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const s = JSON.parse(raw);
      if (!s.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(s.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }
  }, []);

  const fetchContracts = useCallback(async (vid: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/contracts/${vid}`);
      const d = await r.json();
      if (d.success) setContracts((d.data || []).filter((c: any) => c.status === 'signed'));
      else if (Array.isArray(d)) setContracts(d.filter((c: any) => c.status === 'signed'));
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (vendorId) fetchContracts(vendorId); }, [vendorId, fetchContracts]);

  return (
    <>
      <style>{`
        ${FONTS}
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      <div style={{ minHeight:'100vh', background:'#F8F7F5', fontFamily:'DM Sans, sans-serif', paddingBottom:'calc(64px + env(safe-area-inset-bottom) + 24px)' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px 0' }}>
          <button
            onClick={() => router.back()}
            style={{ background:'none', border:'none', cursor:'pointer', padding:'4px 0', marginBottom:12, display:'flex', alignItems:'center', touchAction:'manipulation' }}
          >
            <ArrowLeft size={20} color="#111111" />
          </button>
          <div style={{ fontFamily:'Jost, sans-serif', fontWeight:200, fontSize:9, color:'#888580', letterSpacing:'0.25em', textTransform:'uppercase', marginBottom:4 }}>YOUR STUDIO</div>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontWeight:300, fontSize:28, color:'#111111', marginBottom:16 }}>Contracts</div>
        </div>

        {/* Tab — single SIGNED tab, gold underline */}
        <div style={{ padding:'0 20px', borderBottom:'1px solid #E2DED8', marginBottom:16 }}>
          <div style={{ display:'inline-block', paddingBottom:10, borderBottom:'2px solid #C9A84C' }}>
            <span style={{ fontFamily:'Jost, sans-serif', fontWeight:200, fontSize:10, color:'#111111', letterSpacing:'0.2em', textTransform:'uppercase' }}>SIGNED</span>
          </div>
        </div>

        {/* Note */}
        <div style={{ padding:'0 20px 16px' }}>
          <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:12, color:'#888580', fontStyle:'italic', fontWeight:300 }}>
            Contract templates are being prepared. Signed contracts from clients will appear here.
          </div>
        </div>

        {/* List */}
        <div style={{ padding:'0 20px' }}>
          {loading ? (
            [0,1,2].map(i => (
              <div key={i} style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:12, padding:16, marginBottom:10, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:16, height:16, borderRadius:4, background:'#F8F7F5', backgroundImage:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div style={{ height:14, width:'55%', borderRadius:4, background:'#F8F7F5', backgroundImage:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', marginBottom:6 }} />
                  <div style={{ height:11, width:'35%', borderRadius:4, background:'#F8F7F5', backgroundImage:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />
                </div>
              </div>
            ))
          ) : contracts.length === 0 ? (
            <div style={{ paddingTop:60, textAlign:'center', fontFamily:'Cormorant Garamond, serif', fontStyle:'italic', fontSize:18, color:'#888580', fontWeight:300 }}>
              No signed contracts yet.
            </div>
          ) : contracts.map(c => (
            <div key={c.id} style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:12, padding:16, marginBottom:10, display:'flex', alignItems:'center', gap:12 }}>
              <FileText size={16} color="#888580" style={{ flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:14, color:'#111111', fontWeight:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.title}</div>
                {c.client_name && <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:12, color:'#888580', fontWeight:300, marginTop:2 }}>{c.client_name}</div>}
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                {c.signed_at && <div style={{ fontFamily:'DM Sans, sans-serif', fontSize:11, color:'#888580', fontWeight:300 }}>{formatDate(c.signed_at)}</div>}
                {c.file_url && (
                  <button
                    onClick={() => window.open(c.file_url, '_blank')}
                    style={{ marginTop:6, background:'none', border:'none', cursor:'pointer', fontFamily:'Jost, sans-serif', fontWeight:200, fontSize:9, color:'#555250', letterSpacing:'0.15em', textTransform:'uppercase', padding:0, touchAction:'manipulation' }}
                  >
                    VIEW
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
