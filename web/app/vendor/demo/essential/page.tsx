'use client';
import { useEffect, useState } from 'react';

export default function EssentialDemoPage() {
  const [status, setStatus] = useState('Preparing Essential demo...');

  useEffect(() => {
    const session = JSON.stringify({
      vendorId: '20792c76-b265-4063-a356-133ea1c6933b',
      vendorName: 'Priya Sharma Photography',
      category: 'photographers',
      city: 'Delhi NCR',
      tier: 'essential',
    });

    // Best-effort localStorage write — Safari private mode will silently fail.
    // Session is carried via URL param (ds) so the demo works regardless.
    try { localStorage.setItem('vendor_web_session', session); } catch (_) {}

    const encoded = btoa(encodeURIComponent(session));
    setStatus('Redirecting to Essential dashboard...');
    window.location.replace('/vendor/dashboard?demo=1&ds=' + encoded);
  }, []);

  return (
    <div style={{ background: '#0F1117', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '2.5px', color: '#C9A84C', textTransform: 'uppercase' }}>
        THE DREAM WEDDING
      </div>
      <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: '50px', border: '1px solid rgba(140,123,110,0.3)', background: 'rgba(140,123,110,0.08)' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: '#888580', letterSpacing: '2px', textTransform: 'uppercase' }}>Essential Plan Demo</span>
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
        {status}
      </div>
    </div>
  );
}
