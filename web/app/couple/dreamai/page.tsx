'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

const RAILWAY_URL = 'https://dream-wedding-production-89ae.up.railway.app';

interface CoupleSession { id: string; name?: string; dreamer_type?: string; couple_tier?: string; }
interface ChatMessage { role: 'user' | 'ai'; text: string; action?: { type: string; label: string; preview: string; params: Record<string, unknown> }; }

function getSession(): CoupleSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('couple_session') || localStorage.getItem('couple_web_session');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function renderMarkdown(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ fontWeight: 500 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  })}</>;
}

function Shimmer({ h, w, br }: { h: number; w?: number; br?: number }) {
  return (
    <div style={{
      height: h, width: w ? w : '100%', borderRadius: br ?? 8,
      background: 'linear-gradient(90deg,#EEECE8 25%,#F8F7F5 50%,#EEECE8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
      willChange: 'background-position',
    }} />
  );
}

export default function DreamAiPage() {
  const router = useRouter();
  const [session, setSession] = useState<CoupleSession | null | undefined>(undefined);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [context, setContext] = useState<object | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSession(getSession()); }, []);

  useEffect(() => {
    if (!session?.id) return;
    fetch(`${RAILWAY_URL}/api/v2/dreamai/couple-context/${session.id}`)
      .then(r => r.json()).then(setContext).catch(() => {});
  }, [session?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Check for prefill from sessionStorage (e.g. from ASK button in task list)
  useEffect(() => {
    try {
      const prefill = sessionStorage.getItem('tdw_dreamai_prefill');
      if (prefill) { setInput(prefill); sessionStorage.removeItem('tdw_dreamai_prefill'); }
    } catch {}
  }, []);

  if (session === undefined) return null;
  if (!session) {
    if (typeof window !== 'undefined') window.location.replace('/couple/login');
    return null;
  }

  const userId = session.id;

  async function sendMessage(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await fetch(`${RAILWAY_URL}/api/v2/dreamai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userType: 'couple', message: msg, context }),
      });
      const json = await res.json();
      let replyText = json.reply || 'Something went wrong.';
      if (replyText.trim() === 'Done.' || replyText.trim() === 'Done') {
        const retry = await fetch(`${RAILWAY_URL}/api/v2/dreamai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, userType: 'couple', message: msg, context, history: [{ role: 'user', text: msg }] }),
        });
        const retryJson = await retry.json();
        if (retryJson.reply && retryJson.reply.trim() !== 'Done.' && retryJson.reply.trim() !== 'Done') {
          replyText = retryJson.reply;
        }
      }
      const actionMatch = replyText.match(/\[ACTION:(\w+)\|([^|]+)\|([^|]+)\|(\{[^}]+\})\]/);
      if (actionMatch) {
        const [, type, label, preview, paramsStr] = actionMatch;
        let params = {};
        try { params = JSON.parse(paramsStr); } catch {}
        const cleanText = replyText.replace(actionMatch[0], '').trim();
        setMessages(prev => [...prev, { role: 'ai', text: cleanText, action: { type, label, preview, params } }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', text: replyText }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Unable to reach DreamAi.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(file: File) {
    if (uploadingImage || loading) return;
    setUploadingImage(true);
    setMessages(prev => [...prev, { role: 'user', text: '📷 Image' }]);
    try {
      const CLOUDINARY_CLOUD = 'dccso5ljv';
      const CLOUDINARY_PRESET = 'dream_wedding_uploads';
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_PRESET);
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: 'POST', body: formData });
      const cloudJson = await cloudRes.json();
      const imageUrl = cloudJson.secure_url;
      if (!imageUrl) throw new Error('Upload failed');
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch(`${RAILWAY_URL}/api/v2/dreamai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, userType: 'couple',
          message: `I sent an image. The uploaded URL is: ${imageUrl}\n\nPlease classify it: if it looks like a receipt or invoice, log it as an expense using add_expense. If it looks like wedding inspiration (decor, fashion, makeup, venue, photography), save it to my Muse board using save_to_muse with source_url set to "${imageUrl}".`,
          context, image_base64: base64, image_media_type: file.type || 'image/jpeg',
        }),
      });
      const json = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: json.reply || 'Image processed!' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Could not process image.' }]);
    } finally {
      setUploadingImage(false); }
  }

  const quickPrompts = context ? [
    "What's overdue this week?",
    "How much have I spent so far?",
    "Which vendors haven't replied?",
    "Draft a reminder to my florist",
  ] : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; } body { margin: 0; background: #0C0A09; }
        ::-webkit-scrollbar { display: none; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
      <div style={{
        position: 'fixed', inset: 0, background: '#FFFFFF',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: 'calc(env(safe-area-inset-top) + 16px) 20px 12px',
          borderBottom: '0.5px solid #E2DED8', background: '#FFFFFF', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>✦</span>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 300, color: '#111111' }}>DreamAi</span>
          </div>
          <button onClick={() => router.back()} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#888580',
            padding: 4, touchAction: 'manipulation',
          }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 16px' }}>
          {messages.length === 0 && (
            <div style={{ marginTop: 32 }}>
              <p style={{
                fontFamily: "'Cormorant Garamond', serif", fontSize: 18,
                fontWeight: 300, fontStyle: 'italic', color: '#888580',
                textAlign: 'center', margin: '0 0 24px',
              }}>Ask anything about your wedding.</p>
              {quickPrompts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {quickPrompts.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q)} style={{
                      background: '#F8F7F5', border: '0.5px solid #E2DED8', borderRadius: 10,
                      padding: '10px 14px', textAlign: 'left', cursor: 'pointer', touchAction: 'manipulation',
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: '#555250',
                    }}>{q}</button>
                  ))}
                </div>
              )}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: m.action ? 4 : 12 }}>
                <div style={{
                  maxWidth: '80%',
                  background: m.role === 'user' ? '#FFFFFF' : '#F8F7F5',
                  border: m.role === 'user' ? '0.5px solid #C9A84C' : '0.5px solid #E2DED8',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  padding: '10px 14px',
                }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300, color: '#111111', margin: 0, lineHeight: 1.5 }}>{renderMarkdown(m.text || '')}</p>
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
              <div style={{ background: '#F8F7F5', border: '0.5px solid #E2DED8', borderRadius: '16px 16px 16px 4px', padding: '10px 16px' }}>
                <Shimmer h={14} w={120} br={4} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div style={{
          display: 'flex', gap: 10, padding: '12px 16px',
          borderTop: '0.5px solid #E2DED8',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
          background: '#FFFFFF', flexShrink: 0,
        }}>
          <label style={{ flexShrink: 0, cursor: 'pointer' }}>
            <input type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ''; }}
            />
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: uploadingImage ? '#F4F1EC' : '#F8F7F5', border: '0.5px solid #E2DED8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18 }}>{uploadingImage ? '⏳' : '📷'}</span>
            </div>
          </label>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage(input); }}
            placeholder="Ask anything about your wedding..."
            style={{
              flex: 1, height: 44,
              fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 300,
              color: '#111111', background: '#F8F7F5',
              border: '0.5px solid #E2DED8', borderRadius: 22,
              padding: '0 16px', outline: 'none',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: input.trim() ? '#C9A84C' : '#E2DED8',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, touchAction: 'manipulation',
              transition: 'background 200ms cubic-bezier(0.22,1,0.36,1)',
            }}
          >
            <span style={{ color: '#FFFFFF', fontSize: 16 }}>↑</span>
          </button>
        </div>
      </div>
    </>
  );
}
