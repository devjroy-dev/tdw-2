'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeamPage() {
  const router = useRouter();
  const [toast, setToast] = useState(false);

  const showToast = () => {
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7F5', fontFamily: 'DM Sans, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@400;500&family=Jost:wght@200&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .toast { animation: fadeIn 0.3s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      {toast && (
        <div className="toast" style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%) translateZ(0)', background: '#111111', color: '#F8F7F5', fontFamily: 'DM Sans, sans-serif', fontSize: 13, padding: '10px 20px', borderRadius: 8, zIndex: 100, whiteSpace: 'nowrap', willChange: 'opacity, transform' }}>
          Coming soon.
        </div>
      )}

      <div style={{ padding: '56px 24px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR STUDIO</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 28, color: '#111111', lineHeight: 1.1 }}>Team</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 20, color: '#888580', textAlign: 'center', marginBottom: 10 }}>
          Your team will appear here.
        </div>
        <div style={{ fontSize: 12, color: '#888580', textAlign: 'center', marginBottom: 40 }}>
          Add photographers, assistants, and coordinators.
        </div>
        <button
          onClick={showToast}
          style={{ width: '100%', maxWidth: 360, background: '#111111', color: '#F8F7F5', border: 'none', borderRadius: 8, padding: '16px 24px', fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', touchAction: 'manipulation', willChange: 'opacity, transform', transform: 'translateZ(0)', transition: 'opacity 0.2s cubic-bezier(0.22,1,0.36,1)' }}
          onMouseDown={e => (e.currentTarget.style.opacity = '0.8')}
          onMouseUp={e => (e.currentTarget.style.opacity = '1')}
        >
          ADD TEAM MEMBER
        </button>
      </div>
    </div>
  );
}
