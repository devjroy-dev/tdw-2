'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';

const FALLBACK_SLIDES = [
  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1507504031003-b417219a0fde?w=1200&q=90&fit=crop',
];

type Screen = 'landing' | 'panel' | 'dreamer' | 'maker' | 'otp' | 'otp2' | 'request' | 'signin' | 'signin2';
type Role = 'Dreamer' | 'Maker';

const DREAMER_TAGLINE = "It's not just happily married. It's getting married happily.";
const MAKER_TAGLINE = "Behind every dream, there is a Maker.";

export default function Home() {
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [screen, setScreen] = useState<Screen>('landing');
  const [role, setRole] = useState<Role>('Dreamer');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<string[]>(FALLBACK_SLIDES);
  const [tagline, setTagline] = useState(DREAMER_TAGLINE);
  const [taglineVisible, setTaglineVisible] = useState(true);
  const [panelUp, setPanelUp] = useState(false);
  const [creamVisible, setCreamVisible] = useState(false);
  const [desatOpacity, setDesatOpacity] = useState(0);
  const [washY, setWashY] = useState(100);
  const [washOpacity, setWashOpacity] = useState(0);
  const [creamOpacity, setCreamOpacity] = useState(0);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['','','','','','']);
  const [instagram, setInstagram] = useState('');
  const [requestDone, setRequestDone] = useState(false);
  const [toast, setToast] = useState('');

  const startCarousel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentSlide(s => (s + 1) % slides.length);
    }, 2500);
  }, [slides.length]);

  useEffect(() => {
    fetch(`${BACKEND}/api/v2/cover-photos`)
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setSlides(d.photos.map((p: any) => p.image_url)); })
      .catch(() => {});
    startCarousel();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const triggerThreshold = useCallback((target: Screen) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDesatOpacity(0.8);
    setTimeout(() => {
      setWashY(0);
      setWashOpacity(1);
    }, 500);
    setTimeout(() => {
      setScreen(target);
      setCreamVisible(true);
    }, 1800);
    setTimeout(() => {
      setCreamOpacity(1);
    }, 1900);
  }, []);

  const reverseThreshold = useCallback(() => {
    setCreamOpacity(0);
    setTimeout(() => {
      setCreamVisible(false);
      setWashY(100);
      setWashOpacity(0);
    }, 200);
    setTimeout(() => {
      setDesatOpacity(0);
    }, 600);
    setTimeout(() => {
      startCarousel();
      setScreen(role === 'Dreamer' ? 'dreamer' : 'maker');
    }, 1800);
  }, [role, startCarousel]);

  const handleScreenTap = () => {
    if (screen === 'landing') {
      setPanelUp(true);
      setScreen('panel');
    }
  };

  const dismissPanel = () => {
    setPanelUp(false);
    setScreen('landing');
    setTagline(DREAMER_TAGLINE);
  };

  const selectRole = (r: Role) => {
    setRole(r);
    if (r === 'Maker') {
      setTaglineVisible(false);
      setTimeout(() => {
        setTagline(MAKER_TAGLINE);
        setTaglineVisible(true);
      }, 600);
    } else {
      setTagline(DREAMER_TAGLINE);
    }
    setScreen(r === 'Dreamer' ? 'dreamer' : 'maker');
  };

  const handleOtpInput = (i: number, val: string) => {
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const sendOtp = async () => {
    try {
      await fetch(`${BACKEND}/api/v2/couple/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, '') })
      });
      setScreen('otp2');
    } catch { showToast('Could not send code. Try again.'); }
  };

  const verifyOtp = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/v2/couple/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ''), code: otp.join('') })
      });
      const d = await res.json();
      if (d.success) {
        const key = role === 'Dreamer' ? 'couple_session' : 'vendor_session';
        localStorage.setItem(key, JSON.stringify(d.user));
        router.push(role === 'Dreamer' ? '/couple/today' : '/vendor/dashboard');
      } else showToast(d.error || 'Incorrect code.');
    } catch { showToast('Verification failed. Try again.'); }
  };

  const submitRequest = async () => {
    try {
      await fetch(`${BACKEND}/api/v2/waitlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, instagram, role })
      });
      setRequestDone(true);
    } catch { showToast('Could not submit. Try again.'); }
  };


  const dark = screen === 'landing' || screen === 'panel' || screen === 'dreamer' || screen === 'maker';

  const S: React.CSSProperties = { position: 'absolute', inset: 0 };
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const dur = '2.5s';

  return (
    <div style={{ ...S, overflow: 'hidden', background: '#0C0A09', fontFamily: 'sans-serif' }}
      onClick={screen === 'landing' ? handleScreenTap : undefined}>

      {/* SLIDES */}
      {slides.map((url, i) => (
        <div key={i} style={{
          ...S, backgroundImage: `url(${url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === currentSlide ? 1 : 0,
          transition: `opacity ${dur} ${ease}`,
          willChange: 'opacity', transform: 'translateZ(0)',
        }} />
      ))}

      {/* VIGNETTE */}
      <div style={{ ...S, zIndex: 2, background: 'radial-gradient(ellipse at 50% 60%, transparent 25%, rgba(0,0,0,0.55) 100%)', willChange: 'opacity', transform: 'translateZ(0)' }} />

      {/* BOTTOM GRADIENT */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%', zIndex: 3, background: 'linear-gradient(to top, rgba(6,4,2,0.95) 0%, rgba(6,4,2,0.5) 55%, transparent 100%)', willChange: 'opacity', transform: 'translateZ(0)' }} />

      {/* DESAT LAYER */}
      <div style={{ ...S, zIndex: 6, background: '#0C0A09', opacity: desatOpacity, transition: `opacity 0.7s ease`, willChange: 'opacity', transform: 'translateZ(0)', pointerEvents: 'none' }} />

      {/* WASH LAYER */}
      <div style={{ ...S, zIndex: 7, background: '#F8F7F5', opacity: washOpacity, transform: `translateZ(0) translateY(${washY}%)`, transition: `transform 1.5s ${ease}, opacity 0.6s ease`, willChange: 'transform, opacity', pointerEvents: 'none' }} />

      {/* TAGLINE — always visible, sits above panel */}
      {dark && (
        <div style={{
          position: 'absolute', bottom: 160, left: 0, right: 0,
          textAlign: 'center', padding: '0 32px', zIndex: 15,
          fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
          fontWeight: 300, fontSize: 16, color: '#C9A84C',
          letterSpacing: '0.04em', lineHeight: 1.6,
          opacity: taglineVisible ? 1 : 0,
          transition: `opacity 0.6s ease`,
          pointerEvents: 'none',
        }}>
          {tagline}
        </div>
      )}

      {/* PANEL — rises from bottom, never covers tagline */}
      {(screen === 'panel' || screen === 'dreamer' || screen === 'maker') && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
          background: 'rgba(8,6,4,0.88)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '20px 20px 0 0',
          padding: '28px 24px 48px',
          transform: panelUp ? 'translateY(0)' : 'translateY(100%)',
          transition: `transform ${dur} ${ease}`,
          willChange: 'transform', touchAction: 'manipulation',
        }}
          onClick={e => e.stopPropagation()}
        >
          {screen === 'panel' && (
            <>
              <p style={{ textAlign: 'center', fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 13, color: 'rgba(248,247,245,0.45)', letterSpacing: '0.06em', marginBottom: 16 }}>Are you a</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => selectRole('Dreamer')} style={{ flex: 1, padding: '14px 0', background: '#C9A84C', border: 'none', color: '#0C0A09', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', touchAction: 'manipulation' }}>Dreamer</button>
                <button onClick={() => selectRole('Maker')} style={{ flex: 1, padding: '14px 0', background: 'transparent', border: '0.5px solid rgba(248,247,245,0.25)', color: '#F8F7F5', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', touchAction: 'manipulation' }}>Maker</button>
              </div>
              <button onClick={dismissPanel} style={{ display: 'block', margin: '16px auto 0', background: 'none', border: 'none', color: 'rgba(248,247,245,0.3)', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>← Back</button>
            </>
          )}

          {(screen === 'dreamer' || screen === 'maker') && (
            <>
              <button onClick={() => setScreen('panel')} style={{ background: 'none', border: 'none', color: 'rgba(248,247,245,0.6)', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 18, cursor: 'pointer', marginBottom: 12, touchAction: 'manipulation' }}>←</button>
              <p style={{ textAlign: 'center', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7.5, color: 'rgba(201,168,76,0.75)', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 8 }}>{role}</p>
              <div style={{ width: 22, height: 0.5, background: '#C9A84C', opacity: 0.4, margin: '0 auto 18px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => triggerThreshold('otp')} style={{ width: '100%', padding: '13px 0', background: '#C9A84C', border: 'none', color: '#0C0A09', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', touchAction: 'manipulation' }}>I have an invite</button>
                <button onClick={() => triggerThreshold('request')} style={{ width: '100%', padding: '13px 0', background: 'transparent', border: '0.5px solid rgba(248,247,245,0.28)', color: '#F8F7F5', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', touchAction: 'manipulation' }}>Request an invite</button>
                <button onClick={() => triggerThreshold('signin')} style={{ width: '100%', padding: '8px 0', background: 'transparent', border: 'none', color: 'rgba(248,247,245,0.38)', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer', touchAction: 'manipulation' }}>Already a member — Sign in</button>
              </div>
            </>
          )}
        </div>
      )}


      {/* CREAM SCREENS */}
      {creamVisible && (
        <div style={{ ...S, zIndex: 30, background: '#F8F7F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '44px 26px 36px', opacity: creamOpacity, transform: creamOpacity === 1 ? 'translateY(0)' : 'translateY(8px)', transition: `opacity 0.6s ${ease}, transform 0.6s ${ease}` }}>
          <button onClick={reverseThreshold} style={{ position: 'absolute', top: 32, left: 18, background: 'none', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 20, color: '#888580', cursor: 'pointer', touchAction: 'manipulation' }}>←</button>

          {/* HEADER */}
          <p style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: '#111111', letterSpacing: '0.1em', marginBottom: 3, textAlign: 'center' }}>The Dream Wedding</p>
          <p style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontWeight: 300, fontSize: 13, color: '#888580', letterSpacing: '0.04em', marginBottom: 7, textAlign: 'center' }}>{role === 'Dreamer' ? DREAMER_TAGLINE : MAKER_TAGLINE}</p>
          <p style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, color: '#C9A84C', letterSpacing: '0.26em', textTransform: 'uppercase', marginBottom: 7, textAlign: 'center' }}>The Curated Wedding OS</p>
          <div style={{ width: 18, height: 0.5, background: '#C9A84C', opacity: 0.4, marginBottom: 28 }} />

          {/* OTP PHONE */}
          {(screen === 'otp' || screen === 'signin') && (
            <>
              <p style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>{screen === 'signin' ? 'Welcome back.' : 'Welcome. Let\'s begin.'}</p>
              <p style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>Enter your number. We'll send a code.</p>
              <div style={{ width: '100%', marginBottom: 18 }}>
                <span style={{ display: 'block', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 7 }}>Phone number</span>
                <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" maxLength={14} placeholder="+91 00000 00000" style={{ width: '100%', border: 'none', borderBottom: '1px solid #E2DED8', background: 'transparent', outline: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#111111', padding: '7px 0' }} />
              </div>
              <button onClick={sendOtp} style={{ width: '100%', padding: '14px 0', background: '#111111', color: '#F8F7F5', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 12, touchAction: 'manipulation' }}>Send code</button>
            </>
          )}

          {/* OTP CODE */}
          {(screen === 'otp2' || screen === 'signin2') && (
            <>
              <p style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>Check your messages.</p>
              <p style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 24 }}>Enter the 6-digit code we sent you.</p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 28, justifyContent: 'center' }}>
                {otp.map((v, i) => (
                  <input key={i} ref={el => { otpRefs.current[i] = el; }} value={v} onChange={e => handleOtpInput(i, e.target.value)} onKeyDown={e => handleOtpKey(i, e)} type="tel" maxLength={1} style={{ width: 36, height: 44, border: 'none', borderBottom: '1.5px solid #E2DED8', background: 'transparent', outline: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 18, color: '#111111', textAlign: 'center' }} />
                ))}
              </div>
              <button onClick={verifyOtp} style={{ width: '100%', padding: '14px 0', background: '#111111', color: '#F8F7F5', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 12, touchAction: 'manipulation' }}>Verify</button>
              <button style={{ background: 'none', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#AAAAAA', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>Resend code</button>
            </>
          )}

          {/* REQUEST */}
          {screen === 'request' && (
            requestDone ? (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontWeight: 300, fontSize: 36, color: '#111111', marginBottom: 12 }}>Received.</p>
                <p style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11, color: '#888580', fontStyle: 'italic', lineHeight: 1.7 }}>We review every request personally.</p>
              </div>
            ) : (
              <>
                <p style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>Request an invite.</p>
                <p style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 24 }}>We're selective. We'll reach out.</p>
                <div style={{ width: '100%', marginBottom: 16 }}>
                  <span style={{ display: 'block', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 7 }}>Phone number</span>
                  <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+91 00000 00000" style={{ width: '100%', border: 'none', borderBottom: '1px solid #E2DED8', background: 'transparent', outline: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#111111', padding: '7px 0' }} />
                </div>
                <div style={{ width: '100%', marginBottom: 24 }}>
                  <span style={{ display: 'block', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 7 }}>Instagram</span>
                  <input value={instagram} onChange={e => setInstagram(e.target.value)} type="text" placeholder="@yourhandle" style={{ width: '100%', border: 'none', borderBottom: '1px solid #E2DED8', background: 'transparent', outline: 'none', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#111111', padding: '7px 0' }} />
                </div>
                <button onClick={submitRequest} style={{ width: '100%', padding: '14px 0', background: '#111111', color: '#F8F7F5', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 10, touchAction: 'manipulation' }}>Submit</button>
                <p style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 10, color: '#AAAAAA', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.7 }}>We review every request personally.</p>
              </>
            )
          )}
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#FFFFFF', border: '0.5px solid #E2DED8', padding: '10px 20px', zIndex: 50, fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580', whiteSpace: 'nowrap', borderRadius: 4 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
