'use client';
import { useEffect, useState } from 'react';

export default function PrestigeDemoPage() {
  const [status, setStatus] = useState('Preparing Prestige demo...');

  useEffect(() => {
    const session = JSON.stringify({
      vendorId: '20792c76-b265-4063-a356-133ea1c6933b',
      vendorName: 'House of Elegance',
      category: 'event-managers',
      city: 'Delhi NCR',
      tier: 'prestige',
    });
    try {
      localStorage.setItem('vendor_web_session', session);
    } catch(e) {}
    setStatus('Redirecting to Prestige dashboard...');
    window.location.replace('/vendor/dashboard?demo=1');
  }, []);

  return (
    <div style={{ background: '#0F1117', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '2.5px', color: '#C9A84C', textTransform: 'uppercase' }}>
        THE DREAM WEDDING
      </div>
      <div style={{ display: 'inline-block', padding: '6px 18px', borderRadius: '50px', border: '1px solid rgba(44,36,32,0.5)', background: 'rgba(44,36,32,0.3)' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500, color: '#C9A84C', letterSpacing: '2px', textTransform: 'uppercase' }}>Prestige Plan Demo</span>
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
        {status}
      </div>
    </div>
  );
}
