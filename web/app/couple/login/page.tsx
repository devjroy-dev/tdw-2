'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;1,300;1,400&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
  * { box-sizing: border-box; }
  body { margin: 0; background: #F8F7F5; }
  ::-webkit-scrollbar { display: none; }
  @keyframes slideUp   { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideDown { from { transform:translateY(-48px); opacity:0; } to { transform:translateY(0); opacity:1; } }
  @keyframes shake     { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  .step-enter   { animation: slideUp   280ms cubic-bezier(0.22,1,0.36,1) both; }
  .toast-enter  { animation: slideDown 280ms cubic-bezier(0.22,1,0.36,1) both; }
  .otp-shake    { animation: shake     320ms cubic-bezier(0.22,1,0.36,1); }
  .resend-appear{ animation: fadeIn    300ms ease both; }
`;

function maskPhone(p: string) {
  if (p.length < 4) return p;
  return p.slice(0,2) + '×'.repeat(p.length - 4) + p.slice(-2);
}

export default function CoupleLoginPage() {
  const router = useRouter();
  const [step, setStep]         = useState<1|2>(1);
  const [phone, setPhone]       = useState('');
  const [otp, setOtp]           = useState(['','','','','','']);
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState<string|null>(null);
  const [resendVisible, setResendVisible] = useState(false);
  const [shakeOtp, setShakeOtp] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [stepKey, setStepKey]   = useState(0);
  const otpRefs  = useRef<(HTMLInputElement|null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session');
      if (raw) { const s = JSON.parse(raw); if (s?.id) router.replace('/couple/today'); }
    } catch { /* noop */ }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const startResendTimer = () => {
    setResendVisible(false);
    setResendTimer(30);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); setResendVisible(true); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    if (phone.length !== 10) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/v2/couple/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');
      setStep(2); setStepKey(k => k+1); startResendTimer();
    } catch (e: unknown) { showToast((e as Error).message || "Couldn't send code. Try again."); }
    finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    const code = otp.join('');
    if (code.length !== 6) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/v2/couple/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setShakeOtp(true); setTimeout(() => setShakeOtp(false), 400);
        showToast('Incorrect code. Try again.'); return;
      }
      if (res.status === 404) { showToast('No account found. Join the waitlist.'); return; }
      if (!res.ok || !data.success) throw new Error(data.error || 'Verification failed');
      localStorage.setItem('couple_session', JSON.stringify({
        id: data.user.id, name: data.user.name, phone: data.user.phone,
      }));
      router.replace('/couple/today');
    } catch (e: unknown) { showToast((e as Error).message || 'Verification failed. Try again.'); }
    finally { setLoading(false); }
  };

  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g,'').slice(-1);
    const next  = [...otp]; next[idx] = digit; setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx+1]?.focus();
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs.current[idx-1]?.focus();
  };

  const goBack = () => {
    setStep(1); setStepKey(k => k+1); setOtp(['','','','','','']);
    setResendVisible(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleResend = async () => {
    startResendTimer(); setOtp(['','','','','','']); setLoading(true);
    try {
      const res  = await fetch(`${API}/api/v2/couple/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');
    } catch { showToast("Couldn't resend code. Try again."); }
    finally { setLoading(false); }
  };

  const btn: React.CSSProperties = {
    width: '100%', height: 52, background: '#111111', color: '#C9A84C',
    fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: 400,
    letterSpacing: '0.2em', textTransform: 'uppercase', border: 'none',
    borderRadius: 8, cursor: 'pointer', transition: 'opacity 180ms', marginTop: 8,
  };
  const btnOff: React.CSSProperties = { ...btn, opacity: 0.4, cursor: 'not-allowed' };

  return (
    <>
      <style>{fonts}</style>

      {toast && (
        <div className="toast-enter" style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#111111', color: '#F8F7F5',
          fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 300,
          padding: '12px 20px', borderRadius: 10, zIndex: 999,
          whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}>
          {toast}
        </div>
      )}

      <div style={{
        minHeight: '100dvh', background: '#F8F7F5',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', position: 'relative',
      }}>

        {/* STEP 1 — Phone */}
        {step === 1 && (
          <div key={`s1-${stepKey}`} className="step-enter" style={{ width: '100%', maxWidth: 380 }}>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, fontWeight: 400, fontStyle: 'italic', color: '#C9A84C', textAlign: 'center', margin: '0 0 6px' }}>TDW</p>
            <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#888580', textAlign: 'center', margin: '0 0 48px' }}>Dreamer Login</p>

            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, fontWeight: 300, color: '#111111', margin: '0 0 10px' }}>Welcome back.</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 300, color: '#555250', margin: '0 0 36px' }}>Enter your phone number to continue.</p>

            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #E2DED8', height: 56, marginBottom: 28 }}>
              <div style={{ background: '#F4EFE7', borderRadius: 6, padding: '0 12px', height: 36, display: 'flex', alignItems: 'center', fontFamily: "'DM Sans',sans-serif", fontSize: 15, fontWeight: 300, color: '#888580', flexShrink: 0, marginRight: 12 }}>+91</div>
              <input
                type="tel" inputMode="numeric" maxLength={10} value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                onKeyDown={e => { if (e.key === 'Enter' && phone.length === 10) sendOtp(); }}
                placeholder="9999999999"
                style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontFamily: "'DM Sans',sans-serif", fontSize: 18, fontWeight: 300, color: '#111111', caretColor: '#C9A84C' }}
              />
            </div>

            <button onClick={sendOtp} disabled={phone.length !== 10 || loading} style={phone.length === 10 && !loading ? btn : btnOff}>
              {loading ? 'Sending…' : 'Send Code'}
            </button>

            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', textAlign: 'center', marginTop: 24 }}>
              New to TDW?{' '}
              <a href="mailto:hello@thedreamwedding.in" style={{ color: '#888580', textDecoration: 'underline' }}>Join the waitlist →</a>
            </p>
          </div>
        )}

        {/* STEP 2 — OTP */}
        {step === 2 && (
          <div key={`s2-${stepKey}`} className="step-enter" style={{ width: '100%', maxWidth: 380 }}>
            <button onClick={goBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 40, fontFamily: "'Jost',sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888580' }}>
              ← Back
            </button>

            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 32, fontWeight: 300, color: '#111111', margin: '0 0 10px' }}>Check your messages.</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, fontWeight: 300, color: '#555250', margin: '0 0 36px' }}>
              We sent a 6-digit code to +91 {maskPhone(phone)}
            </p>

            <div className={shakeOtp ? 'otp-shake' : ''} style={{ display: 'flex', gap: 10, marginBottom: 32, justifyContent: 'center' }}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => { otpRefs.current[idx] = el; }}
                  type="tel" inputMode="numeric" maxLength={1} value={digit}
                  onChange={e => handleOtpChange(idx, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(idx, e)}
                  style={{ width: 48, height: 56, textAlign: 'center', fontFamily: "'DM Sans',sans-serif", fontSize: 22, fontWeight: 300, color: '#111111', background: 'transparent', border: `1px solid ${digit ? '#C9A84C' : '#E2DED8'}`, borderRadius: 8, outline: 'none', caretColor: '#C9A84C', transition: 'border-color 180ms' }}
                  onFocus={e => { e.target.style.borderColor = '#C9A84C'; }}
                  onBlur={e  => { e.target.style.borderColor = digit ? '#C9A84C' : '#E2DED8'; }}
                />
              ))}
            </div>

            <button onClick={verifyOtp} disabled={otp.join('').length !== 6 || loading} style={otp.join('').length === 6 && !loading ? btn : btnOff}>
              {loading ? 'Verifying…' : 'Verify'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 20, minHeight: 24 }}>
              {resendVisible
                ? <button onClick={handleResend} className="resend-appear" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#888580', textDecoration: 'underline' }}>Resend code</button>
                : <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#C8C4BE', margin: 0 }}>Resend in {resendTimer}s</p>
              }
            </div>
          </div>
        )}
      </div>
    </>
  );
}
