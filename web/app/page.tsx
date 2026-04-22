'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';
const FALLBACK_SLIDES = [
  'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=1200&q=90&fit=crop',
];

const DREAMER_TAG = "It's not just happily married. It's getting married happily.";
const MAKER_TAG = "Behind every dream, there is a Maker.";

type Screen = 'landing' | 'panel' | 'dreamer' | 'maker' | 'otp' | 'otp2' | 'request' | 'signin' | 'signin2';
type Role = 'Dreamer' | 'Maker';

export default function Home() {
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const slidesRef = useRef<string[]>(FALLBACK_SLIDES);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [screen, setScreen] = useState<Screen>('landing');
  const [role, setRole] = useState<Role>('Dreamer');
  const [cur, setCur] = useState(0);
  const [slides, setSlides] = useState<string[]>(FALLBACK_SLIDES);
  useEffect(() => { slidesRef.current = slides; }, [slides]);
  const [tagVis, setTagVis] = useState(true);
  const [tagText, setTagText] = useState(DREAMER_TAG);
  const [panelUp, setPanelUp] = useState(false);
  const [creamVis, setCreamVis] = useState(false);
  const [creamOp, setCreamOp] = useState(0);
  const [desatOp, setDesatOp] = useState(0);
  const [washY, setWashY] = useState(100);
  const [washOp, setWashOp] = useState(0);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [instagram, setInstagram] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [reqDone, setReqDone] = useState(false);
  const [toast, setToast] = useState('');

  const ease = 'cubic-bezier(0.22,1,0.36,1)';
  const S: React.CSSProperties = { position: 'absolute', inset: 0 };

  const startCarousel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setCur(c => (c + 1) % slidesRef.current.length), 2500);
  }, []);

  useEffect(() => {
    fetch(`${BACKEND}/api/v2/cover-photos`)
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setSlides(d.photos.map((p: any) => p.image_url)); })
      .catch(() => {});
    startCarousel();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const triggerThreshold = useCallback((target: Screen) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDesatOp(0.8);
    setTimeout(() => { setWashY(0); setWashOp(1); }, 500);
    setTimeout(() => { setScreen(target); setCreamVis(true); }, 1800);
    setTimeout(() => { setCreamOp(1); }, 1900);
  }, []);

  const reverseThreshold = useCallback(() => {
    setCreamOp(0);
    setTimeout(() => { setCreamVis(false); setWashY(100); setWashOp(0); }, 200);
    setTimeout(() => { setDesatOp(0); }, 600);
    setTimeout(() => {
      startCarousel();
      setScreen(role === 'Dreamer' ? 'dreamer' : 'maker');
      setPanelUp(true);
    }, 1800);
  }, [role, startCarousel]);

  const swapTag = (to: Role) => {
    setTagVis(false);
    setTimeout(() => { setTagText(to === 'Maker' ? MAKER_TAG : DREAMER_TAG); setTagVis(true); }, 400);
  };

  const selectRole = (r: Role) => {
    setRole(r);
    swapTag(r);
    setScreen(r === 'Dreamer' ? 'dreamer' : 'maker');
  };

  const handleScreenTap = () => {
    if (screen === 'landing') {
      setPanelUp(true);
      setScreen('panel');
    }
  };

  const handleOtpInput = (i: number, val: string) => {
    const n = [...otp]; n[i] = val; setOtp(n);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const sendOtp = async () => {
    try {
      const r = await fetch(`${BACKEND}/api/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, '') })
      });
      const d = await r.json();
      if (d.sessionInfo) localStorage.setItem('otp_session', d.sessionInfo);
      setScreen(screen === 'signin' ? 'signin2' : 'otp2');
    } catch { showToast('Could not send code. Try again.'); }
  };

  const verifyOtp = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo: localStorage.getItem('otp_session') || 'admin_sdk_' + phone.replace(/\D/g, ''), code: otp.join('') })
      });
      const d = await res.json();
      if (d.success) {
        const isVendor = role !== 'Dreamer';
        const sessionKey = isVendor ? 'vendor_web_session' : 'couple_web_session';
        const userId = d.localId;
        const sessionData = { idToken: d.idToken, localId: userId, phoneNumber: d.phoneNumber, vendorId: userId, userId: userId, phone: phone.replace(/\D/g, '') };
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        // Check if PIN is already set
        try {
          const pinRes = await fetch(`${BACKEND}/api/v2/auth/pin-status?userId=${userId}&role=${isVendor ? 'vendor' : 'couple'}`);
          const pinData = await pinRes.json();
          if (pinData.pin_set) {
            router.push(isVendor ? '/vendor/pin-login' : '/couple/pin-login');
          } else {
            router.push(isVendor ? '/vendor/pin' : '/couple/pin');
          }
        } catch {
          router.push(isVendor ? '/vendor/today' : '/couple/today');
        }
      } else showToast(d.error || 'Incorrect code.');
    } catch { showToast('Verification failed.'); }
  };

  const submitRequest = async () => {
    try {
      await fetch(`${BACKEND}/api/v2/waitlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, instagram, role })
      });
      setReqDone(true);
    } catch { showToast('Could not submit. Try again.'); }
  };

  const isDark = ['landing', 'panel', 'dreamer', 'maker'].includes(screen);

  const btnBase: React.CSSProperties = {
    fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9,
    letterSpacing: '0.2em', textTransform: 'uppercase',
    cursor: 'pointer', touchAction: 'manipulation', border: 'none',
  };

  return (
    <div
      style={{ ...S, overflow: 'hidden', background: '#0C0A09' }}
      onClick={handleScreenTap}
    >
      {/* SLIDES */}
      {slides.map((url, i) => (
        <div key={i} style={{
          ...S,
          backgroundImage: `url(${url})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === cur ? 1 : 0,
          transition: `opacity 2.5s ${ease}`,
          willChange: 'opacity', transform: 'translateZ(0)',
        }} />
      ))}

      {/* VIGNETTE */}
      <div style={{
        ...S, zIndex: 2,
        background: 'radial-gradient(ellipse at 50% 60%, transparent 25%, rgba(0,0,0,0.5) 100%)',
        pointerEvents: 'none',
      }} />

      {/* DESAT LAYER */}
      <div style={{
        ...S, zIndex: 6, background: '#0C0A09',
        opacity: desatOp, transition: 'opacity 0.7s ease',
        willChange: 'opacity', transform: 'translateZ(0)', pointerEvents: 'none',
      }} />

      {/* WASH LAYER */}
      <div style={{
        ...S, zIndex: 7, background: '#F8F7F5',
        opacity: washOp, transform: `translateZ(0) translateY(${washY}%)`,
        transition: `transform 1.5s ${ease}, opacity 0.6s ease`,
        willChange: 'transform, opacity', pointerEvents: 'none',
      }} />

      {/* BOTTOM NAV STRIP — always pinned to bottom, exactly tagline height */}
      {isDark && (
        <div
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            zIndex: 20,
            background: 'rgba(8,6,4,0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            // Height animates: compact when just tagline, taller when panel up
            maxHeight: panelUp ? '60vh' : '80px',
            transition: `max-height 2.5s ${ease}`,
            willChange: 'max-height',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* TAGLINE — always inside the strip */}
          <div
            style={{
              padding: '18px 24px',
              textAlign: 'center',
              opacity: tagVis ? 1 : 0,
              transition: 'opacity 0.4s ease',
              cursor: screen === 'landing' ? 'pointer' : 'default',
            }}
            onClick={screen === 'landing' ? (e => { e.stopPropagation(); setPanelUp(true); setScreen('panel'); }) : undefined}
          >
            <p style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontStyle: 'italic', fontWeight: 300,
              fontSize: 16, color: '#C9A84C',
              letterSpacing: '0.04em', lineHeight: 1.6,
              margin: 0,
            }}>{tagText}</p>
          </div>

          {/* PANEL CONTENT — appears when panel rises */}
          {screen === 'panel' && (
            <div style={{ width: '100%', padding: '0 24px 32px' }}>
              <p style={{
                textAlign: 'center',
                fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 9,
                color: 'rgba(248,247,245,0.4)', letterSpacing: '0.22em',
                textTransform: 'uppercase', marginBottom: 14,
              }}>Are you a</p>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <button
                  onClick={() => selectRole('Dreamer')}
                  style={{ ...btnBase, flex: 1, padding: '14px 0', background: '#C9A84C', color: '#0C0A09' }}
                >Dreamer</button>
                <button
                  onClick={() => selectRole('Maker')}
                  style={{ ...btnBase, flex: 1, padding: '14px 0', background: 'transparent', border: '0.5px solid rgba(248,247,245,0.25)', color: '#F8F7F5' }}
                >Maker</button>
              </div>
              <button
                onClick={() => { setPanelUp(false); setScreen('landing'); }}
                style={{ ...btnBase, display: 'block', margin: '0 auto', background: 'none', color: 'rgba(248,247,245,0.3)', fontSize: 8 }}
              >← dismiss</button>
            </div>
          )}

          {/* ROLE OPTIONS */}
          {(screen === 'dreamer' || screen === 'maker') && (
            <div style={{ width: '100%', padding: '0 24px 32px' }}>
              <button
                onClick={() => setScreen('panel')}
                style={{ background: 'none', border: 'none', color: 'rgba(248,247,245,0.5)', fontFamily: '"Jost",sans-serif', fontWeight: 200, fontSize: 18, cursor: 'pointer', marginBottom: 10, touchAction: 'manipulation' }}
              >←</button>
              <p style={{ textAlign: 'center', fontFamily: '"Jost",sans-serif', fontWeight: 200, fontSize: 7.5, color: 'rgba(201,168,76,0.75)', letterSpacing: '0.28em', textTransform: 'uppercase', marginBottom: 6 }}>{role}</p>
              <div style={{ width: 22, height: 0.5, background: '#C9A84C', opacity: 0.4, margin: '0 auto 16px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => triggerThreshold('invite')} style={{ ...btnBase, width: '100%', padding: '13px 0', background: '#C9A84C', color: '#0C0A09' }}>I have an invite</button>
                <button onClick={() => triggerThreshold('request')} style={{ ...btnBase, width: '100%', padding: '13px 0', background: 'transparent', border: '0.5px solid rgba(248,247,245,0.28)', color: '#F8F7F5' }}>Request an invite</button>
                <button onClick={() => triggerThreshold('signin')} style={{ ...btnBase, width: '100%', padding: '8px 0', background: 'transparent', color: 'rgba(248,247,245,0.38)', fontSize: 8 }}>Already a member — Sign in</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREAM SCREENS */}
      {creamVis && (
        <div style={{
          ...S, zIndex: 30, background: '#F8F7F5',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '44px 26px 36px',
          opacity: creamOp,
          transform: creamOp === 1 ? 'translateY(0)' : 'translateY(8px)',
          transition: `opacity 0.6s ${ease}, transform 0.6s ${ease}`,
        }}>
          <button
            onClick={reverseThreshold}
            style={{ position: 'absolute', top: 32, left: 18, background: 'none', border: 'none', fontFamily: '"Jost",sans-serif', fontWeight: 200, fontSize: 20, color: '#888580', cursor: 'pointer', touchAction: 'manipulation' }}
          >←</button>

          <p style={{ fontFamily: '"Cormorant Garamond",serif', fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: '#111111', letterSpacing: '0.1em', marginBottom: 3, textAlign: 'center' }}>The Dream Wedding</p>
          <p style={{ fontFamily: '"Cormorant Garamond",serif', fontStyle: 'italic', fontWeight: 300, fontSize: 13, color: '#888580', letterSpacing: '0.04em', marginBottom: 5, textAlign: 'center' }}>{role === 'Dreamer' ? DREAMER_TAG : MAKER_TAG}</p>
          <p style={{ fontFamily: '"Jost",sans-serif', fontWeight: 200, fontSize: 7, color: '#C9A84C', letterSpacing: '0.26em', textTransform: 'uppercase', marginBottom: 7, textAlign: 'center' }}>The Curated Wedding OS</p>
          <div style={{ width: 18, height: 0.5, background: '#C9A84C', opacity: 0.4, marginBottom: 28 }} />

          {screen === 'invite' && (<>
            <p style={{ fontFamily: '"Cormorant Garamond",serif', fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>Enter your invite.</p>
            <p style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>Your code unlocks access.</p>
            <div style={{ width: '100%', marginBottom: 18 }}>
              <span style={{ display: 'block', fontFamily: '"Jost",sans-serif', fontWeight: 200, fontSize: 7, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 7 }}>Invite code</span>
              <input
                value={inviteCode} onChange={e => { setInviteCode(e.target.value.toUpperCase()); setInviteError(''); }}
                type="text" maxLength={8} placeholder="XXXXXX"
                style={{ width: '100%', border: 'none', borderBottom: '1px solid #E2DED8', background: 'transparent', outline: 'none', fontFamily: '"DM Sans",sans-serif', fontWeight: 300, fontSize: 20, color: '#111111', padding: '7px 0', letterSpacing: '0.15em', textAlign: 'center' }}
              />
              {inviteError && <p style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 300, fontSize: 11, color: '#C9A84C', textAlign: 'center', marginTop: 8 }}>{inviteError}</p>}
            </div>
            <button onClick={async () => {
              if (!inviteCode.trim()) return;
              try {
                const r = await fetch(`${BACKEND}/api/v2/invite/validate`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code: inviteCode.trim(), role: role === 'Dreamer' ? 'dreamer' : 'vendor' })
                });
                const d = await r.json();
                if (d.valid) {
                  setScreen('otp');
                } else {
                  setInviteError(d.error || 'Invalid or expired code.');
                }
              } catch { setInviteError('Could not verify code. Try again.'); }
            }} style={{ width: '100%', padding: '14px 0', background: '#111111', color: '#F8F7F5', border: 'none', fontFamily: '"Jost",sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 12, touchAction: 'manipulation' }}>Continue</button>
          </>)}

          {(screen === 'otp' || screen === 'signin') && (<>
            <p style={{ fontFamily: '"Cormorant Garamond",serif', fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>
              {screen === 'signin' ? 'Welcome back.' : "Welcome. Let's begin."}
            </p>
            <p style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 28 }}>Enter your number. We'll send a code.</p>
            <div style={{ width: '100%', marginBottom: 18 }}>
              <span style={{ display: 'block', fontFamily: '"Jost",sans-serif', fontWeight: 200, fontSize: 7, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 7 }}>Phone number</span>
              <input
                value={phone} onChange={e => setPhone(e.target.value)}
                type="tel" maxLength={14} placeholder="+91 00000 00000"
                style={{ width: '100%', border: 'none', borderBottom: '1px solid #E2DED8', background: 'transparent', outline: 'none', fontFamily: '"DM Sans",sans-serif', fontWeight: 300, fontSize: 13, color: '#111111', padding: '7px 0' }}
              />
            </div>
            <button onClick={sendOtp} style={{ width: '100%', padding: '14px 0', background: '#111111', color: '#F8F7F5', border: 'none', fontFamily: '"Jost",sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 12, touchAction: 'manipulation' }}>Send code</button>
          </>)}

          {(screen === 'otp2' || screen === 'signin2') && (<>
            <p style={{ fontFamily: '"Cormorant Garamond",serif', fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>Check your messages.</p>
            <p style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 24 }}>Enter the 6-digit code we sent you.</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 28, justifyContent: 'center' }}>
              {otp.map((v, i) => (
                <input
                  key={i} ref={el => { otpRefs.current[i] = el; }}
                  value={v} onChange={e => handleOtpInput(i, e.target.value)}
                  onKeyDown={e => handleOtpKey(i, e)}
                  type="tel" maxLength={1}
                  style={{ width: 36, height: 44, border: 'none', borderBottom: '1.5px solid #E2DED8', background: 'transparent', outline: 'none', fontFamily: '"DM Sans",sans-serif', fontWeight: 400, fontSize: 18, color: '#111111', textAlign: 'center' }}
                />
              ))}
            </div>
            <button onClick={verifyOtp} style={{ width: '100%', padding: '14px 0', background: '#111111', color: '#F8F7F5', border: 'none', fontFamily: '"Jost",sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 12, touchAction: 'manipulation' }}>Verify</button>
            <button style={{ background: 'none', border: 'none', fontFamily: '"Jost",sans-serif', fontWeight: 200, fontSize: 8, color: '#AAAAAA', letterSpacing: '0.18em', textTransform: 'uppercase', cursor: 'pointer' }}>Resend code</button>
          </>)}

          {screen === 'request' && (reqDone ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: '"Cormorant Garamond",serif', fontStyle: 'italic', fontWeight: 300, fontSize: 36, color: '#111111', marginBottom: 12 }}>Received.</p>
              <p style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 300, fontSize: 11, color: '#888580', fontStyle: 'italic', lineHeight: 1.7 }}>We review every request personally.</p>
            </div>
          ) : (<>
            <p style={{ fontFamily: '"Cormorant Garamond",serif', fontWeight: 300, fontSize: 28, color: '#111111', textAlign: 'center', lineHeight: 1.12, marginBottom: 7 }}>Request an invite.</p>
            <p style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', textAlign: 'center', lineHeight: 1.65, marginBottom: 24 }}>We're selective. We'll reach out.</p>
            <div style={{ width: '100%', marginBottom: 16 }}>
              <span style={{ display: 'block', fontFamily: '"Jost",sans-serif', fontWeight: 200, fontSize: 7, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 7 }}>Phone number</span>
              <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+91 00000 00000" style={{ width: '100%', border: 'none', borderBottom: '1px solid #E2DED8', background: 'transparent', outline: 'none', fontFamily: '"DM Sans",sans-serif', fontWeight: 300, fontSize: 13, color: '#111111', padding: '7px 0' }} />
            </div>
            <div style={{ width: '100%', marginBottom: 24 }}>
              <span style={{ display: 'block', fontFamily: '"Jost",sans-serif', fontWeight: 200, fontSize: 7, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 7 }}>Instagram</span>
              <input value={instagram} onChange={e => setInstagram(e.target.value)} type="text" placeholder="@yourhandle" style={{ width: '100%', border: 'none', borderBottom: '1px solid #E2DED8', background: 'transparent', outline: 'none', fontFamily: '"DM Sans",sans-serif', fontWeight: 300, fontSize: 13, color: '#111111', padding: '7px 0' }} />
            </div>
            <button onClick={submitRequest} style={{ width: '100%', padding: '14px 0', background: '#111111', color: '#F8F7F5', border: 'none', fontFamily: '"Jost",sans-serif', fontWeight: 300, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 10, touchAction: 'manipulation' }}>Submit</button>
            <p style={{ fontFamily: '"DM Sans",sans-serif', fontWeight: 300, fontSize: 10, color: '#AAAAAA', fontStyle: 'italic', textAlign: 'center', lineHeight: 1.7 }}>We review every request personally.</p>
          </>))}
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#FFFFFF', border: '0.5px solid #E2DED8', padding: '10px 20px', zIndex: 50, fontFamily: '"DM Sans",sans-serif', fontWeight: 300, fontSize: 13, color: '#888580', whiteSpace: 'nowrap', borderRadius: 4 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
