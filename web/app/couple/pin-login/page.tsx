'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; background: #F8F7F5; }
  @keyframes fadeIn { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  @keyframes slideDown { from{opacity:0;transform:translateY(-40px)} to{opacity:1;transform:translateY(0)} }
  .pin-enter { animation: fadeIn 320ms cubic-bezier(0.22,1,0.36,1) both; }
  .pin-shake { animation: shake 320ms cubic-bezier(0.22,1,0.36,1); }
  .toast-in { animation: slideDown 280ms cubic-bezier(0.22,1,0.36,1) both; }
`;

export default function CouplePinLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState(['', '', '', '']);
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [attempts, setAttempts] = useState(0);
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  useEffect(() => {
    try {
      // Check URL params first (cross-domain session handoff)
      const params = new URLSearchParams(window.location.search);
      const uid = params.get('uid');
      const phone = params.get('phone');
      const pinSetParam = params.get('pin_set');
      if (uid && pinSetParam === 'true') {
        const sd = { id: uid, userId: uid, phone, pin_set: true };
        localStorage.setItem('couple_web_session', JSON.stringify(sd));
        localStorage.setItem('couple_session', JSON.stringify(sd));
        window.history.replaceState({}, '', '/couple/pin-login');
        pinRefs.current[0]?.focus();
        return;
      }
      const s = JSON.parse(localStorage.getItem('couple_web_session') || localStorage.getItem('couple_session') || '{}');
      if ((!s?.id && !s?.userId) || !s?.pin_set) { router.replace('/couple/login'); return; }
    } catch { router.replace('/couple/login'); return; }
    pinRefs.current[0]?.focus();
  }, []);

  const handleInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const v = val.slice(-1);
    setPin(prev => {
      const n = [...prev]; n[idx] = v;
      // auto-submit on 4th digit
      if (idx === 3 && v) {
        const full = [...n];
        setTimeout(() => verify(full.join('')), 80);
      }
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

  const verify = async (pinStr: string) => {
    if (loading) return;
    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('couple_web_session') || localStorage.getItem('couple_session') || '{}');
      const r = await fetch(`${API}/api/v2/auth/verify-pin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.userId || session.id, pin: pinStr, role: 'couple', phone: session.phone }),
      });
      const d = await r.json();
      if (d.success) {
        router.replace('/couple/today');
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setShaking(true);
        setTimeout(() => setShaking(false), 400);
        setPin(['', '', '', '']);
        pinRefs.current[0]?.focus();
        if (newAttempts >= 5) {
          showToast('Too many attempts. Use OTP instead.');
          setTimeout(() => { localStorage.removeItem('couple_web_session'); localStorage.removeItem('couple_session'); router.replace('/couple/login'); }, 1800);
        } else {
          showToast(`Incorrect PIN. ${5 - newAttempts} ${5 - newAttempts === 1 ? 'attempt' : 'attempts'} left.`);
        }
      }
    } catch {
      showToast('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const useOtp = () => { localStorage.removeItem('couple_web_session'); localStorage.removeItem('couple_session'); router.replace('/couple/login'); };

  const boxStyle = (): React.CSSProperties => ({
    width: 52, height: 64,
    background: 'transparent', border: 'none', outline: 'none',
    borderBottom: '2px solid #E2DED8',
    fontFamily: '"DM Sans", sans-serif', fontWeight: 400, fontSize: 28,
    color: '#111111', textAlign: 'center',
    touchAction: 'manipulation',
    transition: 'border-color 0.18s ease',
  });

  return (
    <>
      <style>{fonts}</style>
      {toast && (
        <div className="toast-in" style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', background: '#111111', color: '#F8F7F5', fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 13, padding: '10px 22px', borderRadius: 4, zIndex: 9999, whiteSpace: 'nowrap' }}>{toast}</div>
      )}

      <div style={{ minHeight: '100vh', background: '#F8F7F5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 40px' }}>
        <div className="pin-enter" style={{ width: '100%', maxWidth: 380, textAlign: 'center' }}>
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: '#111111', marginBottom: 6 }}>The Dream Wedding</div>
          <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11, color: '#888580', marginBottom: 16 }}>It's not just happily married. It's getting married happily.</div>
          <div style={{ height: 0.5, background: '#C9A84C', opacity: 0.4, margin: '0 auto 32px', width: 40 }} />

          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', marginBottom: 8 }}>Welcome back.</div>
          <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', marginBottom: 36 }}>Enter your PIN to continue.</div>

          <div className={shaking ? 'pin-shake' : ''} style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 36 }}>
            {pin.map((d, i) => (
              <input
                key={i}
                ref={el => { pinRefs.current[i] = el; }}
                type="tel"
                maxLength={1}
                value={d}
                onChange={e => handleInput(i, e.target.value)}
                onKeyDown={e => { if (e.key === 'Backspace') handleBackspace(i, d); }}
                style={boxStyle()}
                disabled={loading}
              />
            ))}
          </div>

          {loading && (
            <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 12, color: '#888580', marginBottom: 24 }}>Verifying…</div>
          )}

          <button onClick={useOtp} style={{ background: 'none', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#AAAAAA', cursor: 'pointer', letterSpacing: '0.15em', touchAction: 'manipulation' }}>Forgot PIN? Use OTP instead</button>
        </div>
      </div>
    </>
  );
}
