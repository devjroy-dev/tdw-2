'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #F8F7F5 25%, #EEECE8 50%, #F8F7F5 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 8,
  willChange: 'transform',
  transform: 'translateZ(0)',
};

export default function ReferralsPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [loading, setLoading] = useState(true);
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

  const fetchReferrals = useCallback(async (vid: string) => {
    try {
      const [codeRes, statsRes] = await Promise.all([
        fetch(`${BACKEND}/api/referral-code/${vid}`),
        fetch(`${BACKEND}/api/referrals/stats/${vid}`),
      ]);
      const codeJson = await codeRes.json();
      const statsJson = await statsRes.json();
      if (codeJson.success && codeJson.data?.code) setCode(codeJson.data.code);
      if (statsJson.success && statsJson.data) {
        setTotalReferrals(statsJson.data.total_referrals || 0);
        setTotalEarned(statsJson.data.total_earned || 0);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (vendorId) fetchReferrals(vendorId);
  }, [vendorId, fetchReferrals]);

  const copyLink = async () => {
    const link = `https://thedreamwedding.in/r/${code || vendorId?.slice(0, 8).toUpperCase()}`;
    try {
      await navigator.clipboard.writeText(link);
      showToast('Link copied.');
    } catch {
      showToast('Could not copy link.');
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8F7F5; }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%) translateZ(0)', background: '#111111', color: '#F8F7F5', fontFamily: "'DM Sans', sans-serif", fontSize: 12, borderRadius: 12, padding: '10px 16px', zIndex: 9999, willChange: 'transform' }}>
          {toast}
        </div>
      )}

      <div style={{ minHeight: '100vh', background: '#F8F7F5', fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
        <div style={{ padding: '16px 20px 0' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)' }}>
            <ArrowLeft size={20} strokeWidth={1.5} color="#111111" />
          </button>
        </div>

        <div style={{ padding: '12px 20px 20px' }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR STUDIO</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 28, color: '#111111' }}>Referrals</h1>
        </div>

        <div style={{ padding: '0 20px' }}>
          {loading ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ ...shimmerStyle, height: 90 }} />
                <div style={{ ...shimmerStyle, height: 90 }} />
              </div>
              <div style={{ ...shimmerStyle, height: 100, marginBottom: 16 }} />
            </>
          ) : (
            <>
              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 36, color: '#111111', lineHeight: 1 }}>{totalReferrals}</p>
                  <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.25em', marginTop: 4 }}>REFERRALS</p>
                </div>
                <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 20, textAlign: 'center' }}>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 36, color: '#C9A84C', lineHeight: 1 }}>₹{totalEarned}</p>
                  <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.25em', marginTop: 4 }}>EARNED</p>
                </div>
              </div>

              {/* Referral code card */}
              <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 12 }}>
                <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 10 }}>YOUR REFERRAL CODE</p>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 32, color: '#111111', letterSpacing: '0.15em' }}>
                  {code || vendorId?.slice(0, 6).toUpperCase() || '------'}
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={copyLink}
                style={{ width: '100%', background: '#111111', color: '#F8F7F5', border: 'none', borderRadius: 8, padding: '14px 0', fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 9, letterSpacing: '0.22em', cursor: 'pointer', touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)', marginBottom: 16, transition: 'opacity 0.2s cubic-bezier(0.22,1,0.36,1)' }}
              >
                COPY REFERRAL LINK
              </button>

              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#888580', textAlign: 'center' }}>Earn when a vendor you refer joins TDW.</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
