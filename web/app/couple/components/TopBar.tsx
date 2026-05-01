'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Settings, LogOut } from 'lucide-react';
import { useCoupleMode, type CoupleAppMode } from '../layout';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

interface ChatMessage { role: 'user' | 'ai'; text: string; }

function DreamAiSheet({ visible, onClose, userId }: { visible: boolean; onClose: () => void; userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ctx, setCtx] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!visible || !userId) return;
    fetch(`${API}/api/v2/dreamai/couple-context/${userId}`)
      .then(r => r.json()).then(setCtx).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [visible, userId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  async function handleImageUpload(file: File) {
    if (uploadingImage || loading) return;
    setUploadingImage(true);
    setMessages(p => [...p, { role: 'user', text: '📷 Image' }]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'dream_wedding_uploads');
      const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dccso5ljv/image/upload', { method: 'POST', body: formData });
      const cloudJson = await cloudRes.json();
      const imageUrl = cloudJson.secure_url;
      if (!imageUrl) throw new Error('Upload failed');
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const r = await fetch(`${API}/api/v2/dreamai/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userType: 'couple', context: ctx, history: messages.slice(-10), image_base64: base64, image_media_type: file.type || 'image/jpeg', message: `I sent an image. The uploaded URL is: ${imageUrl}. If it looks like a receipt or invoice, log it as an expense. If it looks like wedding inspiration, save it to my Muse board.` }),
      });
      const d = await r.json();
      setMessages(p => [...p, { role: 'ai', text: d.reply || 'Image processed!' }]);
    } catch { setMessages(p => [...p, { role: 'ai', text: 'Could not process image.' }]); }
    finally { setUploadingImage(false); }
  }

  async function send(text: string) {
    const msg = text.trim(); if (!msg || loading) return;
    setInput(''); setMessages(p => [...p, { role: 'user', text: msg }]); setLoading(true);
    try {
      const res = await fetch(`${API}/api/v2/dreamai/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userType: 'couple', message: msg, context: ctx, history: messages.slice(-10) }),
      });
      const json = await res.json();
      setMessages(p => [...p, { role: 'ai', text: json.reply || 'Something went wrong.' }]);
    } catch { setMessages(p => [...p, { role: 'ai', text: 'Unable to reach DreamAi.' }]); }
    finally { setLoading(false); }
  }

  if (!visible) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(17,17,17,0.4)' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201, background: '#FFFFFF', borderRadius: '24px 24px 0 0', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: 36, height: 4, background: '#E2DED8', borderRadius: 2, margin: '12px auto 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', borderBottom: '0.5px solid #E2DED8', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: '#C9A84C' }}>✦</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#111' }}>DreamAi</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888580', fontSize: 20, padding: 4 }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300, fontStyle: 'italic', color: '#C8C4BE', textAlign: 'center', marginTop: 32 }}>Ask anything about your wedding.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '80%', background: m.role === 'user' ? '#111111' : '#F4F1EC', color: m.role === 'user' ? '#F8F7F5' : '#111111', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, lineHeight: 1.5 }}>
                {m.text.split('\n').map((line: string, li: number) => {
                  if (line.startsWith('## ')) return <p key={li} style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 400, letterSpacing: '0.12em', textTransform: 'uppercase', color: m.role === 'user' ? 'rgba(248,247,245,0.7)' : '#888580', margin: '10px 0 4px' }}>{line.slice(3)}</p>;
                  const parts = line.split(/(\*\*[^*]+\*\*)/g);
                  return <span key={li}>{parts.map((p, pi) => p.startsWith('**') && p.endsWith('**') ? <strong key={pi}>{p.slice(2,-2)}</strong> : p)}<br /></span>;
                })}
              </div>
            </div>
          ))}
          {loading && <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#C8C4BE' }}>...</div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px', borderTop: '0.5px solid #E2DED8', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))', alignItems: 'center', flexShrink: 0 }}>
          {uploadingImage ? (
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F4F1EC', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ fontSize: 16 }}>⏳</span></div>
          ) : (
            <>
              <label style={{ flexShrink: 0, cursor: 'pointer' }}>
                <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }} />
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F4F1EC', border: '0.5px solid #E2DED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 15 }}>📸</span></div>
              </label>
              <label style={{ flexShrink: 0, cursor: 'pointer' }}>
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }} />
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F4F1EC', border: '0.5px solid #E2DED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 15 }}>🖼️</span></div>
              </label>
            </>
          )}
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(input); }} placeholder="Ask anything about your wedding..." style={{ flex: 1, height: 44, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111', background: '#F8F7F5', border: '0.5px solid #E2DED8', borderRadius: 22, padding: '0 16px', outline: 'none' }} />
          <button onClick={() => send(input)} disabled={loading || !input.trim()} style={{ width: 44, height: 44, borderRadius: '50%', background: input.trim() ? '#C9A84C' : '#E2DED8', border: 'none', cursor: input.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><span style={{ color: '#FFF', fontSize: 16 }}>↑</span></button>
        </div>
      </div>
    </>
  );
}

function getInitials(name?: string): string {
  if (!name) return 'D';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function CoupleTopBar() {
  const { mode, setMode } = useCoupleMode();
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [dreamAiOpen, setDreamAiOpen] = useState(false);
  const [name, setName] = useState('');
  const [userId, setUserId] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session') || localStorage.getItem('couple_web_session');
      if (raw) {
        const s = JSON.parse(raw);
        const n = s?.name || s?.dreamer_name || s?.vendorName || '';
        if (n) setName(n);
        const id = s?.userId || s?.id || '';
        if (id) setUserId(id);
      }
    } catch {}
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const isPlan = mode === 'PLAN';

  // Navigation only — setMode is handled by layout.tsx pathname useEffect
  const handleToggle = (m: CoupleAppMode) => {
    localStorage.setItem('couple_app_mode', m);
    if (m === 'PLAN') {
      // Clear saved path so couple/today PWA restore never redirects back to DISCOVER
      localStorage.removeItem('couple_last_path');
      router.push('/couple/today');
    } else {
      router.push('/couple/discover/hub');
    }
  };

  const initials = getInitials(name);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes slideDown { from{opacity:0;transform:translateY(-40px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%',
          transform: 'translateX(-50%)',
          background: '#111111', color: '#F8F7F5',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
          padding: '10px 16px', borderRadius: 8, zIndex: 400,
          animation: 'slideDown 280ms cubic-bezier(0.22,1,0.36,1)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>{toast}</div>
      )}

      {/* TopBar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', height: 56,
        background: '#F8F7F5',
        borderBottom: '0.5px solid #E2DED8',
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        boxSizing: 'border-box',
        willChange: 'transform',
      }}>
        {/* Wordmark */}
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 20, fontWeight: 300, letterSpacing: '0.04em', lineHeight: 1,
          color: '#111111',
        }}>TDW</span>

        {/* Toggle pill */}
        <div style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(17,17,17,0.06)', borderRadius: 20, padding: 3, gap: 0 }}>
          {(['PLAN', 'DISCOVER'] as CoupleAppMode[]).map((m, idx) => {
            const active = mode === m && !dreamAiOpen;
            return (
              <>
                <button key={m} onClick={() => { setDreamAiOpen(false); handleToggle(m); }} style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '6px 16px', borderRadius: 16, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', touchAction: 'manipulation', background: active ? '#111111' : 'transparent', color: active ? '#F8F7F5' : '#888580', transition: 'all 180ms cubic-bezier(0.22,1,0.36,1)' }}>{m}</button>
                {idx === 0 && (
                  <button onClick={() => setDreamAiOpen(true)} style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 200, letterSpacing: '0.2em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 16, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', touchAction: 'manipulation', background: dreamAiOpen ? '#C9A84C' : 'transparent', color: dreamAiOpen ? '#0C0A09' : '#C9A84C', transition: 'all 180ms cubic-bezier(0.22,1,0.36,1)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 10 }}>✦</span>
                    <span>AI</span>
                  </button>
                )}
              </>
            );
          })}
        </div>

        {/* Profile circle */}
        <div onClick={() => setProfileOpen(true)} style={{
          width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
          touchAction: 'manipulation', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#111111',
          border: 'none',
        }}>
          <span style={{
            fontFamily: "'Jost', sans-serif",
            fontSize: 12, fontWeight: 300, color: '#F8F7F5', lineHeight: 1,
          }}>{initials}</span>
        </div>
      </header>

      <DreamAiSheet visible={dreamAiOpen} onClose={() => setDreamAiOpen(false)} userId={userId} />

      {/* Profile sheet backdrop */}
      {profileOpen && (
        <div onClick={() => setProfileOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(17,17,17,0.4)',
          willChange: 'opacity',
        }} />
      )}

      {/* Profile sheet */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: '#FFFFFF', borderRadius: '24px 24px 0 0',
        transform: profileOpen ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)',
        willChange: 'transform',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Handle */}
        <div style={{
          width: 36, height: 4, background: '#E2DED8',
          borderRadius: 2, margin: '12px auto 20px', display: 'block',
        }} />

        {/* Profile row */}
        <div style={{ padding: '0 24px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: '#111111',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 16, fontWeight: 300, color: '#F8F7F5' }}>
              {initials}
            </span>
          </div>
          <div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 300, color: '#111111', margin: '0 0 2px' }}>
              {name || 'Dreamer'}
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: '#888580', margin: 0 }}>
              Dreamer
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#E2DED8', margin: '0 24px' }} />

        {/* Settings row */}
        <div onClick={() => { showToast('Coming soon.'); setProfileOpen(false); }} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 24px', cursor: 'pointer', touchAction: 'manipulation',
        }}>
          <Settings size={18} color="#888580" strokeWidth={1.5} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111111' }}>
            Settings
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#E2DED8', margin: '0 24px' }} />

        {/* Sign out row */}
        <div onClick={() => {
          localStorage.removeItem('couple_session');
          localStorage.removeItem('couple_web_session');
          window.location.replace('/');
        }} style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 24px', cursor: 'pointer', touchAction: 'manipulation',
        }}>
          <LogOut size={18} color="#888580" strokeWidth={1.5} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111111' }}>
            Sign out
          </span>
        </div>
      </div>
    </>
  );
}
