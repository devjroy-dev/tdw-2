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

export default function CouplePinPage() {
  const router = useRouter();
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirm, setConfirm] = useState(['', '', '', '']);
  const [shakingConfirm, setShakingConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  useEffect(() => {
    // If already set, skip
    try {
      const s = JSON.parse(localStorage.getItem('couple_session') || '{}');
      if (s?.pin_set) { router.replace('/couple/today'); return; }
    } catch {}
    pinRefs.current[0]?.focus();
  }, []);

  const handlePin = (idx: number, val: string, refs: React.MutableRefObject<(HTMLInputElement | null)[]>, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    if (!/^\d*$/.test(val)) return;
    const v = val.slice(-1);
    setter(prev => { const n = [...prev]; n[idx] = v; return n; });
    if (v && idx < 3) refs.current[idx + 1]?.focus();
  };

  const handleBackspace = (idx: number, val: string, refs: React.MutableRefObject<(HTMLInputElement | null)[]>, setter: React.Dispatch<React.SetStateAction<string[]>>, arr: string[]) => {
    if (val === '' && idx > 0) {
      setter(prev => { const n = [...prev]; n[idx - 1] = ''; return n; });
      refs.current[idx - 1]?.focus();
    }
  };

  const allFilled = pin.every(d => d) && confirm.every(d => d);

  const submit = async () => {
    if (!allFilled) return;
    const pinStr = pin.join('');
    const confirmStr = confirm.join('');
    if (pinStr !== confirmStr) {
      setShakingConfirm(true);
      setTimeout(() => setShakingConfirm(false), 400);
      showToast('PINs don\'t match');
      setConfirm(['', '', '', '']);
      confirmRefs.current[0]?.focus();
      return;
    }
    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('couple_session') || '{}');
      const r = await fetch(`${API}/api/v2/auth/set-pin`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.id, pin: pinStr, role: 'user' }),
      });
      const d = await r.json();
      if (d.success) {
        localStorage.setItem('couple_session', JSON.stringify({ ...session, pin_set: true }));
        router.replace('/couple/today');
      } else {
        showToast('Could not set PIN. Try again.');
      }
    } catch {
      showToast('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const skip = () => { router.replace('/couple/today'); };

  const boxStyle = (focused?: boolean): React.CSSProperties => ({
    width: 52, height: 64,
    background: 'transparent', border: 'none', outline: 'none',
    borderBottom: `2px solid ${focused ? '#C9A84C' : '#E2DED8'}`,
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
          {/* Wordmark */}
          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: '#111111', marginBottom: 6 }}>The Dream Wedding</div>
          <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11, color: '#888580', marginBottom: 16 }}>It's not just happily married. It's getting married happily.</div>
          <div style={{ height: 0.5, background: '#C9A84C', opacity: 0.4, margin: '0 auto 32px', width: 40 }} />

          <div style={{ fontFamily: '"Cormorant Garamond", serif', fontWeight: 300, fontSize: 28, color: '#111111', marginBottom: 8 }}>Create your PIN.</div>
          <div style={{ fontFamily: '"DM Sans", sans-serif', fontWeight: 300, fontSize: 11.5, color: '#888580', marginBottom: 36 }}>Four digits. Quick access every time.</div>

          {/* PIN entry */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              {pin.map((d, i) => (
                <input
                  key={i}
                  ref={el => { pinRefs.current[i] = el; }}
                  type="tel"
                  maxLength={1}
                  value={d}
                  onChange={e => handlePin(i, e.target.value, pinRefs, setPin)}
                  onKeyDown={e => { if (e.key === 'Backspace') handleBackspace(i, d, pinRefs, setPin, pin); }}
                  style={boxStyle(document.activeElement === pinRefs.current[i])}
                />
              ))}
            </div>
          </div>

          {/* Confirm PIN */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 7, color: '#888580', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 12 }}>Confirm PIN</div>
            <div className={shakingConfirm ? 'pin-shake' : ''} style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              {confirm.map((d, i) => (
                <input
                  key={i}
                  ref={el => { confirmRefs.current[i] = el; }}
                  type="tel"
                  maxLength={1}
                  value={d}
                  onChange={e => handlePin(i, e.target.value, confirmRefs, setConfirm)}
                  onKeyDown={e => { if (e.key === 'Backspace') handleBackspace(i, d, confirmRefs, setConfirm, confirm); if (e.key === 'Enter' && allFilled) submit(); }}
                  style={boxStyle(document.activeElement === confirmRefs.current[i])}
                />
              ))}
            </div>
          </div>

          <div style={{ marginTop: 36 }}>
            <button
              onClick={submit}
              disabled={!allFilled || loading}
              style={{
                width: '100%', background: allFilled ? '#111111' : '#E2DED8',
                color: allFilled ? '#F8F7F5' : '#888580',
                border: 'none', padding: '14px 0',
                fontFamily: '"Jost", sans-serif', fontWeight: 300, fontSize: 9,
                letterSpacing: '0.22em', textTransform: 'uppercase',
                cursor: allFilled ? 'pointer' : 'not-allowed', borderRadius: 2,
                transition: 'all 0.2s ease',
                touchAction: 'manipulation',
              }}
            >{loading ? 'Setting PIN…' : 'Set PIN'}</button>

            <button onClick={skip} style={{ marginTop: 16, background: 'none', border: 'none', fontFamily: '"Jost", sans-serif', fontWeight: 200, fontSize: 8, color: '#AAAAAA', cursor: 'pointer', letterSpacing: '0.15em', touchAction: 'manipulation' }}>Skip for now</button>
          </div>
        </div>
      </div>
    </>
  );
}
