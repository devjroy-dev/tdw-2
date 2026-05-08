'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API  = 'https://dream-wedding-production-89ae.up.railway.app';
const GOLD = '#C9A84C';
const EASE = 'cubic-bezier(0.22,1,0.36,1)';
const S: React.CSSProperties = { position: 'absolute', inset: 0 };

type Step = 'loading' | 'welcome' | 'phone' | 'otp' | 'pin' | 'error';

const OTP_LEN = 6;

export default function CircleJoinPage() {
  const params   = useParams();
  const router   = useRouter();
  const token    = params?.token as string || '';

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const slidesRef   = useRef<string[]>([]);
  const otpRefs     = useRef<(HTMLInputElement | null)[]>([]);
  const pinRefs     = useRef<(HTMLInputElement | null)[]>([]);

  const [slides, setSlides]       = useState<string[]>([]);
  const [cur, setCur]             = useState(0);
  const [step, setStep]           = useState<Step>('loading');
  const [brideName, setBrideName] = useState('');
  const [inviteeName, setInviteeName] = useState('');
  const [expanded, setExpanded]   = useState(false);
  const [phone, setPhone]         = useState('');
  const [otp, setOtp]             = useState(Array(OTP_LEN).fill(''));
  const [pin, setPin]             = useState(['', '', '', '']);
  const [userId, setUserId]       = useState('');
  const [loading, setLoading]     = useState(false);
  const [toast, setToast]         = useState('');
  const [errorMsg, setErrorMsg]   = useState('');

  useEffect(() => { slidesRef.current = slides; }, [slides]);

  // Start carousel
  const startCarousel = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() =>
      setCur(c => (c + 1) % Math.max(slidesRef.current.length, 1)), 4000);
  }, []);

  useEffect(() => {
    // Fetch cover photos — same catalogue as the main gate
    fetch(`${API}/api/v2/cover-photos`)
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setSlides(d.photos.map((p: any) => p.image_url)); })
      .catch(() => {});
    startCarousel();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [startCarousel]);

  // Validate token on mount
  useEffect(() => {
    if (!token) { setErrorMsg('Invalid invite link.'); setStep('error'); return; }
    fetch(`${API}/api/v2/circle/join/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setBrideName(d.data.bride_name);
          setInviteeName(d.data.invitee_name);
          setStep('welcome');
        } else {
          setErrorMsg(d.error || 'This invite link is invalid or has expired.');
          setStep('error');
        }
      })
      .catch(() => { setErrorMsg('Could not load invite. Check your connection.'); setStep('error'); });
  }, [token]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const sendOtp = async () => {
    const bare = phone.replace(/\D/g, '').slice(-10);
    if (bare.length < 10) { showToast('Enter a valid 10-digit number'); return; }
    setLoading(true);
    try {
      await fetch(`${API}/api/v2/couple/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: bare }),
      });
      setStep('otp');
      setOtp(Array(OTP_LEN).fill(''));
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
    } catch { showToast('Could not send OTP. Try again.'); }
    setLoading(false);
  };

  const verifyOtp = async (code: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/circle/join/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, phone, otp: code }),
      });
      const d = await r.json();
      if (!d.success) { showToast(d.error || 'Verification failed.'); setLoading(false); return; }
      setUserId(d.data.user_id);
      // Save partial session
      localStorage.setItem('circle_session', JSON.stringify(d.data));
      if (d.data.pin_set) {
        router.push('/circle/home');
      } else {
        setStep('pin');
        setPin(['', '', '', '']);
        setTimeout(() => pinRefs.current[0]?.focus(), 200);
      }
    } catch { showToast('Something went wrong.'); }
    setLoading(false);
  };

  const handleOtp = (i: number, v: string) => {
    const digit = v.replace(/[^0-9]/g, '').slice(-1);
    const next = [...otp]; next[i] = digit;
    setOtp(next);
    if (digit && i < OTP_LEN - 1) otpRefs.current[i + 1]?.focus();
    if (next.every(d => d) && next.join('').length === OTP_LEN) verifyOtp(next.join(''));
  };

  const setUserPin = async (pinStr: string) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/circle/join/set-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, pin: pinStr }),
      });
      const d = await r.json();
      if (!d.success) { showToast(d.error || 'Could not set PIN.'); setLoading(false); return; }
      // Fetch full session
      const sr = await fetch(`${API}/api/v2/circle/session/${userId}`);
      const sd = await sr.json();
      if (sd.success) localStorage.setItem('circle_session', JSON.stringify(sd.data));
      router.push('/circle/home');
    } catch { showToast('Something went wrong.'); }
    setLoading(false);
  };

  const handlePin = (i: number, v: string) => {
    const digit = v.replace(/[^0-9]/g, '').slice(-1);
    const next = [...pin]; next[i] = digit;
    setPin(next);
    if (digit && i < 3) pinRefs.current[i + 1]?.focus();
    if (next.every(d => d)) setUserPin(next.join(''));
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 0',
    background: 'transparent', border: 'none',
    borderBottom: '0.5px solid rgba(248,247,245,0.25)',
    fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
    fontSize: 16, color: '#F8F7F5', outline: 'none',
    letterSpacing: '0.02em',
  };

  const ctaStyle: React.CSSProperties = {
    width: '100%', height: 48, background: GOLD,
    border: 'none', borderRadius: 100, cursor: 'pointer',
    fontFamily: "'Jost', sans-serif", fontSize: 9,
    fontWeight: 400, letterSpacing: '0.22em',
    textTransform: 'uppercase', color: '#0C0A09',
    marginTop: 20, opacity: loading ? 0.6 : 1,
  };

  const otpBoxStyle = (filled: boolean): React.CSSProperties => ({
    width: 40, height: 48, textAlign: 'center',
    background: 'rgba(255,255,255,0.08)',
    border: `0.5px solid ${filled ? GOLD : 'rgba(248,247,245,0.2)'}`,
    borderRadius: 8, color: '#F8F7F5', fontSize: 20,
    fontFamily: "'Cormorant Garamond', serif", outline: 'none',
    transition: 'border-color 200ms',
  });

  const pinBoxStyle = (filled: boolean): React.CSSProperties => ({
    width: 52, height: 52, textAlign: 'center',
    background: 'rgba(255,255,255,0.08)',
    border: `0.5px solid ${filled ? GOLD : 'rgba(248,247,245,0.2)'}`,
    borderRadius: 10, color: '#F8F7F5', fontSize: 22,
    fontFamily: "'Cormorant Garamond', serif", outline: 'none',
  });

  return (
    <div style={{ ...S, overflow: 'hidden', background: '#0C0A09' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; }
        input::placeholder { color: rgba(248,247,245,0.3); }
        ::-webkit-scrollbar { display: none; }
        @keyframes breathe { 0%,100%{opacity:0.22} 50%{opacity:0.45} }
      `}</style>

      {/* Carousel — same cover photos as the main gate */}
      {slides.map((url, i) => (
        <div key={i} style={{
          ...S,
          backgroundImage: `url(${url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === cur ? 1 : 0,
          transition: `opacity 3s ${EASE}`,
          willChange: 'opacity',
        }} />
      ))}
      {/* Fallback dark bg while photos load */}
      {slides.length === 0 && <div style={{ ...S, background: '#1A1715' }} />}

      {/* Vignette */}
      <div style={{
        ...S, zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 60%, transparent 20%, rgba(0,0,0,0.6) 100%)',
      }} />

      {/* Dark overlay */}
      <div style={{ ...S, zIndex: 3, background: 'rgba(12,10,9,0.18)', pointerEvents: 'none' }} />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)',
          border: '0.5px solid rgba(255,255,255,0.2)',
          padding: '10px 20px', zIndex: 100,
          fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: 13,
          color: '#F8F7F5', whiteSpace: 'nowrap', borderRadius: 100,
        }}>{toast}</div>
      )}

      {/* Error state */}
      {step === 'error' && (
        <div style={{
          ...S, zIndex: 20, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 32,
        }}>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontSize: 26, color: '#F8F7F5', textAlign: 'center', marginBottom: 12 }}>
            Hmm.
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(248,247,245,0.6)', textAlign: 'center', lineHeight: 1.6 }}>
            {errorMsg}
          </p>
        </div>
      )}

      {/* Bottom strip — same pattern as gate screen */}
      {step !== 'error' && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20 }}>
          <div
            onClick={() => { if (!expanded && step === 'welcome') setExpanded(true); }}
            style={{
              background: 'rgba(12,10,9,0.38)',
              backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
              borderTop: '0.5px solid rgba(255,255,255,0.1)',
              padding: expanded
                ? '20px 24px calc(env(safe-area-inset-bottom, 16px) + 28px)'
                : '14px 24px calc(env(safe-area-inset-bottom, 12px) + 16px)',
              transition: `padding 400ms ${EASE}`,
              cursor: (!expanded && step === 'welcome') ? 'pointer' : 'default',
            }}
          >
            {/* Brand row — always visible */}
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div>
                <p style={{
                  fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                  fontWeight: 300, fontSize: 20, color: '#F8F7F5',
                  margin: 0, lineHeight: 1.15,
                }}>The Dream Wedding</p>
                <p style={{
                  fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 7,
                  letterSpacing: '0.32em', textTransform: 'uppercase',
                  color: GOLD, margin: '4px 0 0',
                }}>THE CURATED WEDDING OS</p>
              </div>
              {!expanded && step === 'welcome' && (
                <p style={{
                  fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 8,
                  letterSpacing: '0.18em', textTransform: 'uppercase',
                  color: 'rgba(248,247,245,0.28)', margin: 0,
                  animation: 'breathe 3s ease-in-out infinite',
                }}>tap</p>
              )}
            </div>

            {/* Loading state */}
            {step === 'loading' && (
              <div style={{ paddingTop: 16, height: 40, display: 'flex', alignItems: 'center' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(248,247,245,0.5)', margin: 0 }}>
                  Loading invite…
                </p>
              </div>
            )}

            {/* Expanded panel */}
            <div style={{
              maxHeight: expanded ? '360px' : '0px',
              overflow: 'hidden',
              transition: `max-height 440ms ${EASE}`,
            }}>
              <div style={{ paddingTop: 20 }}>

                {/* Welcome + phone step */}
                {(step === 'welcome' || step === 'phone') && (
                  <>
                    <p style={{
                      fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                      fontWeight: 300, fontSize: 18, color: '#F8F7F5',
                      margin: '0 0 4px', lineHeight: 1.3,
                    }}>
                      {brideName} has invited you{inviteeName ? `, ${inviteeName}` : ''}.
                    </p>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
                      fontSize: 12, color: 'rgba(248,247,245,0.5)',
                      margin: '0 0 20px',
                    }}>
                      Enter your phone number to join her Circle.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: 16, color: '#F8F7F5' }}>+91</span>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="Phone number"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        style={{ ...inputStyle, flex: 1 }}
                        autoFocus
                      />
                    </div>
                    <button onClick={sendOtp} disabled={loading} style={ctaStyle}>
                      {loading ? 'Sending…' : 'Send OTP'}
                    </button>
                  </>
                )}

                {/* OTP step */}
                {step === 'otp' && (
                  <>
                    <p style={{
                      fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                      fontWeight: 300, fontSize: 18, color: '#F8F7F5',
                      margin: '0 0 4px',
                    }}>
                      Enter the code.
                    </p>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
                      fontSize: 12, color: 'rgba(248,247,245,0.5)',
                      margin: '0 0 20px',
                    }}>
                      Sent to +91 {phone.replace(/\D/g, '').slice(-10)}
                    </p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      {otp.map((d, i) => (
                        <input
                          key={i}
                          ref={r => { otpRefs.current[i] = r; }}
                          type="tel"
                          maxLength={1}
                          value={d}
                          onChange={e => handleOtp(i, e.target.value)}
                          style={otpBoxStyle(!!d)}
                        />
                      ))}
                    </div>
                    {loading && (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: 12, color: GOLD, textAlign: 'center', marginTop: 16 }}>
                        Verifying…
                      </p>
                    )}
                  </>
                )}

                {/* PIN step */}
                {step === 'pin' && (
                  <>
                    <p style={{
                      fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic',
                      fontWeight: 300, fontSize: 18, color: '#F8F7F5',
                      margin: '0 0 4px',
                    }}>
                      Set your PIN.
                    </p>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
                      fontSize: 12, color: 'rgba(248,247,245,0.5)',
                      margin: '0 0 20px',
                    }}>
                      You'll use this every time you open the app.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                      {pin.map((d, i) => (
                        <input
                          key={i}
                          ref={r => { pinRefs.current[i] = r; }}
                          type="password"
                          maxLength={1}
                          value={d}
                          onChange={e => handlePin(i, e.target.value)}
                          style={pinBoxStyle(!!d)}
                        />
                      ))}
                    </div>
                    {loading && (
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300, fontSize: 12, color: GOLD, textAlign: 'center', marginTop: 16 }}>
                        Setting up your Circle…
                      </p>
                    )}
                  </>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
