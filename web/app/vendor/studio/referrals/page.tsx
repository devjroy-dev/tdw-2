'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function getSession() {
  try { const s = localStorage.getItem('vendor_web_session'); return s ? JSON.parse(s) : {}; }
  catch { return {}; }
}

export default function ReferralsPage() {
  const router = useRouter();
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const copyLink = () => {
    const { vendorId } = getSession();
    const url = `https://thedreamwedding.in/r/${vendorId || 'VENDORID'}`;
    navigator.clipboard.writeText(url)
      .then(() => showToast('Link copied.'))
      .catch(() => showToast('Link copied.'));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F5', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@400;500&family=Jost:wght@200&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .toast { animation: fadeIn 0.3s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      {toast && (
        <div className="toast" style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%) translateZ(0)', background: '#111111', color: '#F8F7F5', fontFamily: 'DM Sans, sans-serif', fontSize: 13, padding: '10px 20px', borderRadius: 8, zIndex: 100, whiteSpace: 'nowrap', willChange: 'opacity, transform' }}>
          {toast}
        </div>
      )}

      <div style={{ padding: '56px 24px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR STUDIO</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 28, color: '#111111', lineHeight: 1.1 }}>Referrals</div>
        </div>
      </div>

      <div style={{ padding: '32px 24px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 32, color: '#111111', lineHeight: 1 }}>0</div>
          <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase' }}>REFERRALS</div>
        </div>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 32, color: '#C9A84C', lineHeight: 1 }}>₹0</div>
          <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 8, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase' }}>EARNED</div>
        </div>
      </div>

      <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 16, color: '#888580' }}>
          Share your referral link to earn.
        </div>
      </div>

      <div style={{ padding: '32px 24px 48px' }}>
        <button
          onClick={copyLink}
          style={{ width: '100%', background: '#111111', color: '#F8F7F5', border: 'none', borderRadius: 8, padding: '16px 24px', fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', touchAction: 'manipulation', willChange: 'opacity, transform', transform: 'translateZ(0)', transition: 'opacity 0.2s cubic-bezier(0.22,1,0.36,1)' }}
          onMouseDown={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseUp={e => (e.currentTarget.style.opacity = '1')}
        >
          COPY REFERRAL LINK
        </button>
      </div>
    </div>
  );
}
