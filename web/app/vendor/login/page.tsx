'use client';
import { useState, useEffect, useRef } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

const C = {
  cream: '#FAF6F0',
  ivory: '#FFFFFF',
  pearl: '#FBF8F2',
  goldSoft: '#FFF8EC',
  goldBorder: '#E8D9B5',
  border: '#EDE8E0',
  dark: '#2C2420',
  gold: '#C9A84C',
  goldDeep: '#B8963A',
  muted: '#8C7B6E',
  mutedLight: '#B8ADA4',
  red: '#C65757',
  redSoft: '#FBEEEE',
  redBorder: '#F0CFCF',
};

type Mode = 'login' | 'signup' | 'forgot';

export default function VendorLoginPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [mounted, setMounted] = useState(false);
  const [prefillCode, setPrefillCode] = useState<string | null>(null);

  const goToVendorHome = () => {
    const mob = typeof window !== 'undefined' && window.innerWidth < 768;
    window.location.href = mob ? '/vendor/mobile' : '/vendor/dashboard';
  };

  useEffect(() => {
    setMounted(true);
    try {
      const s = localStorage.getItem('vendor_web_session');
      if (s) {
        const p = JSON.parse(s);
        if (p.vendorId) goToVendorHome();
      }
    } catch {}
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code && code.trim().length > 0) {
        setPrefillCode(code.trim().toUpperCase());
        setMode('signup');
      }
      const m = params.get('mode');
      if (m === 'forgot') setMode('forgot');
      if (m === 'signup') setMode('signup');
    } catch {}
  }, []);

  if (!mounted) return null;

  return (
    <div style={{
      minHeight: '100vh', background: C.cream,
      fontFamily: "'DM Sans', sans-serif",
      padding: '56px 24px max(24px, env(safe-area-inset-bottom))',
    }}>
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{
            margin: '0 0 4px', fontSize: 10, color: C.goldDeep, fontWeight: 500,
            letterSpacing: '3px', textTransform: 'uppercase',
          }}>The Dream Wedding</p>
          <h1 style={{
            margin: 0, fontSize: 28, color: C.dark,
            fontFamily: "'Playfair Display', serif", fontWeight: 400, lineHeight: '34px',
          }}>Your business, in your pocket.</h1>
          <p style={{
            margin: '10px 0 0', fontSize: 13, color: C.muted,
            fontWeight: 300, lineHeight: '20px',
          }}>
            Run your wedding business beautifully.
          </p>
        </div>

        {mode === 'login' && (
          <VendorLoginForm
            onSuccess={goToVendorHome}
            onForgot={() => setMode('forgot')}
            onSignup={() => setMode('signup')}
          />
        )}
        {mode === 'signup' && (
          <SignupFlow
            onBack={() => setMode('login')}
            onComplete={goToVendorHome}
            prefillCode={prefillCode}
          />
        )}
        {mode === 'forgot' && (
          <ForgotPasswordFlow
            onDone={() => setMode('login')}
            onBack={() => setMode('login')}
          />
        )}

        <p style={{
          textAlign: 'center', margin: '28px 0 0',
          fontSize: 10, color: C.mutedLight,
          fontWeight: 300, letterSpacing: '0.3px',
        }}>
          Vendor invites are sent personally by our team.
        </p>
      </div>
    </div>
  );
}

// ─── Shared form pieces (matches couple page.tsx pattern exactly) ───

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block', fontSize: 11, color: C.muted,
      fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase',
      marginBottom: 6, fontFamily: "'DM Sans', sans-serif",
    }}>{children}</label>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: '0 0 12px', fontSize: 10, color: C.muted, fontWeight: 500,
      letterSpacing: '2px', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif",
    }}>{children}</p>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{
      background: C.redSoft, border: `1px solid ${C.redBorder}`,
      borderRadius: 8, padding: '10px 12px',
      fontSize: 12, color: C.red, marginBottom: 14,
    }}>
      {msg}
    </div>
  );
}

function GoldButton({ label, onTap, fullWidth, disabled }: {
  label: string; onTap: () => void; fullWidth?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onTap}
      disabled={disabled}
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '14px 24px',
        background: disabled ? C.border : C.dark,
        color: disabled ? C.mutedLight : C.gold,
        border: 'none', borderRadius: 12,
        fontSize: 12, fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase',
        fontFamily: "'DM Sans', sans-serif",
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >{label}</button>
  );
}

// THE phone input pattern from couple — guarantees +91 and digits on same baseline
function PhoneInput({ value, onChange, placeholder = '98765 43210', autoFocus }: {
  value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <div style={{ position: 'relative', marginBottom: 14 }}>
      <span style={{
        position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
        fontSize: 15, color: C.muted, fontFamily: "'DM Sans', sans-serif",
      }}>+91</span>
      <input
        type="tel" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="tel"
        inputMode="numeric"
        autoFocus={autoFocus}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '12px 16px 12px 46px', borderRadius: 10,
          border: `1px solid ${C.border}`, background: C.ivory,
          fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: C.dark, outline: 'none',
        }}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// VENDOR LOGIN FORM
// ══════════════════════════════════════════════════════════

function VendorLoginForm({ onSuccess, onForgot, onSignup }: {
  onSuccess: () => void;
  onForgot: () => void;
  onSignup: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const clean = phone.replace(/\D/g, '').slice(-10);
    if (clean.length !== 10) { setError('Enter a valid 10-digit phone'); return; }
    if (password.length < 1) { setError('Enter your password'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/vendor/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+91' + clean, password }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not sign in'); setLoading(false); return; }
      try {
        localStorage.setItem('vendor_web_session', JSON.stringify({
          vendorId: d.data.id,
          vendorName: d.data.name,
          category: d.data.category,
          city: d.data.city,
          tier: d.data.tier,
        }));
      } catch {}
      onSuccess();
    } catch { setError('Network error'); setLoading(false); }
  };

  return (
    <div>
      <Eyebrow>Sign in</Eyebrow>

      <FormLabel>Phone</FormLabel>
      <PhoneInput value={phone} onChange={setPhone} autoFocus />

      <FormLabel>Password</FormLabel>
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Your password"
          autoComplete="current-password"
          onKeyDown={e => e.key === 'Enter' && !loading && handleLogin()}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '12px 52px 12px 16px', borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.ivory,
            fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: C.dark, outline: 'none',
          }}
        />
        <button
          onClick={() => setShowPassword(v => !v)}
          type="button"
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            padding: '6px 10px', borderRadius: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            color: C.muted, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
          }}
        >{showPassword ? 'Hide' : 'Show'}</button>
      </div>

      <ErrorBanner msg={error} />

      <GoldButton fullWidth label={loading ? 'Signing in…' : 'Sign in'} onTap={handleLogin} disabled={loading} />

      <div style={{ textAlign: 'center', margin: '14px 0 20px' }}>
        <button
          onClick={onForgot}
          type="button"
          style={{
            background: 'none', border: 'none', color: C.muted,
            fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >Forgot password?</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 20px' }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{
          fontSize: 10, color: C.mutedLight, fontWeight: 500,
          letterSpacing: '2px', textTransform: 'uppercase',
          fontFamily: "'DM Sans', sans-serif",
        }}>New here?</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      <button
        onClick={onSignup}
        style={{
          width: '100%', padding: '14px', borderRadius: 12,
          background: C.ivory, border: `1px solid ${C.goldBorder}`,
          cursor: 'pointer',
          color: C.goldDeep, fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, fontWeight: 500, letterSpacing: '1.5px',
          textTransform: 'uppercase',
        }}
      >
        Sign up with invite code
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// SIGNUP FLOW — 5 steps, real backend endpoints
// ══════════════════════════════════════════════════════════

const VENDOR_CATEGORIES = [
  'Photography', 'Videography', 'Makeup Artist', 'Mehendi Artist',
  'Venue', 'Catering', 'Decoration', 'Wedding Planner',
  'DJ / Music', 'Choreography', 'Invitation Designer', 'Couture',
  'Jewellery', 'Priest / Pandit', 'Transportation', 'Other',
];

function SignupFlow({ onBack, onComplete, prefillCode }: {
  onBack: () => void;
  onComplete: () => void;
  prefillCode?: string | null;
}) {
  const [step, setStep] = useState(prefillCode ? 2 : 1);
  const [code, setCode] = useState(prefillCode || '');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionInfo, setSessionInfo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState<string | null>(null);

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 16px', borderRadius: 10,
    border: `1px solid ${C.border}`, background: C.ivory,
    fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: C.dark, outline: 'none',
    marginBottom: 14,
  };

  const verifyCode = async () => {
    if (!code.trim()) { setError('Enter your invite code'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/signup/validate-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Invalid code'); setLoading(false); return; }
      if (d.data?.type !== 'vendor') { setError('This is not a vendor code'); setLoading(false); return; }
      setTier(d.data.tier);
      setStep(2);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const submitBusiness = () => {
    if (!businessName.trim()) { setError('Enter your business name'); return; }
    if (!category) { setError('Pick a category'); return; }
    if (!city.trim()) { setError('Enter your city'); return; }
    if (!email.trim() || !/.+@.+\..+/.test(email.trim())) { setError('Enter a valid email'); return; }
    if (!instagram.trim()) { setError('Enter your Instagram handle'); return; }
    setError(''); setStep(3);
  };

  const sendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) { setError('Enter a valid 10-digit phone'); return; }
    setLoading(true); setError('');
    try {
      // Check if phone already registered
      const checkRes = await fetch(`${API}/api/vendor/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned }),
      });
      const checkData = await checkRes.json();
      if (checkData.success && checkData.data?.exists) {
        setError('This phone is already registered. Please sign in instead.');
        setLoading(false);
        return;
      }
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not send OTP'); setLoading(false); return; }
      setSessionInfo(d.sessionInfo); setStep(4);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (otpVal?: string) => {
    const codeVal = otpVal || otp;
    if (!codeVal || codeVal.length < 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, code: codeVal }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Invalid code'); setLoading(false); return; }
      setStep(5);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const createAccount = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const cleaned = phone.replace(/\D/g, '');
      const res = await fetch(`${API}/api/vendor/onboard`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: businessName.trim(),
          phone: '+91' + cleaned,
          email: email.trim(),
          category,
          city: city.trim(),
          instagram: instagram.trim(),
          access_code: code.trim().toUpperCase(),
          password,
        }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not create account'); setLoading(false); return; }
      try {
        localStorage.setItem('vendor_web_session', JSON.stringify({
          vendorId: d.data.id,
          vendorName: d.data.name || businessName.trim(),
          category, city: city.trim(),
          tier: d.data.tier || tier || 'essential',
        }));
      } catch {}
      onComplete();
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 22 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= step ? C.gold : C.border,
            transition: 'background 0.3s ease',
          }} />
        ))}
      </div>

      <Eyebrow>Sign up · Step {step} of 5</Eyebrow>

      {step === 1 && (
        <>
          <FormLabel>Invite code</FormLabel>
          <input
            type="text" value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
            placeholder="ABCDEF"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && !loading && verifyCode()}
            style={{ ...inputStyle, letterSpacing: '3px', fontSize: 16, textAlign: 'center' }}
          />
          <ErrorBanner msg={error} />
          <GoldButton fullWidth label={loading ? 'Verifying…' : 'Continue'} onTap={verifyCode} disabled={loading || !code.trim()} />
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button onClick={onBack} type="button" style={{
              background: 'none', border: 'none', color: C.muted,
              fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
              textDecoration: 'underline',
            }}>Back to sign in</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <FormLabel>Business name</FormLabel>
          <input type="text" value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            placeholder="e.g. Studio Aurelia"
            autoFocus style={inputStyle} />

          <FormLabel>Category</FormLabel>
          <select value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
            <option value="">Select your category</option>
            {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <FormLabel>City</FormLabel>
          <input type="text" value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="e.g. Delhi NCR"
            style={inputStyle} />

          <FormLabel>Email</FormLabel>
          <input type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@studio.com"
            autoComplete="email"
            style={inputStyle} />

          <FormLabel>Instagram handle</FormLabel>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              fontSize: 15, color: C.muted, fontFamily: "'DM Sans', sans-serif",
            }}>@</span>
            <input type="text" value={instagram}
              onChange={e => setInstagram(e.target.value.replace('@', ''))}
              placeholder="studio_aurelia"
              onKeyDown={e => e.key === 'Enter' && submitBusiness()}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 16px 12px 32px', borderRadius: 10,
                border: `1px solid ${C.border}`, background: C.ivory,
                fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: C.dark, outline: 'none',
              }} />
          </div>

          <ErrorBanner msg={error} />
          <GoldButton fullWidth label="Continue" onTap={submitBusiness} />
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button onClick={() => setStep(1)} type="button" style={{
              background: 'none', border: 'none', color: C.muted,
              fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
              textDecoration: 'underline',
            }}>Back</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p style={{
            fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5,
          }}>
            We'll send a 6-digit code to verify it's really you.
          </p>

          <FormLabel>Mobile number</FormLabel>
          <PhoneInput value={phone} onChange={v => { setPhone(v.replace(/\D/g, '').slice(0, 10)); setError(''); }} autoFocus />

          <ErrorBanner msg={error} />
          <GoldButton fullWidth
            label={loading ? 'Sending…' : 'Send code'}
            onTap={sendOtp}
            disabled={loading || phone.replace(/\D/g, '').length !== 10} />
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button onClick={() => setStep(2)} type="button" style={{
              background: 'none', border: 'none', color: C.muted,
              fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
              textDecoration: 'underline',
            }}>Back</button>
          </div>
        </>
      )}

      {step === 4 && (
        <>
          <p style={{
            fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5,
          }}>
            We sent a 6-digit code to +91 {phone.replace(/\D/g, '').slice(-10)}.
          </p>

          <FormLabel>Verification code</FormLabel>
          <OtpInput value={otp} onChange={v => { setOtp(v); setError(''); }} onComplete={(v) => !loading && verifyOtp(v)} />

          <ErrorBanner msg={error} />
          <GoldButton fullWidth label={loading ? 'Verifying…' : 'Verify'} onTap={() => verifyOtp()} disabled={loading || otp.length < 6} />
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button onClick={() => { setOtp(''); setError(''); setStep(3); }} type="button" style={{
              background: 'none', border: 'none', color: C.muted,
              fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
              textDecoration: 'underline',
            }}>Didn't get it? Resend</button>
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <p style={{
            fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5,
          }}>
            You'll use this to sign in from any device. At least 8 characters.
          </p>

          <FormLabel>Password</FormLabel>
          <input type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Create a password"
            autoFocus style={inputStyle} />

          <FormLabel>Confirm password</FormLabel>
          <input type="password" value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            onKeyDown={e => e.key === 'Enter' && !loading && createAccount()}
            style={inputStyle} />

          <ErrorBanner msg={error} />
          <GoldButton fullWidth label={loading ? 'Creating…' : 'Create account'} onTap={createAccount}
            disabled={loading || password.length < 8 || password !== confirmPassword} />
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// FORGOT PASSWORD FLOW
// ══════════════════════════════════════════════════════════

function ForgotPasswordFlow({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionInfo, setSessionInfo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 16px', borderRadius: 10,
    border: `1px solid ${C.border}`, background: C.ivory,
    fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: C.dark, outline: 'none',
    marginBottom: 14,
  };

  const sendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) { setError('Enter a valid 10-digit phone'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not send OTP'); setLoading(false); return; }
      setSessionInfo(d.sessionInfo); setStep(2);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const verifyOtp = async (otpVal?: string) => {
    const codeVal = otpVal || otp;
    if (codeVal.length < 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, code: codeVal }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Invalid code'); setLoading(false); return; }
      setStep(3);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const resetPassword = async () => {
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const cleaned = phone.replace(/\D/g, '');
      const res = await fetch(`${API}/api/vendor/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '+91' + cleaned, new_password: password, otp_verified: true }),
      });
      const d = await res.json();
      if (!d.success) { setError(d.error || 'Could not reset'); setLoading(false); return; }
      onDone();
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <Eyebrow>Reset password</Eyebrow>

      {step === 1 && (
        <>
          <p style={{
            fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5,
          }}>
            Enter your registered phone — we'll send a verification code.
          </p>

          <FormLabel>Phone</FormLabel>
          <PhoneInput value={phone} onChange={v => { setPhone(v.replace(/\D/g, '').slice(0, 10)); setError(''); }} autoFocus />

          <ErrorBanner msg={error} />
          <GoldButton fullWidth label={loading ? 'Sending…' : 'Send code'} onTap={sendOtp} disabled={loading} />
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button onClick={onBack} type="button" style={{
              background: 'none', border: 'none', color: C.muted,
              fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
              textDecoration: 'underline',
            }}>Back to sign in</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p style={{
            fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5,
          }}>
            Code sent to +91 {phone.slice(-10)}.
          </p>

          <FormLabel>Verification code</FormLabel>
          <OtpInput value={otp} onChange={v => { setOtp(v); setError(''); }} onComplete={(v) => !loading && verifyOtp(v)} />

          <ErrorBanner msg={error} />
          <GoldButton fullWidth label={loading ? 'Verifying…' : 'Verify'} onTap={() => verifyOtp()} disabled={loading || otp.length < 6} />
          <div style={{ textAlign: 'center', marginTop: 14 }}>
            <button onClick={() => { setOtp(''); setStep(1); }} type="button" style={{
              background: 'none', border: 'none', color: C.muted,
              fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
              textDecoration: 'underline',
            }}>Back</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p style={{
            fontSize: 13, color: C.muted, marginBottom: 14, lineHeight: 1.5,
          }}>
            Pick a new password (at least 8 characters).
          </p>

          <FormLabel>New password</FormLabel>
          <input type="password" value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="New password"
            autoFocus style={inputStyle} />

          <FormLabel>Confirm password</FormLabel>
          <input type="password" value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            onKeyDown={e => e.key === 'Enter' && !loading && resetPassword()}
            style={inputStyle} />

          <ErrorBanner msg={error} />
          <GoldButton fullWidth label={loading ? 'Updating…' : 'Update password'} onTap={resetPassword} disabled={loading} />
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// OTP INPUT — 6 separate boxes
// ══════════════════════════════════════════════════════════

function OtpInput({ value, onChange, onComplete }: {
  value: string; onChange: (v: string) => void; onComplete?: (v: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, char: string) => {
    const digit = char.replace(/[^0-9]/g, '').slice(-1);
    const arr = value.split('');
    arr[idx] = digit;
    while (arr.length < 6) arr.push('');
    const next = arr.join('').slice(0, 6);
    onChange(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
    if (next.length === 6 && next.split('').every(c => /\d/.test(c))) onComplete && onComplete(next);
  };

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[idx] && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowLeft' && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
    if (pasted.length > 0) {
      onChange(pasted);
      const focusIdx = Math.min(pasted.length, 5);
      refs.current[focusIdx]?.focus();
      if (pasted.length === 6 && onComplete) onComplete(pasted);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginBottom: 14 }}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
          style={{
            width: 44, height: 52,
            background: C.ivory,
            border: `1px solid ${value[i] ? C.gold : C.border}`,
            borderRadius: 10,
            textAlign: 'center',
            fontSize: 20,
            fontFamily: "'Playfair Display', serif",
            color: C.dark,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      ))}
    </div>
  );
}
