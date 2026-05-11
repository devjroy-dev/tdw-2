'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  API, INK, CREAM, GOLD, MUTED, HAIRLINE, FONT_EYEBROW, FONT_DISPLAY, FONT_BODY,
  CircleSession, CircleSessionContext,
} from './CircleSessionContext';
import TabBar from './TabBar';

const SESSION_KEY = 'circle_session';
const LAST_PATH_KEY = 'circle_last_path';

export default function CoplannerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const [session, setSession] = useState<CircleSession | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'no_session' | 'error'>('loading');

  // Persist last path so a returning install lands where Mom left off.
  useEffect(() => {
    if (state !== 'ready' || !pathname) return;
    try { localStorage.setItem(LAST_PATH_KEY, pathname); } catch {}
  }, [pathname, state]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      let cached: CircleSession | null = null;
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) cached = JSON.parse(raw) as CircleSession;
      } catch {}

      if (!cached || !cached.user_id) {
        if (!cancelled) setState('no_session');
        return;
      }

      if (!cancelled) {
        setSession(cached);
        setState('ready');
      }

      // Refresh permissions in the background. Don't block the UI.
      try {
        const r = await fetch(`${API}/api/v2/circle/session/${cached.user_id}`);
        const d = await r.json();
        if (cancelled) return;
        if (d.success && d.data) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(d.data));
          setSession(d.data as CircleSession);
        }
      } catch {
        // Network blip — keep using cached session.
      }
    };

    hydrate();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: INK,
      color: CREAM,
      fontFamily: FONT_BODY,
    }}>
      {state === 'loading' && (
        <FullScreenMessage title="" sub="Loading…" />
      )}

      {state === 'no_session' && (
        <CoplannerSignIn
          onSuccess={(s: CircleSession) => {
            localStorage.setItem(SESSION_KEY, JSON.stringify(s));
            setSession(s);
            setState('ready');
          }}
        />
      )}

      {state === 'ready' && session && (
        <CircleSessionContext.Provider value={session}>
          <main style={{
            maxWidth: 480, margin: '0 auto',
            padding: '24px 20px 96px',
            minHeight: '100vh',
          }}>
            {children}
          </main>
          <TabBar />
        </CircleSessionContext.Provider>
      )}
    </div>
  );
}

function FullScreenMessage({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 32,
    }}>
      {title && (
        <p style={{
          fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: 300,
          fontSize: 28, color: CREAM, margin: '0 0 8px', textAlign: 'center',
        }}>{title}</p>
      )}
      <p style={{
        fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13,
        color: MUTED, textAlign: 'center', lineHeight: 1.6, maxWidth: 320,
      }}>{sub}</p>
      <span style={{ color: GOLD, fontSize: 1, opacity: 0 }}>·</span>
    </div>
  );
}

function CoplannerSignIn({ onSuccess }: { onSuccess: (session: CircleSession) => void }) {
  const [step, setStep] = useState<'phone' | 'pin' | 'verifying'>('phone');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const submitPhone = async () => {
    const bare = phone.replace(/\D/g, '').slice(-10);
    if (bare.length < 10) { setError('Enter a 10-digit phone number'); return; }
    setError('');
    setStep('verifying');
    try {
      const r = await fetch(`${API}/api/v2/auth/pin-status?phone=${bare}&role=couple`);
      const d = await r.json();
      if (!d.found) {
        setError("We don't recognise this number. Use your original invite link to join first.");
        setStep('phone');
        return;
      }
      if (!d.pin_set) {
        setError('No PIN set on this account yet. Use your invite link.');
        setStep('phone');
        return;
      }
      setUserId(d.userId);
      setStep('pin');
      setPin(['', '', '', '']);
      setTimeout(() => pinRefs.current[0]?.focus(), 100);
    } catch {
      setError('Could not check phone. Try again.');
      setStep('phone');
    }
  };

  const submitPin = async (pinStr: string) => {
    setError('');
    setStep('verifying');
    try {
      const vr = await fetch(`${API}/api/v2/auth/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.replace(/\D/g, '').slice(-10),
          pin: pinStr,
          role: 'couple',
          userId,
        }),
      });
      const vd = await vr.json();
      if (!vd.success) {
        setError(vd.error || 'Incorrect PIN');
        setStep('pin');
        setPin(['', '', '', '']);
        return;
      }
      const sr = await fetch(`${API}/api/v2/circle/session/${userId}`);
      const sd = await sr.json();
      if (!sd.success) {
        setError("Couldn't load your Circle. Try again or use your invite link.");
        setStep('phone');
        return;
      }
      onSuccess(sd.data as CircleSession);
    } catch {
      setError('Sign in failed. Try again.');
      setStep('pin');
    }
  };

  const handlePinChange = (i: number, v: string) => {
    const digit = v.replace(/[^0-9]/g, '').slice(-1);
    const next = [...pin]; next[i] = digit;
    setPin(next);
    if (digit && i < 3) pinRefs.current[i + 1]?.focus();
    if (next.every(d => d)) submitPin(next.join(''));
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 32,
      background: INK, color: CREAM,
    }}>
      <div style={{ maxWidth: 360, width: '100%' }}>
        <p style={{
          fontFamily: FONT_EYEBROW, fontWeight: 200, fontSize: 9,
          letterSpacing: '0.32em', textTransform: 'uppercase',
          color: GOLD, margin: '0 0 12px', textAlign: 'center',
        }}>YOUR CIRCLE</p>
        <p style={{
          fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: 300,
          fontSize: 28, color: CREAM, margin: '0 0 8px', textAlign: 'center',
        }}>Welcome back.</p>
        <p style={{
          fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13,
          color: MUTED, margin: '0 0 32px', textAlign: 'center', lineHeight: 1.6,
        }}>
          {step === 'phone' && 'Enter your number to sign back in.'}
          {step === 'pin' && 'Enter your 4-digit PIN.'}
          {step === 'verifying' && 'One moment…'}
        </p>

        {step === 'phone' && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              borderBottom: `0.5px solid ${HAIRLINE}`, marginBottom: 20,
            }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 15, color: MUTED }}>+91</span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="00000 00000"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={e => { if (e.key === 'Enter') submitPhone(); }}
                style={{
                  flex: 1, padding: '12px 0',
                  background: 'transparent', border: 'none',
                  fontFamily: FONT_BODY, fontSize: 16, color: CREAM, outline: 'none',
                }}
              />
            </div>
            <button onClick={submitPhone} style={{
              width: '100%', height: 48, background: GOLD, color: INK,
              border: 'none', borderRadius: 100, cursor: 'pointer',
              fontFamily: FONT_EYEBROW, fontWeight: 400, fontSize: 9,
              letterSpacing: '0.22em', textTransform: 'uppercase',
            }}>Continue →</button>
          </>
        )}

        {step === 'pin' && (
          <>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24 }}>
              {pin.map((d, i) => (
                <input
                  key={i}
                  ref={r => { pinRefs.current[i] = r; }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handlePinChange(i, e.target.value)}
                  style={{
                    width: 48, height: 56, textAlign: 'center',
                    background: 'transparent',
                    border: `0.5px solid ${d ? GOLD : HAIRLINE}`,
                    borderRadius: 8,
                    fontFamily: FONT_BODY, fontSize: 24, color: CREAM, outline: 'none',
                  }}
                />
              ))}
            </div>
            <p style={{
              fontFamily: FONT_BODY, fontWeight: 300, fontSize: 11,
              color: MUTED, textAlign: 'center', margin: 0,
            }}>Auto-submits when complete.</p>
          </>
        )}

        {step === 'verifying' && (
          <p style={{
            fontFamily: FONT_BODY, fontSize: 13, color: GOLD,
            textAlign: 'center', margin: '20px 0',
          }}>Working on it…</p>
        )}

        {error && (
          <p style={{
            fontFamily: FONT_BODY, fontWeight: 300, fontSize: 12,
            color: '#E07262', margin: '16px 0 0', textAlign: 'center',
            lineHeight: 1.5,
          }}>{error}</p>
        )}
      </div>
    </div>
  );
}
