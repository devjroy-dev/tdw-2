'use client';
import { useState } from 'react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

export default function VendorLoginPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCodeLogin = async () => {
    if (code.length !== 6) { setError('Please enter a 6-digit code'); return; }
    try {
      setLoading(true); setError('');
      const res = await fetch(`${API}/api/vendor-login-codes/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        localStorage.setItem('vendor_session', JSON.stringify({
          vendorId: data.data.id,
          vendorName: data.data.name,
          category: data.data.category,
          city: data.data.city,
          plan: data.data.plan,
        }));
        window.location.href = '/vendor/dashboard';
      } else {
        setError(data.error || 'Invalid or expired code. Generate a new one from the app.');
      }
    } catch (e) {
      setError('Could not verify code. Please try again.');
    } finally { setLoading(false); }
  };

  const features = [
    { label: 'Invoice & contract management' },
    { label: 'Payment schedules with WhatsApp reminders' },
    { label: 'P&L per booking — real margin, not just revenue' },
    { label: 'Day-of runsheet, delivery tracker, client timeline' },
    { label: 'TDS reconciliation & advance tax calculator' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* Left panel */}
      <div style={{
        width: '55%', background: '#0F1117',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
      }}>
        {/* Logo */}
        <div>
          <div style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '2.5px', color: '#C9A84C', textTransform: 'uppercase' }}>
            THE DREAM WEDDING
          </div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.5px', marginTop: '4px' }}>
            Vendor Business Portal
          </div>
        </div>

        {/* Hero */}
        <div>
          <div style={{ fontSize: '36px', fontWeight: 300, color: '#fff', lineHeight: 1.25, letterSpacing: '-0.5px', marginBottom: '16px' }}>
            Your wedding business,<br />
            <span style={{ color: '#C9A84C' }}>fully organised.</span>
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginBottom: '40px', lineHeight: 1.7 }}>
            The only platform in India that combines couple discovery<br />with a complete vendor operating system.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C9A84C', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', fontWeight: 400 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer stat */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '24px' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.3px' }}>
            Built for Indian wedding professionals earning Rs.10L–1Cr/year
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={{
        width: '45%', background: '#fff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '56px 64px',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          <div style={{ marginBottom: '36px' }}>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#0F1117', marginBottom: '8px', letterSpacing: '-0.3px' }}>
              Sign in to your portal
            </div>
            <div style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6 }}>
              Open the app → Overview → Generate Web Login Code, then enter it below.
            </div>
          </div>

          {/* Code input */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: '#6B7280', letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
              6-Digit Login Code
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="— — — — — —"
              value={code}
              onChange={(e) => { setCode(e.target.value.replace(/[^0-9]/g, '')); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleCodeLogin()}
              style={{
                width: '100%',
                padding: '14px 18px',
                fontSize: '24px',
                fontFamily: 'Inter, sans-serif',
                letterSpacing: '12px',
                textAlign: 'center',
                border: error ? '1.5px solid #DC2626' : '1.5px solid #E5E7EB',
                borderRadius: '8px',
                backgroundColor: '#FAFAFA',
                color: '#0F1117',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border 0.15s',
              }}
              onFocus={(e) => { if (!error) e.target.style.border = '1.5px solid #C9A84C'; }}
              onBlur={(e) => { if (!error) e.target.style.border = '1.5px solid #E5E7EB'; }}
            />
          </div>

          {error && (
            <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '12px', lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleCodeLogin}
            disabled={loading || code.length !== 6}
            style={{
              width: '100%',
              background: loading || code.length !== 6 ? '#E5E7EB' : '#0F1117',
              color: loading || code.length !== 6 ? '#9CA3AF' : '#fff',
              fontSize: '13px', fontWeight: 600,
              letterSpacing: '0.5px',
              padding: '14px 24px',
              borderRadius: '8px',
              border: 'none',
              cursor: loading || code.length !== 6 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              marginBottom: '24px',
            }}
          >
            {loading ? 'Verifying...' : 'Enter Dashboard →'}
          </button>

          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '6px' }}>Don't have the app yet?</div>
            <a href="/#download" style={{ fontSize: '12px', color: '#C9A84C', textDecoration: 'none', fontWeight: 500 }}>
              Download The Dream Wedding app →
            </a>
          </div>

        </div>
      </div>

    </div>
  );
}
