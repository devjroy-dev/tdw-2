'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ContractsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'templates' | 'signed'>('templates');
  const [toast, setToast] = useState(false);

  const showToast = () => {
    setToast(true);
    setTimeout(() => setToast(false), 3000);
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
          Coming soon.
        </div>
      )}

      <div style={{ padding: '56px 24px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)', display: 'flex', alignItems: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 15L7.5 10L12.5 5" stroke="#111111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div>
          <div style={{ fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR STUDIO</div>
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontWeight: 300, fontSize: 28, color: '#111111', lineHeight: 1.1 }}>Contracts</div>
        </div>
      </div>

      {/* Tab strip */}
      <div style={{ padding: '24px 24px 0', display: 'flex', gap: 24, borderBottom: '1px solid #E2DED8', marginTop: 8 }}>
        {(['templates', 'signed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', padding: '0 0 12px', cursor: 'pointer', touchAction: 'manipulation',
              fontFamily: 'DM Sans, sans-serif', fontSize: 12,
              color: tab === t ? '#111111' : '#888580',
              borderBottom: tab === t ? '2px solid #C9A84C' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.2s cubic-bezier(0.22,1,0.36,1)',
              willChange: 'opacity', transform: 'translateZ(0)',
            }}
          >
            {t === 'templates' ? 'TEMPLATES' : 'SIGNED'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '48px 24px' }}>
        {tab === 'templates' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 16, color: '#888580', textAlign: 'center' }}>
              No templates yet.
            </div>
            <button
              onClick={showToast}
              style={{ width: '100%', maxWidth: 360, background: '#111111', color: '#F8F7F5', border: 'none', borderRadius: 8, padding: '16px 24px', fontFamily: 'Jost, sans-serif', fontWeight: 200, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', touchAction: 'manipulation', willChange: 'opacity, transform', transform: 'translateZ(0)', transition: 'opacity 0.2s cubic-bezier(0.22,1,0.36,1)', marginTop: 16 }}
              onMouseDown={e => (e.currentTarget.style.opacity = '0.8')}
              onMouseUp={e => (e.currentTarget.style.opacity = '1')}
            >
              UPLOAD TEMPLATE
            </button>
          </div>
        ) : (
          <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 16, color: '#888580', textAlign: 'center' }}>
            No signed contracts yet.
          </div>
        )}
      </div>
    </div>
  );
}
