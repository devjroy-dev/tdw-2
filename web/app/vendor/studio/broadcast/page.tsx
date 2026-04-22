'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';

const BACKEND = 'https://dream-wedding-production-89ae.up.railway.app';

interface Broadcast { id: string; message: string; sent_at: string; recipient_count: number; }

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #F8F7F5 25%, #EEECE8 50%, #F8F7F5 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.4s infinite',
  borderRadius: 8,
  willChange: 'transform',
  transform: 'translateZ(0)',
};

export default function BroadcastPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    const raw = localStorage.getItem('vendor_web_session');
    if (!raw) { window.location.replace('/vendor/pin-login'); return; }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.vendorId) { window.location.replace('/vendor/pin-login'); return; }
      setVendorId(parsed.vendorId);
    } catch { window.location.replace('/vendor/pin-login'); }
  }, []);

  const fetchBroadcasts = useCallback(async (vid: string) => {
    try {
      const res = await fetch(`${BACKEND}/api/broadcasts/${vid}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setBroadcasts(json.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (vendorId) fetchBroadcasts(vendorId);
  }, [vendorId, fetchBroadcasts]);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND}/api/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, message }),
      });
      const json = await res.json();
      if (json.success) {
        setSheetOpen(false);
        setMessage('');
        if (vendorId) fetchBroadcasts(vendorId);
        showToast('Broadcast sent.');
      } else {
        showToast('Could not send.');
      }
    } catch {
      showToast('Could not send.');
    }
    setSubmitting(false);
  };

  const formatSentAt = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300&display=swap');
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F8F7F5; }
        textarea:focus { outline: none; }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%) translateZ(0)', background: '#111111', color: '#F8F7F5', fontFamily: "'DM Sans', sans-serif", fontSize: 12, borderRadius: 12, padding: '10px 16px', zIndex: 9999, willChange: 'transform' }}>
          {toast}
        </div>
      )}

      {sheetOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, willChange: 'opacity', transform: 'translateZ(0)' }} onClick={() => setSheetOpen(false)}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#FFFFFF', borderRadius: '24px 24px 0 0', padding: '24px 20px 40px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 22, color: '#111111' }}>Compose Broadcast</p>
              <button onClick={() => setSheetOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', touchAction: 'manipulation' }}><X size={18} color="#888580" /></button>
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your message…"
              maxLength={500}
              style={{
                width: '100%', minHeight: 120,
                fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#111111',
                background: 'transparent', border: 'none', borderBottom: '1px solid #E2DED8',
                paddingBottom: 8, resize: 'none', fontWeight: 300,
              }}
            />
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#888580', textAlign: 'right', marginBottom: 20 }}>{message.length}/500</p>
            <button
              onClick={handleSend}
              disabled={submitting || !message.trim()}
              style={{ width: '100%', background: '#111111', color: '#F8F7F5', border: 'none', borderRadius: 8, padding: '14px 0', fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 12, letterSpacing: '0.22em', cursor: 'pointer', touchAction: 'manipulation', opacity: (submitting || !message.trim()) ? 0.5 : 1 }}
            >
              SEND BROADCAST
            </button>
          </div>
        </div>
      )}

      <div style={{ minHeight: '100vh', background: '#F8F7F5', fontFamily: "'DM Sans', sans-serif", paddingBottom: 80 }}>
        <div style={{ padding: '16px 20px 0' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, touchAction: 'manipulation', willChange: 'opacity', transform: 'translateZ(0)' }}>
            <ArrowLeft size={20} strokeWidth={1.5} color="#111111" />
          </button>
        </div>

        <div style={{ padding: '12px 20px 20px' }}>
          <p style={{ fontFamily: "'Jost', sans-serif", fontWeight: 200, fontSize: 10, color: '#888580', letterSpacing: '0.25em', textTransform: 'uppercase', marginBottom: 4 }}>YOUR STUDIO</p>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, fontSize: 28, color: '#111111' }}>Broadcast</h1>
        </div>

        <div style={{ padding: '0 20px' }}>
          {loading ? (
            [1,2,3].map(i => <div key={i} style={{ ...shimmerStyle, height: 72, marginBottom: 8 }} />)
          ) : broadcasts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: '#888580', marginBottom: 8 }}>No broadcasts yet.</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#888580' }}>Send announcements to all your clients at once.</p>
            </div>
          ) : (
            broadcasts.map(b => (
              <div key={b.id} style={{ background: '#FFFFFF', border: '1px solid #E2DED8', borderRadius: 12, padding: 16, marginBottom: 8 }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#111111', fontWeight: 400, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 8 }}>{b.message}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#888580' }}>{formatSentAt(b.sent_at)}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#888580' }}>{b.recipient_count || 0} recipients</span>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={() => setSheetOpen(true)}
          style={{
            position: 'fixed',
            bottom: 'calc(64px + env(safe-area-inset-bottom) + 16px)',
            right: 20,
            width: 48, height: 48,
            borderRadius: '50%',
            background: '#111111',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            touchAction: 'manipulation',
            willChange: 'transform',
            transform: 'translateZ(0)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          }}
        >
          <Plus size={20} color="#F8F7F5" strokeWidth={1.5} />
        </button>
      </div>
    </>
  );
}
