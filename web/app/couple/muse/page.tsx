'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

interface SavedVendor {
  id: string;
  vendor_id?: string;
  vendors?: { name?: string; category?: string };
  vendor_name?: string;
  category?: string;
}

function Shimmer({ h, br = 8, mb = 8 }: { h: number; br?: number; mb?: number }) {
  return (
    <div style={{
      height: h, borderRadius: br, marginBottom: mb,
      background: 'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      willChange: 'background-position',
      transform: 'translateZ(0)',
    }} />
  );
}

export default function CoupleMuse() {
  const [userId, setUserId] = useState<string | null>(null);
  const [saves, setSaves] = useState<SavedVendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session');
      if (!raw) { window.location.replace('/couple/pin-login'); return; }
      const s = JSON.parse(raw);
      if (!s?.id) { window.location.replace('/couple/pin-login'); return; }
      setUserId(s.id);

      fetch(`${API}/api/moodboard/${s.id}`)
        .then(r => r.json())
        .then(d => {
          setSaves(Array.isArray(d.data) ? d.data : Array.isArray(d) ? d : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } catch {
      window.location.replace('/couple/pin-login');
    }
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ background: '#F8F7F5', minHeight: '100dvh', padding: '24px 20px 0' }}>

        {/* Header */}
        <p style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
          letterSpacing: '0.25em', textTransform: 'uppercase',
          color: '#888580', margin: '0 0 6px',
        }}>YOUR MUSE</p>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300,
          color: '#111111', margin: '0 0 24px', lineHeight: 1.1,
        }}>Muse</h1>

        {/* DreamAi vibe card */}
        <div style={{
          background: '#FFFFFF', borderRadius: 12, padding: 20,
          marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start',
          borderBottom: '1px solid #E2DED8',
        }}>
          <Sparkles size={16} color="#C9A84C" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{
            fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 300,
            fontStyle: 'italic', color: '#888580', margin: 0, lineHeight: 1.5,
          }}>
            Your style is taking shape. Keep saving vendors to unlock your vibe summary.
          </p>
        </div>

        {/* Saved vendors */}
        <p style={{
          fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
          letterSpacing: '0.25em', textTransform: 'uppercase',
          color: '#888580', margin: '0 0 14px',
        }}>SAVED VENDORS</p>

        {loading ? (
          <>
            <Shimmer h={72} br={12} mb={8} />
            <Shimmer h={72} br={12} mb={8} />
            <Shimmer h={72} br={12} mb={8} />
          </>
        ) : saves.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300,
              fontStyle: 'italic', color: '#888580', margin: '0 0 8px',
            }}>Your saves will appear here.</p>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
              color: '#888580', margin: 0,
            }}>Swipe through Discovery to save vendors you love.</p>
          </div>
        ) : (
          saves.map(s => {
            const vname = s.vendors?.name || s.vendor_name || '—';
            const vcat = s.vendors?.category || s.category || '';
            return (
              <div key={s.id} style={{
                background: '#FFFFFF', borderRadius: 12, padding: 16,
                marginBottom: 8, borderBottom: '1px solid #E2DED8',
              }}>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400,
                  color: '#111111', margin: '0 0 4px',
                }}>{vname}</p>
                {vcat && (
                  <p style={{
                    fontFamily: "'Jost', sans-serif", fontSize: 9, fontWeight: 200,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    color: '#888580', margin: 0,
                  }}>{vcat}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
