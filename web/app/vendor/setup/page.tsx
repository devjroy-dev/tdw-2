'use client';
import { useState, useEffect } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

const C = {
  cream: '#F8F7F5',
  ivory: '#FFFFFF',
  border: '#EDE8E0',
  dark: '#111111',
  gold: '#C9A84C',
  goldDeep: '#B8963A',
  goldBorder: '#E2DED8',
  goldSoft: '#FFF8EC',
  muted: '#888580',
  mutedLight: '#C8C4BE',
  red: '#C65757',
  redSoft: '#FBEEEE',
  redBorder: '#F0CFCF',
};

export default function VendorSetupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [session, setSession] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const s = JSON.parse(localStorage.getItem('vendor_web_session') || '{}');
      if (!s.vendorId) { window.location.href = '/vendor/login'; return; }
      setSession(s);
    } catch (e) { window.location.href = '/vendor/login'; }
  }, []);

  const handleCreate = async () => {
    if (!username.trim()) { setError('Choose a username'); return; }
    if (username.trim().length < 3) { setError('Username must be at least 3 characters'); return; }
    if (!password) { setError('Create a password'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/credentials/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: session.vendorId, username: username.trim(), password }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/vendor/dashboard';
      } else {
        setError(data.error || 'Could not create account');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally { setLoading(false); }
  };

  if (!mounted) return null;

  const tierLabel = session?.tier === 'prestige' ? 'Prestige' : 'Signature';

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 16px', borderRadius: 10,
    border: `1px solid ${C.border}`, background: C.ivory,
    fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: C.dark, outline: 'none',
    marginBottom: 14,
  };

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
            margin: 0, fontSize: 26, color: C.dark,
            fontFamily: "'Playfair Display', serif", fontWeight: 400, lineHeight: '32px',
          }}>Welcome aboard.</h1>
          <p style={{
            margin: '10px 0 0', fontSize: 13, color: C.muted,
            fontWeight: 300, lineHeight: '20px',
          }}>
            You have been granted access to the {tierLabel} plan.
            Set up your credentials to get started.
          </p>
          {session?.tier && (
            <div style={{
              display: 'inline-block', marginTop: 16,
              padding: '6px 16px', borderRadius: 50,
              border: `1px solid ${C.goldBorder}`,
              background: C.goldSoft,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 600, color: C.goldDeep,
                letterSpacing: '2px', textTransform: 'uppercase',
              }}>{tierLabel} Trial</span>
            </div>
          )}
        </div>

        <p style={{
          margin: '0 0 12px', fontSize: 10, color: C.muted, fontWeight: 500,
          letterSpacing: '2px', textTransform: 'uppercase',
        }}>Create account</p>

        <label style={{
          display: 'block', fontSize: 11, color: C.muted,
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6,
        }}>Username</label>
        <input
          type="text" value={username}
          onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, '')); setError(''); }}
          placeholder="Choose a username"
          autoFocus style={inputStyle}
        />
        <p style={{
          fontSize: 11, color: C.mutedLight, marginTop: -10, marginBottom: 14,
          paddingLeft: 4, lineHeight: 1.5,
        }}>
          Lowercase letters, numbers, dots and underscores only
        </p>

        <label style={{
          display: 'block', fontSize: 11, color: C.muted,
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6,
        }}>Password</label>
        <input
          type="password" value={password}
          onChange={(e) => { setPassword(e.target.value); setError(''); }}
          placeholder="Create a password"
          style={inputStyle}
        />

        <label style={{
          display: 'block', fontSize: 11, color: C.muted,
          fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6,
        }}>Confirm password</label>
        <input
          type="password" value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
          placeholder="Confirm password"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          style={inputStyle}
        />

        {error && (
          <div style={{
            background: C.redSoft, border: `1px solid ${C.redBorder}`,
            borderRadius: 8, padding: '10px 12px',
            fontSize: 12, color: C.red, marginBottom: 14,
          }}>{error}</div>
        )}

        <button
          onClick={handleCreate}
          disabled={loading}
          style={{
            width: '100%',
            padding: '14px 24px',
            background: loading ? C.border : C.dark,
            color: loading ? C.mutedLight : C.gold,
            border: 'none', borderRadius: 12,
            fontSize: 12, fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase',
            fontFamily: "'DM Sans', sans-serif",
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 14,
          }}
        >
          {loading ? 'Creating…' : 'Create account & enter dashboard'}
        </button>

        <p style={{
          fontSize: 11, color: C.mutedLight, textAlign: 'center', lineHeight: 1.6,
        }}>
          You can update your profile and manage your business from the dashboard.
        </p>
      </div>
    </div>
  );
}
