'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const SLIDES = [
  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=800&q=80',
  'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=800&q=80',
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
  'https://images.unsplash.com/photo-1570862856967-0a3b9dda3964?w=800&q=80',
  'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=800&q=80',
];

type Screen =
  | 'home'
  | 'dreamer'
  | 'maker'
  | 'otp'
  | 'otp2'
  | 'request'
  | 'signin'
  | 'signin2';

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

export default function LandingPage() {
  const [screen, setScreen] = useState<Screen>('home');
  const [role, setRole] = useState<'Dreamer' | 'Maker'>('Dreamer');
  const [activeSlide, setActiveSlide] = useState(0);

  // Transition layer state
  const [desatOpacity, setDesatOpacity] = useState(0);
  const [washTranslate, setWashTranslate] = useState('100%');
  const [washOpacity, setWashOpacity] = useState(0);
  const [creamVisible, setCreamVisible] = useState(false);
  const [uiVisible, setUiVisible] = useState(true); // dots + curated tag

  // Cream screen opacity/translate for fade-in
  const [creamOpacity, setCreamOpacity] = useState(0);
  const [creamTranslate, setCreamTranslate] = useState('8px');

  // Phone / OTP state
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(30);
  const [showResend, setShowResend] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Carousel
  const startCarousel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveSlide(s => (s + 1) % SLIDES.length);
    }, 4500);
  }, []);

  useEffect(() => {
    startCarousel();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startCarousel]);

  // OTP resend countdown
  useEffect(() => {
    if (screen === 'otp2' || screen === 'signin2') {
      setResendCountdown(30);
      setShowResend(false);
      const t = setInterval(() => {
        setResendCountdown(c => {
          if (c <= 1) { clearInterval(t); setShowResend(true); return 0; }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [screen]);

  // --- Transition: dark → cream ---
  const triggerTransition = (target: Screen) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setUiVisible(false);
    // Step 1: desat
    setDesatOpacity(0.75);
    // Step 2: wash rises at 350ms
    setTimeout(() => {
      setWashTranslate('0%');
      setWashOpacity(1);
    }, 350);
    // Step 3: set screen at 900ms
    setTimeout(() => {
      setScreen(target);
      setCreamVisible(true);
    }, 900);
    // Step 4: fade in cream content at 950ms
    setTimeout(() => {
      setCreamOpacity(1);
      setCreamTranslate('0px');
    }, 950);
  };

  // --- Reverse: cream → dark ---
  const reverseTransition = (backTo: Screen) => {
    setCreamOpacity(0);
    setCreamTranslate('8px');
    setTimeout(() => {
      setCreamVisible(false);
      setScreen(backTo);
      setWashTranslate('100%');
      setWashOpacity(0);
    }, 150);
    setTimeout(() => {
      setDesatOpacity(0);
    }, 200);
    setTimeout(() => {
      setUiVisible(true);
      startCarousel();
    }, 600);
  };

  const goBackFromCream = () => {
    setRequestSuccess(false);
    setRequestError('');
    reverseTransition(role === 'Dreamer' ? 'dreamer' : 'maker');
  };

  const handleRoleSelect = (r: 'Dreamer' | 'Maker') => {
    setRole(r);
    setScreen(r === 'Dreamer' ? 'dreamer' : 'maker');
  };

  const handleOtpInput = (i: number, val: string) => {
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleVerify = () => {
    if (role === 'Dreamer') {
      localStorage.setItem('couple_session', '1');
      window.location.href = '/couple/today';
    } else {
      localStorage.setItem('vendor_session', '1');
      window.location.href = '/couple/vendor/dashboard';
    }
  };

  const handleRequestSubmit = async () => {
    try {
      const res = await fetch('/api/v2/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, instagram, role: role.toLowerCase() }),
      });
      if (!res.ok) throw new Error();
      setRequestSuccess(true);
    } catch {
      setRequestError('Something went wrong. Try again.');
      setTimeout(() => setRequestError(''), 3000);
    }
  };

  const isCreamScreen = ['otp', 'otp2', 'request', 'signin', 'signin2'].includes(screen);
  const roleTagline =
    role === 'Dreamer'
      ? 'Not just happily married. Getting married happily.'
      : 'Behind every dream, there is a Maker.';

  // Shared styles
  const s = {
    fontCormorant: { fontFamily: "'Cormorant Garamond', serif" } as React.CSSProperties,
    fontDM: { fontFamily: "'DM Sans', sans-serif" } as React.CSSProperties,
    fontJost: { fontFamily: "'Jost', sans-serif" } as React.CSSProperties,
  };

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400&family=Jost:wght@200;300&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { overflow: hidden; background: #0C0A09; }
        input { outline: none; border: none; background: transparent; }
        button { cursor: pointer; border: none; background: transparent; }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#0C0A09' }}>

        {/* ── CAROUSEL SLIDES ── */}
        {SLIDES.map((src, i) => (
          <div
            key={i}
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${src})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              opacity: i === activeSlide ? 1 : 0,
              transition: 'opacity 1.4s cubic-bezier(0.22,1,0.36,1)',
              willChange: 'opacity',
              transform: 'translateZ(0)',
            }}
          />
        ))}

        {/* ── VIGNETTE ── */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)',
          willChange: 'opacity', transform: 'translateZ(0)', pointerEvents: 'none',
        }} />

        {/* ── BOTTOM GRADIENT ── */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '58%',
          background: 'linear-gradient(to top, rgba(8,6,4,0.97) 0%, rgba(8,6,4,0.75) 45%, rgba(8,6,4,0.15) 75%, transparent 100%)',
          willChange: 'opacity', transform: 'translateZ(0)', pointerEvents: 'none',
        }} />

        {/* ── CURATED TAG ── */}
        <div style={{
          position: 'absolute', top: 34, right: 14, zIndex: 5,
          opacity: uiVisible ? 1 : 0,
          transition: 'opacity 0.4s ease',
          pointerEvents: 'none',
          ...s.fontJost,
          fontWeight: 200, fontSize: 7, color: 'rgba(201,168,76,0.6)',
          textTransform: 'uppercase', letterSpacing: '0.22em',
        }}>
          Curated by TDW
        </div>

        {/* ── DOT INDICATORS ── */}
        <div style={{
          position: 'absolute', bottom: 180, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', gap: 6, zIndex: 5,
          opacity: uiVisible && (screen === 'home' || screen === 'dreamer' || screen === 'maker') ? 1 : 0,
          transition: 'opacity 0.4s ease', pointerEvents: 'none',
        }}>
          {SLIDES.map((_, i) => (
            <div key={i} style={{
              width: 3, height: 3, borderRadius: '50%',
              background: i === activeSlide ? '#C9A84C' : 'rgba(248,247,245,0.2)',
              transition: 'background 0.4s ease',
            }} />
          ))}
        </div>

        {/* ── DESAT LAYER (Layer A) ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 8,
          background: '#0C0A09',
          opacity: desatOpacity,
          transition: `opacity 450ms ${EASE}`,
          willChange: 'opacity', transform: 'translateZ(0)',
          pointerEvents: 'none',
        }} />

        {/* ── WASH LAYER (Layer B) ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 9,
          background: '#F8F7F5',
          transform: `translateZ(0) translateY(${washTranslate})`,
          opacity: washOpacity,
          transition: `transform 700ms ${EASE}, opacity 300ms ease`,
          willChange: 'transform, opacity',
          pointerEvents: 'none',
        }} />

        {/* ── SCREEN 1: HOME ── */}
        {screen === 'home' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            padding: '0 22px 36px',
          }}>
            {/* Wordmark */}
            <div style={{ ...s.fontCormorant, fontStyle: 'italic', fontWeight: 300, fontSize: 21, color: '#F8F7F5', letterSpacing: '0.1em', marginBottom: 3 }}>
              The Dream Wedding
            </div>
            {/* Sub-label */}
            <div style={{ ...s.fontJost, fontWeight: 200, fontSize: 7.5, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 3 }}>
              The Curated Wedding OS
            </div>
            {/* Gold rule */}
            <div style={{ width: 22, height: 0.5, background: '#C9A84C', opacity: 0.5, marginBottom: 18 }} />
            {/* "Are you a" */}
            <div style={{ ...s.fontCormorant, fontWeight: 300, fontSize: 13, color: 'rgba(248,247,245,0.5)', letterSpacing: '0.06em', marginBottom: 12 }}>
              Are you a
            </div>
            {/* Role buttons */}
            <div style={{ display: 'flex', gap: 9 }}>
              <button
                onClick={() => handleRoleSelect('Dreamer')}
                style={{
                  flex: 1, padding: '13px 0',
                  background: '#C9A84C', color: '#0C0A09',
                  ...s.fontJost, fontWeight: 300, fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.18em',
                  touchAction: 'manipulation', transition: 'all 200ms',
                }}>
                Dreamer
              </button>
              <button
                onClick={() => handleRoleSelect('Maker')}
                style={{
                  flex: 1, padding: '13px 0',
                  background: 'transparent',
                  border: '0.5px solid rgba(248,247,245,0.22)',
                  color: '#F8F7F5',
                  ...s.fontJost, fontWeight: 300, fontSize: 10,
                  textTransform: 'uppercase', letterSpacing: '0.18em',
                  touchAction: 'manipulation', transition: 'all 200ms',
                }}>
                Maker
              </button>
            </div>
          </div>
        )}

        {/* ── SCREEN 2: ROLE PANEL ── */}
        {(screen === 'dreamer' || screen === 'maker') && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            padding: '0 22px 36px',
          }}>
            {/* Back */}
            <button
              onClick={() => setScreen('home')}
              style={{
                position: 'absolute', top: 40, left: 20,
                ...s.fontJost, fontWeight: 200, fontSize: 20,
                color: 'rgba(248,247,245,0.7)', background: 'none', border: 'none',
              }}>
              ←
            </button>

            {/* Wordmark */}
            <div style={{ ...s.fontCormorant, fontStyle: 'italic', fontWeight: 300, fontSize: 21, color: '#F8F7F5', letterSpacing: '0.1em', marginBottom: 3 }}>
              The Dream Wedding
            </div>
            {/* Gold rule */}
            <div style={{ width: 22, height: 0.5, background: '#C9A84C', opacity: 0.5, marginBottom: 12 }} />
            {/* Role eyebrow */}
            <div style={{ ...s.fontJost, fontWeight: 200, fontSize: 7.5, color: 'rgba(201,168,76,0.75)', textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 14 }}>
              {screen === 'dreamer' ? 'Dreamer' : 'Maker'}
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                onClick={() => { triggerTransition('otp'); }}
                style={{
                  padding: '13px 0', background: '#C9A84C', color: '#0C0A09',
                  ...s.fontJost, fontWeight: 300, fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '0.2em',
                  touchAction: 'manipulation',
                }}>
                I have an invite
              </button>
              <button
                onClick={() => { triggerTransition('request'); }}
                style={{
                  padding: '13px 0',
                  background: 'transparent',
                  border: '0.5px solid rgba(248,247,245,0.28)',
                  color: '#F8F7F5',
                  ...s.fontJost, fontWeight: 300, fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '0.2em',
                  touchAction: 'manipulation',
                }}>
                Request an invite
              </button>
              <button
                onClick={() => { triggerTransition('signin'); }}
                style={{
                  padding: '10px 0', background: 'none', border: 'none',
                  color: 'rgba(248,247,245,0.38)',
                  ...s.fontJost, fontWeight: 200, fontSize: 8,
                  letterSpacing: '0.16em',
                  touchAction: 'manipulation',
                }}>
                Already a member — Sign in
              </button>
            </div>
          </div>
        )}

        {/* ── CREAM SCREENS (Layer C) ── */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 30,
          background: '#F8F7F5',
          opacity: creamVisible ? creamOpacity : 0,
          transform: `translateY(${creamVisible ? creamTranslate : '8px'})`,
          transition: `opacity 400ms ${EASE}, transform 400ms ${EASE}`,
          pointerEvents: creamVisible ? 'auto' : 'none',
          display: 'flex', flexDirection: 'column',
          padding: '0 26px',
          overflowY: 'auto',
        }}>
          {/* Back button */}
          <button
            onClick={goBackFromCream}
            style={{
              alignSelf: 'flex-start', marginTop: 44,
              ...s.fontJost, fontWeight: 200, fontSize: 20, color: '#888580',
            }}>
            ←
          </button>

          {/* Cream header */}
          <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 28 }}>
            <div style={{ ...s.fontCormorant, fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: '#111111', letterSpacing: '0.1em', marginBottom: 3 }}>
              The Dream Wedding
            </div>
            <div style={{ ...s.fontCormorant, fontStyle: 'italic', fontWeight: 300, fontSize: 13, color: '#888580', letterSpacing: '0.04em', marginBottom: 12 }}>
              {roleTagline}
            </div>
            <div style={{ width: 18, height: 0.5, background: '#C9A84C', opacity: 0.4, margin: '0 auto' }} />
          </div>

          {/* ── OTP PHONE ── */}
          {screen === 'otp' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ ...s.fontCormorant, fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>
                Welcome. Let's begin.
              </div>
              <div style={{ ...s.fontDM, fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>
                Enter your number. We'll send a code.
              </div>
              <div style={{ width: '100%', marginBottom: 24 }}>
                <div style={{ ...s.fontJost, fontWeight: 200, fontSize: 7, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 7 }}>
                  Phone Number
                </div>
                <input
                  type="tel" maxLength={14} placeholder="+91 00000 00000"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  style={{
                    width: '100%', borderBottom: '1px solid #E2DED8',
                    ...s.fontDM, fontWeight: 300, fontSize: 13, color: '#111111',
                    padding: '8px 0',
                  }}
                />
              </div>
              <button
                onClick={() => setScreen('otp2')}
                style={{
                  width: '100%', padding: '14px 0',
                  background: '#111111', color: '#F8F7F5',
                  ...s.fontJost, fontWeight: 300, fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '0.22em',
                  marginBottom: 12,
                }}>
                Send code
              </button>
            </div>
          )}

          {/* ── OTP CODE ── */}
          {screen === 'otp2' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ ...s.fontCormorant, fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>
                Check your messages.
              </div>
              <div style={{ ...s.fontDM, fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>
                Enter the 6-digit code we sent you.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
                {otp.map((val, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="tel" maxLength={1} value={val}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    style={{
                      width: 36, height: 44,
                      borderBottom: '1.5px solid #E2DED8',
                      ...s.fontDM, fontWeight: 400, fontSize: 18,
                      color: '#111111', textAlign: 'center',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleVerify}
                style={{
                  width: '100%', padding: '14px 0',
                  background: '#111111', color: '#F8F7F5',
                  ...s.fontJost, fontWeight: 300, fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '0.22em',
                  marginBottom: 12,
                }}>
                Verify
              </button>
              {showResend && (
                <button style={{ ...s.fontJost, fontWeight: 200, fontSize: 8, color: '#AAAAAA' }}>
                  Resend code
                </button>
              )}
              {!showResend && (
                <div style={{ ...s.fontJost, fontWeight: 200, fontSize: 8, color: '#C8C4BE' }}>
                  Resend in {resendCountdown}s
                </div>
              )}
            </div>
          )}

          {/* ── REQUEST INVITE ── */}
          {screen === 'request' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {requestSuccess ? (
                <div style={{ textAlign: 'center', marginTop: 40 }}>
                  <div style={{ ...s.fontCormorant, fontStyle: 'italic', fontWeight: 300, fontSize: 32, color: '#111111', marginBottom: 12 }}>
                    Received.
                  </div>
                  <div style={{ ...s.fontDM, fontWeight: 300, fontSize: 12, color: '#888580', fontStyle: 'italic', textAlign: 'center' }}>
                    We review every request personally.
                  </div>
                </div>
              ) : (
                <>
                  {requestError && (
                    <div style={{
                      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
                      background: '#FFFFFF', border: '0.5px solid #E2DED8',
                      padding: '12px 20px', zIndex: 100,
                      ...s.fontDM, fontSize: 14, color: '#888580',
                    }}>
                      {requestError}
                    </div>
                  )}
                  <div style={{ ...s.fontCormorant, fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>
                    Request an invite.
                  </div>
                  <div style={{ ...s.fontDM, fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>
                    We're selective. We'll reach out.
                  </div>
                  <div style={{ width: '100%', marginBottom: 16 }}>
                    <div style={{ ...s.fontJost, fontWeight: 200, fontSize: 7, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 7 }}>
                      Phone Number
                    </div>
                    <input
                      type="tel" maxLength={14} placeholder="+91 00000 00000"
                      value={phone} onChange={e => setPhone(e.target.value)}
                      style={{ width: '100%', borderBottom: '1px solid #E2DED8', ...s.fontDM, fontWeight: 300, fontSize: 13, color: '#111111', padding: '8px 0' }}
                    />
                  </div>
                  <div style={{ width: '100%', marginBottom: 24 }}>
                    <div style={{ ...s.fontJost, fontWeight: 200, fontSize: 7, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 7 }}>
                      Instagram
                    </div>
                    <input
                      type="text" placeholder="@yourhandle"
                      value={instagram} onChange={e => setInstagram(e.target.value)}
                      style={{ width: '100%', borderBottom: '1px solid #E2DED8', ...s.fontDM, fontWeight: 300, fontSize: 13, color: '#111111', padding: '8px 0' }}
                    />
                  </div>
                  <button
                    onClick={handleRequestSubmit}
                    style={{
                      width: '100%', padding: '14px 0',
                      background: '#111111', color: '#F8F7F5',
                      ...s.fontJost, fontWeight: 300, fontSize: 9,
                      textTransform: 'uppercase', letterSpacing: '0.22em',
                      marginBottom: 12,
                    }}>
                    Submit
                  </button>
                  <div style={{ ...s.fontDM, fontWeight: 300, fontSize: 10, color: '#AAAAAA', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.7 }}>
                    We review every request personally.
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── SIGN IN PHONE ── */}
          {screen === 'signin' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ ...s.fontCormorant, fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>
                Welcome back.
              </div>
              <div style={{ ...s.fontDM, fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>
                Enter your number to continue.
              </div>
              <div style={{ width: '100%', marginBottom: 24 }}>
                <div style={{ ...s.fontJost, fontWeight: 200, fontSize: 7, color: '#888580', textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 7 }}>
                  Phone Number
                </div>
                <input
                  type="tel" maxLength={14} placeholder="+91 00000 00000"
                  value={phone} onChange={e => setPhone(e.target.value)}
                  style={{ width: '100%', borderBottom: '1px solid #E2DED8', ...s.fontDM, fontWeight: 300, fontSize: 13, color: '#111111', padding: '8px 0' }}
                />
              </div>
              <button
                onClick={() => setScreen('signin2')}
                style={{
                  width: '100%', padding: '14px 0',
                  background: '#111111', color: '#F8F7F5',
                  ...s.fontJost, fontWeight: 300, fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '0.22em',
                }}>
                Send code
              </button>
            </div>
          )}

          {/* ── SIGN IN OTP ── */}
          {screen === 'signin2' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ ...s.fontCormorant, fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>
                Check your messages.
              </div>
              <div style={{ ...s.fontDM, fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>
                Enter the 6-digit code we sent you.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 28 }}>
                {otp.map((val, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="tel" maxLength={1} value={val}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKey(i, e)}
                    style={{
                      width: 36, height: 44,
                      borderBottom: '1.5px solid #E2DED8',
                      ...s.fontDM, fontWeight: 400, fontSize: 18,
                      color: '#111111', textAlign: 'center',
                    }}
                  />
                ))}
              </div>
              <button
                onClick={handleVerify}
                style={{
                  width: '100%', padding: '14px 0',
                  background: '#111111', color: '#F8F7F5',
                  ...s.fontJost, fontWeight: 300, fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: '0.22em',
                  marginBottom: 12,
                }}>
                Verify
              </button>
              {showResend && (
                <button style={{ ...s.fontJost, fontWeight: 200, fontSize: 8, color: '#AAAAAA' }}>
                  Resend code
                </button>
              )}
              {!showResend && (
                <div style={{ ...s.fontJost, fontWeight: 200, fontSize: 8, color: '#C8C4BE' }}>
                  Resend in {resendCountdown}s
                </div>
              )}
            </div>
          )}

        </div>
        {/* end cream layer */}

      </div>
    </>
  );
}
