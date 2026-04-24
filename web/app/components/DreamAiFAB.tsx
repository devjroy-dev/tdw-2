'use client';
// DreamAi FAB — The quiet gold dot.
// A 52px black circle with a 12px gold dot centre.
// Draggable. Tap opens chat sheet. Long-press (480ms) auto-sends top chip.
// Self-contained: reads session from localStorage, fetches its own context.
// Hidden on pin/login/setup/demo routes.

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const API  = 'https://dream-wedding-production-89ae.up.railway.app';
const GOLD = '#C9A84C';

const HIDDEN_ROUTES = ['/pin', '/pin-login', '/login', '/setup', '/demo'];

function shouldHide(pathname: string) {
  return HIDDEN_ROUTES.some(r => pathname?.includes(r));
}

interface Message { role: 'user' | 'assistant'; text: string; }

function ChatSheet({
  visible, onClose, userType, userId, initPrompt,
}: {
  visible: boolean; onClose: () => void;
  userType: 'vendor' | 'couple'; userId: string; initPrompt?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible && initPrompt) setInput(initPrompt);
    if (visible) setTimeout(() => inputRef.current?.focus(), 300);
  }, [visible, initPrompt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/v2/dreamai/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: userId, couple_id: userId, message: msg }),
      });
      const d = await r.json();
      setMessages(prev => [...prev, { role: 'assistant', text: d.reply || d.response || 'Done.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Could not connect. Try again.' }]);
    }
    setLoading(false);
  }

  const chips = userType === 'vendor'
    ? ["Who owes me money?", "Any unanswered enquiries?", "What's my schedule this week?", "Draft a payment reminder"]
    : ["What's left to plan?", "Who should I book next?", "What's my budget looking like?", "Remind me what's urgent"];

  if (!visible) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(12,10,9,0.6)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999, background: '#0C0A09', borderRadius: '20px 20px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)', animation: 'fabSheetIn 300ms cubic-bezier(0.22,1,0.36,1)' }}>
        <style>{`@keyframes fabSheetIn{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}} @keyframes fabPulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>

        <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: GOLD }} />
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 10, fontWeight: 300, letterSpacing: '0.2em', textTransform: 'uppercase', color: GOLD, margin: 0 }}>DreamAi</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(248,247,245,0.4)', fontSize: 20, cursor: 'pointer', padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', fontWeight: 300, fontSize: 18, color: 'rgba(248,247,245,0.5)', margin: 0 }}>What can I help with?</p>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px', background: m.role === 'user' ? GOLD : 'rgba(255,255,255,0.06)', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, lineHeight: 1.55, color: m.role === 'user' ? '#0C0A09' : '#F8F7F5' }}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 4, padding: '6px 0' }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: GOLD, opacity: 0.4, animation: `fabPulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />)}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 0 && (
          <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {chips.map((c, i) => (
              <button key={i} onClick={() => send(c)} style={{ flexShrink: 0, height: 34, padding: '0 12px', background: 'rgba(201,168,76,0.08)', border: '0.5px solid rgba(201,168,76,0.25)', borderRadius: 100, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300, color: GOLD, whiteSpace: 'nowrap' }}>{c}</button>
            ))}
          </div>
        )}

        <div style={{ padding: '8px 20px 16px', display: 'flex', gap: 8, alignItems: 'center', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask anything..." style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 100, padding: '10px 16px', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#F8F7F5', outline: 'none' }} />
          <button onClick={() => send()} disabled={!input.trim() || loading} style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: input.trim() && !loading ? GOLD : 'rgba(255,255,255,0.08)', cursor: input.trim() && !loading ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 150ms ease', flexShrink: 0 }}>
            <span style={{ fontSize: 14, color: input.trim() && !loading ? '#0C0A09' : 'rgba(255,255,255,0.3)' }}>↑</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default function DreamAiFAB({ userType = 'vendor', userId }: { userType?: 'vendor' | 'couple'; userId?: string; }) {
  const pathname = usePathname();
  const [open, setOpen]           = useState(false);
  const [initPrompt, setInitPrompt] = useState<string | undefined>();
  const [pos, setPos]             = useState({ x: 0, y: 0 });
  const [urgent, setUrgent]       = useState(false);

  const dragRef     = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startPtrRef = useRef({ x: 0, y: 0 });
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const movedRef    = useRef(false);

  const resolvedId = userId || (() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem('vendor_session') || localStorage.getItem('vendor_web_session')
               || localStorage.getItem('couple_session') || localStorage.getItem('couple_web_session');
      if (!raw) return '';
      const s = JSON.parse(raw);
      return s.vendorId || s.userId || s.id || '';
    } catch { return ''; }
  })();

  useEffect(() => {
    if (!resolvedId || userType !== 'vendor') return;
    fetch(`${API}/api/v2/vendor/today/${resolvedId}`)
      .then(r => r.json())
      .then(d => { setUrgent((d.data?.needs_attention || []).length > 0); })
      .catch(() => {});
  }, [resolvedId, userType]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (open) return;
    dragRef.current = false;
    movedRef.current = false;
    startPosRef.current = { x: pos.x, y: pos.y };
    startPtrRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    longPressRef.current = setTimeout(() => {
      if (!movedRef.current) {
        setInitPrompt(userType === 'vendor' ? "Who owes me money?" : "What's left to plan?");
        setOpen(true);
      }
    }, 480);
  }, [open, pos, userType]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const dx = e.clientX - startPtrRef.current.x;
    const dy = e.clientY - startPtrRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      movedRef.current = true;
      dragRef.current  = true;
      if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
      setPos({ x: startPosRef.current.x + dx, y: startPosRef.current.y + dy });
    }
  }, []);

  const onPointerUp = useCallback(() => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
    if (!movedRef.current) { setInitPrompt(undefined); setOpen(true); }
    dragRef.current = false;
  }, []);

  if (shouldHide(pathname || '')) return null;

  return (
    <>
      <ChatSheet visible={open} onClose={() => { setOpen(false); setInitPrompt(undefined); }} userType={userType} userId={resolvedId} initPrompt={initPrompt} />
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom) + 88px)',
          right: 24,
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          width: 52, height: 52, borderRadius: '50%',
          background: '#111111', border: 'none', cursor: 'pointer',
          zIndex: 997, display: 'flex', alignItems: 'center', justifyContent: 'center',
          touchAction: 'none',
          animation: urgent ? 'fabRing 2s ease-out infinite' : 'none',
          userSelect: 'none',
        }}
      >
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: GOLD, flexShrink: 0 }} />
      </button>
      <style>{`@keyframes fabRing{0%{box-shadow:0 0 0 0 rgba(201,168,76,0.4)}70%{box-shadow:0 0 0 10px rgba(201,168,76,0)}100%{box-shadow:0 0 0 0 rgba(201,168,76,0)}}`}</style>
    </>
  );
}
