'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const ADMIN_PASSWORD = 'Mira@2551354';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleLogin() {
    setLoading(true);
    setError('');
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        localStorage.setItem('admin_session', 'true');
        router.replace('/admin/dashboard');
      } else {
        setError('Incorrect password.');
        setLoading(false);
      }
    }, 400);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0C0A09; }
      `}</style>
      <div style={{
        minHeight: '100vh', background: '#0C0A09',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: 'italic', fontWeight: 300, fontSize: 22,
              color: '#F8F7F5', margin: '0 0 4px',
            }}>The Dream Wedding</p>
            <p style={{
              fontFamily: "'Jost', sans-serif", fontWeight: 200,
              fontSize: 9, color: 'rgba(248,247,245,0.45)',
              letterSpacing: '0.25em', textTransform: 'uppercase',
            }}>Admin</p>
          </div>

          {/* Password field */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              fontFamily: "'Jost', sans-serif", fontWeight: 200,
              fontSize: 8, color: 'rgba(248,247,245,0.45)',
              letterSpacing: '0.22em', textTransform: 'uppercase',
              display: 'block', marginBottom: 8,
            }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
              autoFocus
              style={{
                width: '100%', height: 48,
                background: '#161412', border: '0.5px solid rgba(248,247,245,0.15)',
                borderRadius: 8, padding: '0 16px', outline: 'none',
                fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
                fontSize: 14, color: '#F8F7F5',
              }}
            />
          </div>

          {error && (
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontWeight: 300,
              fontSize: 13, color: '#C9A84C', marginBottom: 16,
            }}>{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !password}
            style={{
              width: '100%', height: 48,
              background: '#111111', border: 'none', borderRadius: 8,
              fontFamily: "'Jost', sans-serif", fontWeight: 300,
              fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
              color: '#F8F7F5', cursor: password ? 'pointer' : 'default',
              opacity: loading ? 0.6 : 1,
            }}
          >{loading ? 'Entering...' : 'Enter'}</button>
        </div>
      </div>
    </>
  );
}
