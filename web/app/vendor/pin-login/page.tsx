'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const GOLD = '#C9A84C';
const FALLBACK_SLIDES = [
  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1200&q=90&fit=crop',
];

export default function VendorPinLoginPage() {
  const router = useRouter();
  const [pin, setPin]           = useState(['', '', '', '']);
  const [shaking, setShaking]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState('');
  const [attempts, setAttempts] = useState(0);
  const [slide, setSlide]   = useState(1);
  const [name, setName]         = useState('');
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || '{}');
      if (!s?.pin_set) { router.replace('/'); return; }
      if (s?.name || s?.vendorName) setName(s.name || s.vendorName);
    } catch { router.replace('/'); return; }
    pinRefs.current[0]?.focus();
  }, []);

  // Fetch live cover photos
  const [slides, setSlides] = useState<string[]>(FALLBACK_SLIDES);
  useEffect(() => {
    fetch(API + '/api/v2/cover-photos')
      .then(r => r.json())
      .then(d => { if (d.photos?.length) { setSlides(d.photos.map((p: any) => p.image_url)); } })
      .catch(() => {});
    const t = setInterval(() => setSlide(p => (p + 1) % slides.length), 4500);
    return () => clearInterval(t);
  }, []);

  const verify = useCallback(async (pinStr: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || '{}');
      const r = await fetch(API + '/api/v2/auth/verify-pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.vendorId || session.id, pin: pinStr, role: 'vendor', phone: session.phone }),
      });
      const d = await r.json();
      if (d.success) {
        // Update session with real name and category from backend
        try {
          const existing = JSON.parse(localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || '{}');
          const updated = {
            ...existing,
            vendorId: d.userId || existing.vendorId || existing.id,
            id: d.userId || existing.id,
            userId: d.userId || existing.userId,
            vendorName: d.name || existing.vendorName || existing.name || '',
            name: d.name || existing.name || existing.vendorName || '',
            category: d.category || existing.category || '',
          };
          localStorage.setItem('vendor_web_session', JSON.stringify(updated));
          localStorage.setItem('vendor_session', JSON.stringify(updated));
          // Update displayed name immediately
          if (d.name) setName(d.name);
        } catch {}
        router.replace('/vendor/today');
      } else {
        const next = attempts + 1; setAttempts(next);
        setShaking(true); setTimeout(() => setShaking(false), 400);
        setPin(['', '', '', '']); pinRefs.current[0]?.focus();
        if (next >= 5) {
          showToast('Too many attempts.');
          setTimeout(() => { localStorage.removeItem('vendor_web_session'); localStorage.removeItem('vendor_session'); router.replace('/'); }, 1800);
        } else {
          showToast('Incorrect PIN. ' + (5 - next) + ' attempt' + (5 - next === 1 ? '' : 's') + ' left.');
        }
      }
    } catch { showToast('Network error. Try again.'); }
    finally { setLoading(false); }
  }, [loading, attempts, router]);

  const handleInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const v = val.slice(-1);
    setPin(prev => {
      const n = [...prev]; n[idx] = v;
      if (idx === 3 && v) setTimeout(() => verify([...n].join('')), 80);
      return n;
    });
    if (v && idx < 3) pinRefs.current[idx + 1]?.focus();
  };

  const handleBackspace = (idx: number, val: string) => {
    if (val === '' && idx > 0) {
      setPin(prev => { const n = [...prev]; n[idx - 1] = ''; return n; });
      pinRefs.current[idx - 1]?.focus();
    }
  };

  const inputStyle: React.CSSProperties = {
    width: 52, height: 62, background: 'transparent', border: 'none', outline: 'none',
    borderBottom: '2px solid ' + GOLD, fontFamily: "'DM Sans', sans-serif",
    fontWeight: 400, fontSize: 28, color: '#F8F7F5', textAlign: 'center',
    touchAction: 'manipulation', caretColor: GOLD,
  };

  const firstName = name?.split(' ')[0] || '';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; background: #0C0A09; }
        @keyframes pinFadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pinShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-32px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
        input[type=tel]::-webkit-outer-spin-button, input[type=tel]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      {toast && (
        <div style={{ position:'fixed',top:24,left:'50%',transform:'translateX(-50%)',background:'rgba(201,168,76,0.12)',backdropFilter:'blur(12px)',border:'0.5px solid rgba(201,168,76,0.3)',color:GOLD,fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:13,padding:'10px 20px',borderRadius:100,zIndex:9999,whiteSpace:'nowrap',animation:'slideDown 280ms cubic-bezier(0.22,1,0.36,1)' }}>{toast}</div>
      )}

      <div style={{ position:'fixed',inset:0,background:'#0C0A09',overflow:'hidden' }}>
        {slides.map((src, i) => (
          <div key={i} style={{ position:'absolute',inset:0,backgroundImage:'url(' + src + ')',backgroundSize:'cover',backgroundPosition:'center',opacity: i === slide ? 0.55 : 0,transition:'opacity 1200ms ease' }} />
        ))}
        <div style={{ position:'absolute',inset:0,background:'rgba(12,10,9,0.45)' }} />
        <div style={{ position:'absolute',bottom:0,left:0,right:0,animation:'pinFadeIn 400ms cubic-bezier(0.22,1,0.36,1)' }}>
          <div style={{ background:'rgba(12,10,9,0.3)',backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',borderTop:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'20px 20px 0 0',padding:'28px 32px calc(env(safe-area-inset-bottom, 16px) + 32px)' }}>
            <p style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontWeight:300,fontSize:15,color:'rgba(248,247,245,0.5)',margin:'0 0 2px' }}>The Dream Wedding</p>
            <p style={{ fontFamily:"'Jost',sans-serif",fontWeight:200,fontSize:6,letterSpacing:'0.32em',textTransform:'uppercase',color:GOLD,margin:'0 0 24px' }}>MAKER PORTAL</p>
            <p style={{ fontFamily:"'Cormorant Garamond',serif",fontWeight:300,fontSize:28,color:'#F8F7F5',margin:'0 0 4px',lineHeight:1.15 }}>
              {firstName ? 'Welcome back, ' + firstName + '.' : 'Welcome back.'}
            </p>
            <p style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:13,color:'rgba(248,247,245,0.4)',margin:'0 0 28px' }}>Enter your PIN to continue.</p>
            <div style={{ display:'flex',justifyContent:'center',gap:16,marginBottom:32,animation: shaking ? 'pinShake 320ms cubic-bezier(0.22,1,0.36,1)' : 'none' }}>
              {pin.map((d, i) => (
                <input key={i} ref={el => { pinRefs.current[i] = el; }}
                  type='tel' maxLength={1} value={d}
                  onChange={e => handleInput(i, e.target.value)}
                  onKeyDown={e => { if (e.key === 'Backspace') handleBackspace(i, d); }}
                  style={inputStyle} disabled={loading} />
              ))}
            </div>
            {loading && <p style={{ fontFamily:"'Jost',sans-serif",fontWeight:200,fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:GOLD,textAlign:'center',marginBottom:20 }}>Verifying…</p>}
            <p onClick={() => { localStorage.removeItem('vendor_web_session'); localStorage.removeItem('vendor_session'); router.replace('/'); }}
              style={{ fontFamily:"'Jost',sans-serif",fontWeight:200,fontSize:8,letterSpacing:'0.16em',textTransform:'uppercase',color:'rgba(248,247,245,0.25)',textAlign:'center',cursor:'pointer',touchAction:'manipulation' }}
            >Forgot PIN? Sign in again</p>
          </div>
        </div>
      </div>
    </>
  );
}