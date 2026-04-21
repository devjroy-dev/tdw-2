'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';

const FALLBACK_SLIDES = [
  { image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=90&fit=crop', photographer_name: 'ARTO SURAJ' },
  { image_url: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&q=90&fit=crop', photographer_name: 'ARTO SURAJ' },
  { image_url: 'https://images.unsplash.com/photo-1624553297544-2dbffd0bb028?w=1200&q=90&fit=crop', photographer_name: 'ARTO SURAJ' },
  { image_url: 'https://images.unsplash.com/photo-1617575521317-d6234aeb21e3?w=1200&q=90&fit=crop', photographer_name: 'ARTO SURAJ' },
  { image_url: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1200&q=90&fit=crop', photographer_name: 'iKshana Productions' },
];

type Screen = 'landing' | 'panel' | 'dreamer' | 'maker' | 'otp' | 'otp2' | 'request' | 'signin' | 'signin2';
type Role = 'Dreamer' | 'Maker';

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

export default function LandingPage() {
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const signin2Refs = useRef<(HTMLInputElement | null)[]>([]);

  const [slides, setSlides] = useState(FALLBACK_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [screen, setScreen] = useState<Screen>('landing');
  const [role, setRole] = useState<Role>('Dreamer');
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(false);

  const [taglineOpA, setTaglineOpA] = useState(1);
  const [taglineOpB, setTaglineOpB] = useState(0);
  const [activeTagline, setActiveTagline] = useState<'a' | 'b'>('a');

  const [desatOp, setDesatOp] = useState(0);
  const [washY, setWashY] = useState(100);
  const [washOp, setWashOp] = useState(0);
  const [creamOp, setCreamOp] = useState(0);
  const [creamY, setCreamY] = useState(8);
  const [inThreshold, setInThreshold] = useState(false);

  const [curatedOp, setCuratedOp] = useState(1);

  const [phone, setPhone] = useState('');
  const [instagram, setInsta] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(30);
  const [showResend, setShowResend] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const logoBottom = panelVisible ? (panelExpanded ? 220 : 200) : 160;
  const taglineBottom = panelVisible ? (panelExpanded ? 178 : 170) : 130;

  useEffect(() => {
    fetch(`${BACKEND}/api/v2/cover-photos`)
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setSlides(d.photos); })
      .catch(() => {});
  }, []);

  const startCarousel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentSlide(s => (s + 1) % slides.length);
    }, 2500);
  }, [slides.length]);

  const stopCarousel = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  useEffect(() => {
    startCarousel();
    return () => stopCarousel();
  }, [startCarousel, stopCarousel]);

  useEffect(() => {
    if (!['otp2', 'signin2'].includes(screen)) { setResendCountdown(30); setShowResend(false); return; }
    const t = setInterval(() => {
      setResendCountdown(c => {
        if (c <= 1) { clearInterval(t); setShowResend(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [screen]);

  const crossfadeTagline = useCallback((toMaker: boolean) => {
    setTaglineOpA(0);
    setTaglineOpB(0);
    setTimeout(() => {
      setActiveTagline(toMaker ? 'b' : 'a');
      setTimeout(() => {
        setTaglineOpA(toMaker ? 0 : 1);
        setTaglineOpB(toMaker ? 1 : 0);
      }, 50);
    }, 1250);
  }, []);

  const enterCream = useCallback((target: Screen) => {
    setInThreshold(true);
    stopCarousel();
    setCuratedOp(0);
    setTimeout(() => setDesatOp(0.8), 0);
    setTimeout(() => { setWashY(0); setWashOp(1); }, 500);
    setTimeout(() => { setScreen(target); }, 1800);
    setTimeout(() => { setCreamOp(1); setCreamY(0); }, 1900);
    setTimeout(() => setInThreshold(false), 2500);
  }, [stopCarousel]);

  const exitCream = useCallback(() => {
    setInThreshold(true);
    setCreamOp(0);
    setCreamY(8);
    setTimeout(() => { setWashY(100); setWashOp(0); }, 200);
    setTimeout(() => setDesatOp(0), 600);
    setTimeout(() => startCarousel(), 1600);
    setTimeout(() => {
      setScreen(role === 'Dreamer' ? 'dreamer' : 'maker');
      setCuratedOp(1);
      setInThreshold(false);
    }, 1800);
  }, [role, startCarousel]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const shakeOtp = useCallback((refs: React.MutableRefObject<(HTMLInputElement | null)[]>) => {
    refs.current.forEach(el => {
      if (!el) return;
      let i = 0;
      const shake = () => {
        if (i >= 6) { el.style.transform = 'translateX(0)'; return; }
        el.style.transform = `translateX(${i % 2 === 0 ? 4 : -4}px)`;
        i++;
        setTimeout(shake, 80);
      };
      shake();
    });
  }, []);

  const handleLandingTap = () => {
    if (screen !== 'landing') return;
    setScreen('panel');
    setPanelVisible(true);
  };

  const dismissPanel = () => {
    setPanelVisible(false);
    setPanelExpanded(false);
    setScreen('landing');
    crossfadeTagline(false);
  };

  const selectRole = (r: Role) => {
    setRole(r);
    setScreen(r === 'Dreamer' ? 'dreamer' : 'maker');
    setPanelExpanded(true);
    crossfadeTagline(r === 'Maker');
  };

  const backToPanel = () => {
    setScreen('panel');
    setPanelExpanded(false);
  };

  const sendOtp = async (isSignin = false) => {
    if (!phone || phone.length < 10) { showToast('Enter a valid phone number'); return; }
    setLoading(true);
    try {
      const endpoint = role === 'Dreamer' ? '/api/v2/couple/auth/send-otp' : '/api/v2/vendor/auth/send-otp';
      const r = await fetch(`${BACKEND}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed to send code');
      setScreen(isSignin ? 'signin2' : 'otp2');
    } catch (e: any) {
      showToast(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (refs: React.MutableRefObject<(HTMLInputElement | null)[]>, isSignin = false) => {
    const code = otp.join('');
    if (code.length < 6) { showToast('Enter the 6-digit code'); return; }
    setLoading(true);
    try {
      const endpoint = role === 'Dreamer' ? '/api/v2/couple/auth/verify-otp' : '/api/v2/vendor/auth/verify-otp';
      const r = await fetch(`${BACKEND}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Invalid code');
      if (role === 'Dreamer') {
        localStorage.setItem('couple_session', JSON.stringify(d));
        router.push('/couple/today');
      } else {
        localStorage.setItem('vendor_session', JSON.stringify(d));
        router.push('/vendor/dashboard');
      }
    } catch (e: any) {
      shakeOtp(refs);
      showToast(e.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const submitRequest = async () => {
    if (!phone || phone.length < 10) { showToast('Enter a valid phone number'); return; }
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/v2/waitlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, instagram, role }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Submission failed');
      setRequestSuccess(true);
    } catch (e: any) {
      showToast(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (
    i: number, val: string,
    arr: string[], setArr: (a: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    const next = [...arr]; next[i] = val.slice(-1); setArr(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleOtpKeyDown = (
    i: number, e: React.KeyboardEvent,
    arr: string[], setArr: (a: string[]) => void,
    refs: React.MutableRefObject<(HTMLInputElement | null)[]>
  ) => {
    if (e.key === 'Backspace' && !arr[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const isCreamScreen = ['otp', 'otp2', 'request', 'signin', 'signin2'].includes(screen);

  const dreamerTagline = "It's not just happily married. It's getting married happily.";
  const makerTagline = "Behind every dream, there is a Maker.";

  const fieldStyle: React.CSSProperties = {
    width: '100%', background: 'transparent', border: 'none',
    borderBottom: '1px solid #E2DED8', outline: 'none',
    fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13,
    color: '#111111', padding: '8px 0', marginBottom: 20,
    transition: 'border-color 0.3s ease',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7,
    color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase' as const,
    display: 'block', marginBottom: 4,
  };

  const darkBtnStyle: React.CSSProperties = {
    width: '100%', background: '#111111', color: '#F8F7F5',
    fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9,
    letterSpacing: '0.22em', textTransform: 'uppercase' as const,
    padding: '14px 0', border: 'none', cursor: 'pointer',
    touchAction: 'manipulation', marginBottom: 12,
  };

  const creamHeaderBlock = (
    <div style={{ textAlign: 'center', marginBottom: 0 }}>
      <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: '#111111', letterSpacing: '0.1em', marginBottom: 3 }}>
        The Dream Wedding
      </div>
      <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontWeight: 300, fontSize: 13, color: '#888580', letterSpacing: '0.04em', marginBottom: 7 }}>
        {role === 'Dreamer' ? dreamerTagline : makerTagline}
      </div>
      <div style={{ width: 18, height: 0, borderTop: '0.5px solid #C9A84C', opacity: 0.4, margin: '0 auto 28px' }} />
    </div>
  );

  const backBtn = (onBack: () => void) => (
    <button onClick={onBack} style={{ position: 'absolute', top: 32, left: 18, background: 'none', border: 'none', color: '#888580', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 20, cursor: 'pointer', touchAction: 'manipulation', zIndex: 35 }}>←</button>
  );

  const TDWLogo = () => (
    <div style={{ width: 64, height: 64, borderRadius: '50%', border: '1.5px solid #C9A84C', background: 'linear-gradient(90deg, #111111 50%, #F8F7F5 50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <img
        src="/tdw-logo.png" alt="TDW"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <span style={{ fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 13, display: 'flex', zIndex: 1 }}>
        <span style={{ color: '#F8F7F5' }}>T</span>
        <span style={{ color: '#C9A84C' }}>D</span>
        <span style={{ color: '#111111' }}>W</span>
      </span>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        input:focus { outline: none; border-bottom-color: #C9A84C !important; }
      `}</style>

      <div
        onClick={screen === 'landing' ? handleLandingTap : undefined}
        style={{ position: 'fixed', inset: 0, background: '#0C0A09', overflow: 'hidden', cursor: screen === 'landing' ? 'pointer' : 'default' }}
      >
        {/* CAROUSEL */}
        {slides.map((slide, i) => (
          <div key={i} style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${slide.image_url})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: i === currentSlide ? 1 : 0,
            transition: `opacity 2.5s ${EASE}`,
            willChange: 'opacity', transform: 'translateZ(0)', zIndex: 1,
          }} />
        ))}

        {/* VIGNETTE */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2,
          background: 'radial-gradient(ellipse at 50% 60%, transparent 25%, rgba(0,0,0,0.55) 100%)',
          transform: 'translateZ(0)',
        }} />

        {/* BOTTOM GRADIENT */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', zIndex: 3,
          background: 'linear-gradient(to top, rgba(6,4,2,0.92) 0%, rgba(6,4,2,0.5) 55%, transparent 100%)',
          transform: 'translateZ(0)',
        }} />

        {/* DESAT LAYER */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5,
          background: 'rgba(248,247,245,0.9)',
          opacity: desatOp,
          transition: 'opacity 700ms ease',
          willChange: 'opacity', transform: 'translateZ(0)',
          pointerEvents: 'none',
        }} />

        {/* WASH LAYER */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 6,
          background: '#F8F7F5',
          transform: `translateY(${washY}%) translateZ(0)`,
          opacity: washOp,
          transition: `transform 1.5s ${EASE}, opacity 600ms ease`,
          willChange: 'transform, opacity',
          pointerEvents: 'none',
        }} />

        {/* CURATED TAG */}
        <div style={{
          position: 'absolute', top: 36, right: 14, zIndex: 10,
          fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7,
          color: 'rgba(201,168,76,0.55)',
          letterSpacing: '0.22em', textTransform: 'uppercase',
          opacity: curatedOp,
          transition: `opacity 2.5s ${EASE}`,
          pointerEvents: 'none',
        }}>Curated by TDW</div>

        {/* LOGO */}
        <div style={{
          position: 'absolute', zIndex: 10,
          bottom: logoBottom, left: '50%',
          transform: 'translateX(-50%) translateZ(0)',
          transition: `bottom 2.5s ${EASE}`,
          willChange: 'transform',
        }}>
          <TDWLogo />
        </div>

        {/* TAGLINE */}
        <div style={{
          position: 'absolute', zIndex: 10,
          bottom: taglineBottom, left: 0, right: 0,
          padding: '0 32px', textAlign: 'center',
          transition: `bottom 2.5s ${EASE}`,
        }}>
          <div style={{
            position: 'relative', height: 40,
          }}>
            <div style={{
              position: 'absolute', width: '100%',
              fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
              fontWeight: 300, fontSize: 13,
              color: 'rgba(248,247,245,0.85)', letterSpacing: '0.04em', lineHeight: 1.6,
              opacity: taglineOpA,
              transition: `opacity 1.25s ${EASE}`,
              willChange: 'opacity',
            }}>
              It&apos;s not just happily married. It&apos;s getting married happily.
            </div>
            <div style={{
              position: 'absolute', width: '100%',
              fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic',
              fontWeight: 300, fontSize: 13,
              color: 'rgba(248,247,245,0.85)', letterSpacing: '0.04em', lineHeight: 1.6,
              opacity: taglineOpB,
              transition: `opacity 1.25s ${EASE}`,
              willChange: 'opacity',
            }}>
              Behind every dream, there is a Maker.
            </div>
          </div>
        </div>

        {/* PANEL DISMISS OVERLAY */}
        {panelVisible && screen === 'panel' && (
          <div onClick={dismissPanel} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '38vh', zIndex: 19 }} />
        )}

        {/* PANEL */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20,
            background: 'rgba(8,6,4,0.88)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '20px 20px 0 0',
            padding: '28px 24px 40px',
            maxHeight: panelExpanded ? '55vh' : panelVisible ? '38vh' : 0,
            overflow: 'hidden',
            transform: panelVisible ? 'translateY(0) translateZ(0)' : 'translateY(100%) translateZ(0)',
            transition: `transform 2.5s ${EASE}, max-height 2.5s ${EASE}`,
            willChange: 'transform, max-height',
          }}
        >
          {screen === 'panel' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 13, color: 'rgba(248,247,245,0.45)', letterSpacing: '0.06em', marginBottom: 16 }}>
                Are you a
              </div>
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button onClick={() => selectRole('Dreamer')} style={{ flex: 1, background: '#C9A84C', color: '#0C0A09', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '14px 0', border: 'none', borderRadius: 2, cursor: 'pointer', touchAction: 'manipulation' }}>Dreamer</button>
                <button onClick={() => selectRole('Maker')} style={{ flex: 1, background: 'transparent', color: '#F8F7F5', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', padding: '14px 0', border: '0.5px solid rgba(248,247,245,0.25)', borderRadius: 2, cursor: 'pointer', touchAction: 'manipulation' }}>Maker</button>
              </div>
            </div>
          )}

          {(screen === 'dreamer' || screen === 'maker') && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              <button onClick={backToPanel} style={{ position: 'absolute', top: -8, left: 0, background: 'none', border: 'none', color: 'rgba(248,247,245,0.6)', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 18, cursor: 'pointer', touchAction: 'manipulation' }}>←</button>
              <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7.5, color: 'rgba(201,168,76,0.75)', letterSpacing: '0.28em', textTransform: 'uppercase', textAlign: 'center', marginBottom: 14 }}>
                {screen === 'dreamer' ? 'DREAMER' : 'MAKER'}
              </div>
              <div style={{ width: 22, height: 0, borderTop: '0.5px solid #C9A84C', opacity: 0.4, marginBottom: 18 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                <button onClick={() => enterCream('otp')} style={{ background: '#C9A84C', color: '#0C0A09', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '13px 0', border: 'none', borderRadius: 2, cursor: 'pointer', touchAction: 'manipulation' }}>I have an invite</button>
                <button onClick={() => enterCream('request')} style={{ background: 'transparent', color: '#F8F7F5', fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '13px 0', border: '0.5px solid rgba(248,247,245,0.28)', borderRadius: 2, cursor: 'pointer', touchAction: 'manipulation' }}>Request an invite</button>
                <button onClick={() => enterCream('signin')} style={{ background: 'none', border: 'none', color: 'rgba(248,247,245,0.38)', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, padding: '8px 0', cursor: 'pointer', touchAction: 'manipulation' }}>Already a member — Sign in</button>
              </div>
            </div>
          )}
        </div>

        {/* CREAM SCREENS */}
        {isCreamScreen && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 30,
            background: '#F8F7F5',
            opacity: creamOp,
            transform: `translateY(${creamY}px) translateZ(0)`,
            transition: `opacity 600ms ${EASE}, transform 600ms ${EASE}`,
            willChange: 'opacity, transform',
            display: 'flex', flexDirection: 'column',
            padding: '80px 24px 40px',
            overflowY: 'auto',
          }}>

            {/* OTP PHONE */}
            {screen === 'otp' && (
              <>
                {backBtn(exitCream)}
                {creamHeaderBlock}
                <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>Welcome. Let&apos;s begin.</div>
                <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>Enter your number. We&apos;ll send a code.</div>
                <label style={labelStyle}>Phone Number</label>
                <input type="tel" maxLength={14} placeholder="+91 00000 00000" value={phone} onChange={e => setPhone(e.target.value)} style={fieldStyle} />
                <button onClick={() => sendOtp(false)} disabled={loading} style={darkBtnStyle}>{loading ? 'Sending…' : 'Send code'}</button>
                <button onClick={exitCream} style={{ background: 'none', border: 'none', color: '#AAAAAA', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, cursor: 'pointer', touchAction: 'manipulation' }}>← Back</button>
              </>
            )}

            {/* OTP CODE */}
            {screen === 'otp2' && (
              <>
                {backBtn(() => setScreen('otp'))}
                {creamHeaderBlock}
                <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>Check your messages.</div>
                <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>Enter the 6-digit code we sent you.</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
                  {otp.map((v, i) => (
                    <input key={i} ref={el => { otpRefs.current[i] = el; }} type="tel" maxLength={1} value={v}
                      onChange={e => handleOtpInput(i, e.target.value, otp, setOtp, otpRefs)}
                      onKeyDown={e => handleOtpKeyDown(i, e, otp, setOtp, otpRefs)}
                      style={{ width: 36, height: 44, border: 'none', borderBottom: '1.5px solid #E2DED8', background: 'transparent', textAlign: 'center', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 18, color: '#111111', outline: 'none' }}
                    />
                  ))}
                </div>
                <button onClick={() => verifyOtp(otpRefs, false)} disabled={loading} style={darkBtnStyle}>{loading ? 'Verifying…' : 'Verify'}</button>
                {showResend
                  ? <button onClick={() => sendOtp(false)} style={{ background: 'none', border: 'none', color: '#AAAAAA', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, cursor: 'pointer', touchAction: 'manipulation' }}>Resend code</button>
                  : <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#AAAAAA', textAlign: 'center' }}>Resend in {resendCountdown}s</div>
                }
              </>
            )}

            {/* REQUEST */}
            {screen === 'request' && (
              <>
                {backBtn(exitCream)}
                {creamHeaderBlock}
                {requestSuccess ? (
                  <div style={{ textAlign: 'center', marginTop: 40 }}>
                    <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontWeight: 300, fontSize: 36, color: '#111111', marginBottom: 12 }}>Received.</div>
                    <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11, color: '#888580', fontStyle: 'italic', lineHeight: 1.7 }}>We review every request personally.</div>
                  </div>
                ) : (
                  <>
                    <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>Request an invite.</div>
                    <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>We&apos;re selective. We&apos;ll reach out.</div>
                    <label style={labelStyle}>Phone Number</label>
                    <input type="tel" maxLength={14} placeholder="+91 00000 00000" value={phone} onChange={e => setPhone(e.target.value)} style={fieldStyle} />
                    <label style={labelStyle}>Instagram</label>
                    <input type="text" placeholder="@yourhandle" value={instagram} onChange={e => setInsta(e.target.value)} style={fieldStyle} />
                    <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 10, color: '#AAAAAA', fontStyle: 'italic', textAlign: 'center', marginBottom: 20 }}>We review every request personally.</div>
                    <button onClick={submitRequest} disabled={loading} style={darkBtnStyle}>{loading ? 'Submitting…' : 'Submit'}</button>
                  </>
                )}
              </>
            )}

            {/* SIGN IN PHONE */}
            {screen === 'signin' && (
              <>
                {backBtn(exitCream)}
                {creamHeaderBlock}
                <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>Welcome back.</div>
                <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>Enter your number to continue.</div>
                <label style={labelStyle}>Phone Number</label>
                <input type="tel" maxLength={14} placeholder="+91 00000 00000" value={phone} onChange={e => setPhone(e.target.value)} style={fieldStyle} />
                <button onClick={() => sendOtp(true)} disabled={loading} style={darkBtnStyle}>{loading ? 'Sending…' : 'Send code'}</button>
              </>
            )}

            {/* SIGN IN OTP */}
            {screen === 'signin2' && (
              <>
                {backBtn(() => setScreen('signin'))}
                {creamHeaderBlock}
                <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>Check your messages.</div>
                <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>Enter the 6-digit code we sent you.</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
                  {otp.map((v, i) => (
                    <input key={i} ref={el => { signin2Refs.current[i] = el; }} type="tel" maxLength={1} value={v}
                      onChange={e => handleOtpInput(i, e.target.value, otp, setOtp, signin2Refs)}
                      onKeyDown={e => handleOtpKeyDown(i, e, otp, setOtp, signin2Refs)}
                      style={{ width: 36, height: 44, border: 'none', borderBottom: '1.5px solid #E2DED8', background: 'transparent', textAlign: 'center', fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 18, color: '#111111', outline: 'none' }}
                    />
                  ))}
                </div>
                <button onClick={() => verifyOtp(signin2Refs, true)} disabled={loading} style={darkBtnStyle}>{loading ? 'Verifying…' : 'Verify'}</button>
                {showResend
                  ? <button onClick={() => sendOtp(true)} style={{ background: 'none', border: 'none', color: '#AAAAAA', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, cursor: 'pointer', touchAction: 'manipulation' }}>Resend code</button>
                  : <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#AAAAAA', textAlign: 'center' }}>Resend in {resendCountdown}s</div>
                }
              </>
            )}
          </div>
        )}

        {/* TOAST */}
        {toast && (
          <div style={{
            position: 'absolute', top: 24, left: '50%',
            transform: 'translateX(-50%) translateZ(0)',
            background: '#FFFFFF', border: '0.5px solid #E2DED8',
            padding: '10px 18px',
            fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, color: '#888580',
            zIndex: 50, whiteSpace: 'nowrap', borderRadius: 4,
          }}>
            {toast}
          </div>
        )}
      </div>
    </>
  );
}
