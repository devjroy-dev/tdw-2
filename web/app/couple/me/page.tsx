'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Heart, Settings, LogOut, ChevronRight } from 'lucide-react';

function getInitials(name?: string): string {
  if (!name) return 'D';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function CoupleMe() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session');
      if (!raw) { window.location.replace('/couple/pin-login'); return; }
      const s = JSON.parse(raw);
      if (!s?.id) { window.location.replace('/couple/pin-login'); return; }
      if (s.name) setName(s.name);
    } catch {
      window.location.replace('/couple/pin-login');
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const initials = getInitials(name);

  const rows = [
    {
      Icon: Calendar,
      label: 'Wedding Details',
      action: () => showToast('Coming soon.'),
    },
    {
      Icon: Heart,
      label: 'My Muse',
      action: () => router.push('/couple/muse'),
    },
    {
      Icon: Settings,
      label: 'Settings',
      action: () => showToast('Coming soon.'),
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes slideDown { from{opacity:0;transform:translateY(-40px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
        * { box-sizing: border-box; }
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

      <div style={{
        background: '#F8F7F5', minHeight: '100dvh',
        padding: '32px 20px 0',
      }}>

        {/* Profile circle */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: '#111111',
          margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300,
            color: '#F8F7F5',
          }}>{initials}</span>
        </div>

        {/* Name */}
        <p style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 300,
          color: '#111111', textAlign: 'center', margin: '0 0 4px',
        }}>{name || 'Dreamer'}</p>

        {/* Role label */}
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
          color: '#888580', textAlign: 'center', margin: '0 0 32px',
        }}>Dreamer</p>

        {/* Settings card */}
        <div style={{
          background: '#FFFFFF', borderRadius: 12,
          border: '1px solid #E2DED8',
          overflow: 'hidden', marginBottom: 16,
        }}>
          {rows.map((row, i) => (
            <div
              key={row.label}
              onClick={row.action}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 20px', cursor: 'pointer', touchAction: 'manipulation',
                borderBottom: i < rows.length - 1 ? '1px solid #E2DED8' : 'none',
              }}
            >
              <row.Icon size={18} color="#888580" strokeWidth={1.5} />
              <span style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
                color: '#111111', flex: 1,
              }}>{row.label}</span>
              <ChevronRight size={16} color="#C8C4BE" strokeWidth={1.5} />
            </div>
          ))}
        </div>

        {/* Sign out row */}
        <div
          onClick={() => {
            localStorage.removeItem('couple_session');
            localStorage.removeItem('couple_web_session');
            window.location.replace('/');
          }}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 0', cursor: 'pointer', touchAction: 'manipulation',
          }}
        >
          <LogOut size={18} color="#888580" strokeWidth={1.5} />
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
            color: '#888580',
          }}>Sign out</span>
        </div>
      </div>
    </>
  );
}
