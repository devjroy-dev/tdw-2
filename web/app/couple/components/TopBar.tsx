'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, LogOut } from 'lucide-react';
import { useCoupleMode, type CoupleAppMode } from '../layout';

function getInitials(name?: string): string {
  if (!name) return 'D';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function CoupleTopBar() {
  const { mode, setMode } = useCoupleMode();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [name, setName] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session') || localStorage.getItem('couple_web_session');
      if (raw) {
        const s = JSON.parse(raw);
        const n = s?.name || s?.dreamer_name || s?.vendorName || '';
        if (n) setName(n);
      }
    } catch {}
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const isPlan = mode === 'PLAN';

  // Navigation only — setMode is handled by layout.tsx pathname useEffect
  const handleToggle = (m: CoupleAppMode) => {
    localStorage.setItem('couple_app_mode', m);
    if (m === 'DISCOVER') {
      router.push('/couple/discover/hub');
    } else {
      router.push('/couple/today');
    }
  };

  const initials = getInitials(name);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes slideDown { from{opacity:0;transform:translateY(-40px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%',
          transform: 'translateX(-50%)',
          background: '#111111', color: '#F8F7F5',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
          padding: '10px 16px', borderRadius: 8, zIndex: 400,
          animation: 'slideDown 280ms cubic-bezier(0.22,1,0.36,1)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>{toast}</div>
      )}

      {/* TopBar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 56,
        background: '#F8F7F5',
        borderBottom: '0.5px solid #E2DED8',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        boxSizing: 'border-box',
        willChange: 'transform',
      }}>
        {/* Wordmark */}
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 20, fontWeight: 300, letterSpacing: '0.04em', lineHeight: 1,
          color: '#111111',
        }}>TDW</span>

        {/* Toggle pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: 'rgba(17,17,17,0.06)',
          borderRadius: 20, padding: 3, gap: 0,
        }}>
          {(['PLAN', 'DISCOVER'] as CoupleAppMode[]).map(m => {
            const active = mode === m;
            return (
              <button key={m} onClick={() => handleToggle(m)} style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 10, fontWeight: 200, letterSpacing: '0.2em',
                textTransform: 'uppercase', padding: '6px 16px',
                borderRadius: 16, border: 'none', cursor: 'pointer',
                whiteSpace: 'nowrap', touchAction: 'manipulation',
                background: active ? '#111111' : 'transparent',
                color: active ? '#F8F7F5' : '#888580',
                transition: 'all 180ms cubic-bezier(0.22,1,0.36,1)',
              }}>{m}</button>
            );
          })}
        </div>

        {/* Profile circle */}
        <div onClick={() => setProfileOpen(true)} style={{
          width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
          touchAction: 'manipulation', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#111111',
          border: 'none',
        }}>
          <span style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 12, fontWeight: 300, color: '#F8F7F5', lineHeight: 1,
          }}>{initials}</span>
        </div>
      </header>

      {/* Profile sheet backdrop */}
      {profileOpen && (
        <div onClick={() => setProfileOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(17,17,17,0.4)',
          willChange: 'opacity',
        }} />
      )}

      {/* Profile sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: '#FFFFFF', borderRadius: '24px 24px 0 0',
        transform: profileOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
        willChange: 'transform',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Handle */}
        <div style={{
          width: 36, height: 4, background: '#E2DED8',
          borderRadius: 2, margin: '12px auto 20px', display: 'block',
        }} />

        {/* Profile row */}
        <div style={{ padding: '0 24px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: '#111111',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 16, fontWeight: 300, color: '#F8F7F5' }}>
              {initials}
            </span>
          </div>
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#111111', margin: '0 0 2px' }}>
              {name || 'Dreamer'}
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>
              Dreamer
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#E2DED8', margin: '0 24px' }} />

        {/* Settings row */}
        <div onClick={() => { showToast('Coming soon.'); setProfileOpen(false); }} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 24px', cursor: 'pointer', touchAction: 'manipulation',
        }}>
          <Settings size={18} color="#888580" strokeWidth={1.5} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111111' }}>
            Settings
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#E2DED8', margin: '0 24px' }} />

        {/* Sign out row */}
        <div onClick={() => {
          localStorage.removeItem('couple_session');
          localStorage.removeItem('couple_web_session');
          window.location.replace('/');
        }} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 24px', cursor: 'pointer', touchAction: 'manipulation',
        }}>
          <LogOut size={18} color="#888580" strokeWidth={1.5} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111111' }}>
            Sign out
          </span>
        </div>
      </div>
    </>
  );
}
