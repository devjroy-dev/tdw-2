'use client';

import React, { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Send, Phone, Search } from 'lucide-react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Vendor {
  id: string; name: string; category: string; city?: string;
  phone?: string; show_whatsapp_public?: boolean;
  featured_photos?: string[]; portfolio_images?: string[];
  starting_price?: number;
}
interface Thread {
  id: string; couple_id: string; vendor_id: string; status: string;
  last_message_at: string; last_message_preview: string;
  last_message_from: string; couple_unread_count: number; vendor?: Vendor;
}
interface Message {
  id: string; enquiry_id: string;
  from_role: 'couple' | 'vendor' | 'system';
  content: string; created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(d: string): string {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
  return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}
function vImg(v?: Vendor) { return v?.featured_photos?.[0] || v?.portfolio_images?.[0] || null; }
function catLabel(c: string) {
  const m: Record<string,string> = {
    photographer:'Photography', mua:'Makeup & Hair', decorator:'Decor',
    venue:'Venue', designer:'Designer', event_manager:'Event Management',
  };
  return m[c] || c;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ vendor, size }: { vendor?: Vendor; size: number }) {
  const img = vImg(vendor);
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'#F0EDE8',
      flexShrink:0, overflow:'hidden', border:'0.5px solid #E2DED8' }}>
      {img
        ? <img src={img} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center',
            justifyContent:'center', fontFamily:"'Cormorant Garamond',serif",
            fontSize:size*0.45, color:'#C8C4BE' }}>✦</div>
      }
    </div>
  );
}

// ─── Shimmer ──────────────────────────────────────────────────────────────────
function Shimmer({ h, w }: { h: number; w?: string }) {
  return <div style={{ height:h, width:w||'100%', borderRadius:8,
    background:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)',
    backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />;
}

// ─── Enquiry Sheet (pre-filled, editable, Option B auto-open thread) ──────────
function EnquirySheet({ vendor, userId, onClose, onSent }: {
  vendor: { id: string; name: string };
  userId: string; onClose: () => void; onSent: (threadId: string) => void;
}) {
  const DEFAULT_MSG = `Hi, I found you on The Dream Wedding and would love to discuss my wedding.`;
  const [msg, setMsg] = useState(DEFAULT_MSG);
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!msg.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/enquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: userId, vendor_id: vendor.id, initial_message: msg.trim() }),
      });
      const json = await res.json();
      if (json.success) { onSent(json.data.id); return; }
    } catch {}
    setSending(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:600,
        background:'rgba(17,17,17,0.45)', backdropFilter:'blur(4px)',
        WebkitBackdropFilter:'blur(4px)' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:601,
        background:'#FFFFFF', borderRadius:'24px 24px 0 0',
        paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 24px)',
        animation:'sheetUp 320ms cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'14px 0 0' }}>
          <div style={{ width:36, height:4, borderRadius:2, background:'#E2DED8' }} />
        </div>
        <div style={{ padding:'20px 24px 0' }}>
          <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300,
            letterSpacing:'0.2em', textTransform:'uppercase', color:'#C9A84C', margin:'0 0 6px' }}>
            Enquire
          </p>
          <h3 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:300,
            color:'#111111', margin:'0 0 4px', letterSpacing:'-0.01em' }}>
            {vendor.name}
          </h3>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300,
            color:'#888580', margin:'0 0 20px' }}>
            Your message will be sent directly to their inbox.
          </p>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            rows={4}
            style={{ width:'100%', padding:'12px 14px', background:'#F8F7F5',
              border:'0.5px solid #E2DED8', borderRadius:10,
              fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300,
              color:'#111111', resize:'none', outline:'none', lineHeight:1.6,
              boxSizing:'border-box' as const }}
          />
          <button
            onClick={send}
            disabled={!msg.trim() || sending}
            style={{ width:'100%', padding:'14px 0', marginTop:12,
              background: msg.trim() ? '#111111' : '#E2DED8',
              border:'none', borderRadius:10,
              fontFamily:"'Jost',sans-serif", fontSize:10, fontWeight:300,
              letterSpacing:'0.22em', textTransform:'uppercase' as const,
              color:'#F8F7F5', cursor: msg.trim() ? 'pointer' : 'not-allowed',
              touchAction:'manipulation' }}>
            {sending ? 'Sending...' : 'Send Enquiry'}
          </button>
        </div>
      </div>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </>
  );
}

// ─── Thread View ──────────────────────────────────────────────────────────────
function ThreadView({ thread, messages, loading, onBack, onSend, sending }: {
  thread: Thread; messages: Message[]; loading: boolean;
  onBack: () => void; onSend: (t: string) => void; sending: boolean;
}) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const phone = thread.vendor?.phone?.replace(/\D/g,'').slice(-10);
  const showWA = thread.vendor?.show_whatsapp_public !== false;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const handleSend = () => {
    const t = input.trim();
    if (!t || sending) return;
    setInput(''); onSend(t);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'#F8F7F5',
      display:'flex', flexDirection:'column', fontFamily:"'DM Sans',sans-serif" }}>

      {/* Header */}
      <div style={{ background:'#FFFFFF', borderBottom:'0.5px solid #E2DED8',
        paddingTop:'env(safe-area-inset-top,0px)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px' }}>
          <button onClick={onBack} style={{ width:36, height:36, borderRadius:'50%',
            background:'rgba(17,17,17,0.05)', border:'none', display:'flex',
            alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
            <ArrowLeft size={18} strokeWidth={1.5} color="#111111" />
          </button>
          <Avatar vendor={thread.vendor} size={40} />
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:300,
              color:'#111111', margin:0, letterSpacing:'-0.01em',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {thread.vendor?.name || 'Vendor'}
            </p>
            {thread.vendor?.category && (
              <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300,
                letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', margin:0 }}>
                {catLabel(thread.vendor.category)}{thread.vendor.city ? ` · ${thread.vendor.city}` : ''}
              </p>
            )}
          </div>
          {/* WhatsApp — only if vendor allows */}
          {phone && showWA && (
            <a href={`https://wa.me/91${phone}`} target="_blank" rel="noopener noreferrer"
              style={{ width:36, height:36, borderRadius:'50%', background:'#25D366',
                display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0, textDecoration:'none' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          )}
          {/* Phone */}
          {phone && (
            <a href={`tel:+91${phone}`} style={{ width:36, height:36, borderRadius:'50%',
              background:'rgba(17,17,17,0.05)', border:'none', display:'flex',
              alignItems:'center', justifyContent:'center', flexShrink:0, textDecoration:'none' }}>
              <Phone size={16} strokeWidth={1.5} color="#111111" />
            </a>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px',
        display:'flex', flexDirection:'column', gap:8,
        WebkitOverflowScrolling:'touch' }}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <Shimmer h={44} w="60%" /><Shimmer h={44} w="75%" /><Shimmer h={44} w="50%" />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 0' }}>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18,
              fontWeight:300, color:'#C8C4BE', margin:0 }}>
              Your conversation begins here.
            </p>
          </div>
        ) : messages.map(msg => {
          if (msg.from_role === 'system') return (
            <div key={msg.id} style={{ textAlign:'center', margin:'4px 0' }}>
              <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:300,
                color:'#C8C4BE', background:'#F0EDE8', borderRadius:20, padding:'4px 12px' }}>
                {msg.content.replace('[SYSTEM] ', '')}
              </span>
            </div>
          );
          const isCouple = msg.from_role === 'couple';
          return (
            <div key={msg.id} style={{ display:'flex', justifyContent: isCouple ? 'flex-end' : 'flex-start' }}>
              <div style={{ maxWidth:'75%',
                background: isCouple ? '#111111' : '#FFFFFF',
                border: isCouple ? 'none' : '0.5px solid #E2DED8',
                borderRadius: isCouple ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                padding:'10px 14px',
                boxShadow:'0 1px 4px rgba(17,17,17,0.06)' }}>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300,
                  color: isCouple ? '#F8F7F5' : '#111111',
                  margin:'0 0 4px', lineHeight:1.5 }}>
                  {msg.content}
                </p>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:10, fontWeight:300,
                  color: isCouple ? 'rgba(248,247,245,0.4)' : '#C8C4BE',
                  margin:0, textAlign:'right' }}>
                  {timeAgo(msg.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background:'#FFFFFF', borderTop:'0.5px solid #E2DED8',
        padding:'12px 16px',
        paddingBottom:'calc(env(safe-area-inset-bottom,0px) + 12px)',
        display:'flex', gap:10, alignItems:'flex-end', flexShrink:0 }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Write a message..."
          rows={1}
          style={{ flex:1, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300,
            color:'#111111', background:'#F8F7F5', border:'0.5px solid #E2DED8',
            borderRadius:20, padding:'10px 16px', resize:'none', outline:'none',
            lineHeight:1.5, maxHeight:120, overflowY:'auto', boxSizing:'border-box' as const }}
          onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <button onClick={handleSend} disabled={!input.trim()||sending}
          style={{ width:40, height:40, borderRadius:'50%',
            background: input.trim() ? '#111111' : '#E2DED8',
            border:'none', display:'flex', alignItems:'center', justifyContent:'center',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            flexShrink:0, transition:'background 200ms ease', touchAction:'manipulation' }}>
          <Send size={16} strokeWidth={1.5} color="#F8F7F5" />
        </button>
      </div>
    </div>
  );
}

// ─── Inbox ────────────────────────────────────────────────────────────────────
function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState<string|null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState<Thread|null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [enquiryVendor, setEnquiryVendor] = useState<{id:string;name:string}|null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>|null>(null);

  // Auth
  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session') || localStorage.getItem('couple_web_session');
      if (!raw) { router.replace('/couple/login'); return; }
      const s = JSON.parse(raw);
      if (!s?.id) { router.replace('/couple/login'); return; }
      setUserId(s.id);
    } catch { router.replace('/couple/login'); }
  }, [router]);

  const loadThreads = useCallback(async (uid: string) => {
    try {
      const res = await fetch(`${API}/api/enquiries/couple/${uid}`);
      const json = await res.json();
      if (json.success) setThreads(json.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { if (userId) loadThreads(userId); }, [userId, loadThreads]);

  // Handle ?enquire=vendorId&name=VendorName from feed overlay
  // Clear params immediately after reading to prevent re-opening on tab switch
  useEffect(() => {
    const vendorId = searchParams.get('enquire');
    const vendorName = searchParams.get('name');
    if (vendorId && vendorName && userId) {
      setEnquiryVendor({ id: vendorId, name: decodeURIComponent(vendorName) });
      router.replace('/couple/messages');
    }
  }, [searchParams, userId]);

  // Handle ?thread=threadId direct open
  useEffect(() => {
    const threadId = searchParams.get('thread');
    if (threadId && threads.length > 0) {
      const t = threads.find(th => th.id === threadId);
      if (t) openThread(t);
    }
  }, [searchParams, threads]);

  const loadMessages = useCallback(async (threadId: string) => {
    setMsgsLoading(true);
    try {
      const res = await fetch(`${API}/api/enquiries/${threadId}`);
      const json = await res.json();
      if (json.success) setMessages(json.data.messages || []);
    } catch {}
    setMsgsLoading(false);
  }, []);

  const openThread = useCallback((thread: Thread) => {
    setActiveThread(thread);
    loadMessages(thread.id);
    fetch(`${API}/api/enquiries/${thread.id}/read`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ role:'couple' }),
    }).catch(()=>{});
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(thread.id), 10000);
  }, [loadMessages]);

  const closeThread = useCallback(() => {
    setActiveThread(null); setMessages([]);
    if (pollRef.current) clearInterval(pollRef.current);
    if (userId) loadThreads(userId);
  }, [userId, loadThreads]);

  const sendMessage = useCallback(async (text: string) => {
    if (!activeThread) return;
    setSending(true);
    const opt: Message = { id:`temp-${Date.now()}`, enquiry_id:activeThread.id, from_role:'couple', content:text, created_at:new Date().toISOString() };
    setMessages(prev => [...prev, opt]);
    try {
      await fetch(`${API}/api/enquiries/${activeThread.id}/messages`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ from_role:'couple', content:text }),
      });
      await loadMessages(activeThread.id);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== opt.id));
    }
    setSending(false);
  }, [activeThread, loadMessages]);

  useEffect(() => { return () => { if (pollRef.current) clearInterval(pollRef.current); }; }, []);

  const filtered = searchQ.trim()
    ? threads.filter(t => t.vendor?.name?.toLowerCase().includes(searchQ.toLowerCase()) || t.vendor?.category?.toLowerCase().includes(searchQ.toLowerCase()))
    : threads;

  // Show thread
  if (activeThread) return (
    <ThreadView thread={activeThread} messages={messages} loading={msgsLoading}
      onBack={closeThread} onSend={sendMessage} sending={sending} />
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
      `}</style>

      {/* Enquiry sheet */}
      {enquiryVendor && userId && (
        <EnquirySheet
          vendor={enquiryVendor}
          userId={userId}
          onClose={() => setEnquiryVendor(null)}
          onSent={async (threadId) => {
            setEnquiryVendor(null);
            await loadThreads(userId);
            // Small delay to ensure thread is in list
            setTimeout(async () => {
              const res = await fetch(`${API}/api/enquiries/${threadId}`);
              const json = await res.json();
              if (json.success) {
                const t: Thread = { ...json.data.enquiry, vendor: json.data.vendor };
                setMessages(json.data.messages || []);
                setActiveThread(t);
              }
            }, 500);
          }}
        />
      )}

      <div style={{ background:'#F8F7F5', minHeight:'100dvh', fontFamily:"'DM Sans',sans-serif" }}>
        {/* Header */}
        <div style={{ padding:'24px 16px 16px' }}>
          <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300,
            letterSpacing:'0.25em', textTransform:'uppercase', color:'#C9A84C', margin:'0 0 6px' }}>
            Messages
          </p>
          <h1 style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:32, fontWeight:300,
            color:'#111111', margin:0, letterSpacing:'-0.01em' }}>
            Your conversations
          </h1>
        </div>

        {/* Search */}
        <div style={{ padding:'0 16px 16px' }}>
          <div style={{ position:'relative' }}>
            <Search size={14} strokeWidth={1.5} color="#C8C4BE"
              style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }} />
            <input
              type="text" placeholder="Search conversations..."
              value={searchQ} onChange={e => setSearchQ(e.target.value)}
              style={{ width:'100%', padding:'10px 16px 10px 36px',
                background:'#FFFFFF', border:'0.5px solid #E2DED8', borderRadius:20,
                fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300,
                color:'#111111', outline:'none', boxSizing:'border-box' as const }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ background:'#FFFFFF', borderRadius:'12px 12px 0 0', overflow:'hidden' }}>
          {loading ? (
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:16 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ display:'flex', gap:12, alignItems:'center' }}>
                  <div style={{ width:48, height:48, borderRadius:'50%',
                    background:'linear-gradient(90deg,#F8F7F5 25%,#EEECE8 50%,#F8F7F5 75%)',
                    backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', flexShrink:0 }} />
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
                    <Shimmer h={14} w="50%" /><Shimmer h={12} w="80%" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'80px 24px' }}>
              <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300,
                color:'#111111', margin:'0 0 8px' }}>No conversations yet</p>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300,
                color:'#888580', margin:'0 0 24px', lineHeight:1.6 }}>
                Enquire a Maker from the feed to start a conversation.
              </p>
              <button onClick={() => router.push('/couple/discover/hub')}
                style={{ fontFamily:"'Jost',sans-serif", fontSize:10, fontWeight:300,
                  letterSpacing:'0.2em', textTransform:'uppercase' as const,
                  color:'#F8F7F5', background:'#111111', border:'none',
                  borderRadius:24, padding:'12px 24px', cursor:'pointer',
                  touchAction:'manipulation' }}>
                Discover Makers
              </button>
            </div>
          ) : filtered.map(thread => (
            <div key={thread.id} onClick={() => openThread(thread)}
              style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
                background:'#FFFFFF', borderBottom:'0.5px solid #F0EDE8',
                cursor:'pointer', touchAction:'manipulation' }}>
              <Avatar vendor={thread.vendor} size={48} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:3 }}>
                  <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:300,
                    color:'#111111', margin:0, letterSpacing:'-0.01em' }}>
                    {thread.vendor?.name || 'Unknown'}
                  </p>
                  <span style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:300,
                    color:'#C8C4BE', flexShrink:0 }}>
                    {timeAgo(thread.last_message_at)}
                  </span>
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12,
                    fontWeight: thread.couple_unread_count>0 ? 400 : 300,
                    color: thread.couple_unread_count>0 ? '#111111' : '#888580',
                    margin:0, overflow:'hidden', textOverflow:'ellipsis',
                    whiteSpace:'nowrap', maxWidth:'88%' }}>
                    {thread.last_message_from==='couple' ? 'You: ' : ''}{thread.last_message_preview || 'No messages yet'}
                  </p>
                  {thread.couple_unread_count>0 && (
                    <div style={{ width:8, height:8, borderRadius:'50%', background:'#C9A84C', flexShrink:0 }} />
                  )}
                </div>
                {thread.vendor?.category && (
                  <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300,
                    letterSpacing:'0.15em', textTransform:'uppercase', color:'#C8C4BE', margin:'3px 0 0' }}>
                    {catLabel(thread.vendor.category)}{thread.vendor.city ? ` · ${thread.vendor.city}` : ''}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div style={{ background:'#F8F7F5', minHeight:'100dvh' }} />}>
      <MessagesContent />
    </Suspense>
  );
}

// Export EnquirySheet for use from feed overlay and muse
export { EnquirySheet };
