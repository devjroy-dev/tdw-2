'use client';
import { useEffect, useState } from 'react';

export default function DemoPage() {
  const [status, setStatus] = useState('Preparing demo...');

  useEffect(() => {
    const session = JSON.stringify({
      vendorId: '20792c76-b265-4063-a356-133ea1c6933b',
      vendorName: 'Dev Roy Productions',
      category: 'content-creators',
      city: 'Delhi NCR',
      plan: 'premium',
    });
    try {
      localStorage.setItem('vendor_session', session);
      sessionStorage.setItem('vendor_session', session);
    } catch(e) {}
    setStatus('Redirecting...');
    // Use window.location.replace — works better on Safari than router.push
    window.location.replace('/vendor/dashboard?demo=1');
  }, []);

  return (
    <div style={{ background: '#0F1117', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 700, letterSpacing: '2.5px', color: '#C9A84C', textTransform: 'uppercase' }}>
        THE DREAM WEDDING
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
        {status}
      </div>
    </div>
  );
}
