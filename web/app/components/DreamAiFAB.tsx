'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

const API  = 'https://dream-wedding-production-89ae.up.railway.app';
const GOLD = '#C9A84C';
const HIDDEN = ['/pin', '/pin-login', '/login', '/setup', '/demo'];

interface Msg {
  role: 'user' | 'assistant';
  text: string;
  actionType?: string;
  actionLabel?: string;
  actionPreview?: string;
  actionParams?: Record<string, any>;
}

// ─── Action Card ──────────────────────────────────────────────────────────────
function ActionCard({ msg, userType, userId, onConfirm, onDismiss }: {
  msg: Msg; userType: 'vendor' | 'couple'; userId: string;
  onConfirm: (result: string) => void; onDismiss: () => void;
}) {
  const [executing, setExecuting] = useState(false);

  const vendorEps: Record<string, string> = {
    create_invoice:       '/api/v2/dreamai/vendor-action/create-invoice',
    add_client:           '/api/v2/dreamai/vendor-action/add-client',
    create_task:          '/api/v2/dreamai/vendor-action/create-task',
    block_date:           '/api/v2/dreamai/vendor-action/block-date',
    send_payment_reminder:'/api/v2/dreamai/vendor-action/send-payment-reminder',
    send_client_reminder: '/api/v2/dreamai/vendor-action/send-client-reminder',
    log_expense:          '/api/v2/dreamai/vendor-action/log-expense',
    reply_to_enquiry:     '/api/v2/dreamai/vendor-action/reply-to-enquiry',
  };
  const coupleEps: Record<string, string> = {
    complete_task: '/api/v2/dreamai/action/complete-task',
    add_expense:   '/api/v2/dreamai/action/add-expense',
    send_whatsapp: '/api/v2/dreamai/action/send-whatsapp-reminder',
    send_enquiry:  '/api/v2/dreamai/action/send-enquiry',
  };

  async function execute() {
    if (executing || !msg.actionType) return;
    const eps = userType === 'vendor' ? vendorEps : coupleEps;
    const ep = eps[msg.actionType];
    if (!ep) { onConfirm('Action not available yet.'); return; }
    setExecuting(true);
    try {
      const bodyKey = userType === 'vendor' ? 'vendor_id' : 'couple_id';
      const r = await fetch(API + ep, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [bodyKey]: userId, ...(msg.actionParams || {}) }),
      });
      const d = await r.json();
      onConfirm(d.message || 'Done.');
    } catch { onConfirm('Could not complete that action. Please try again.'); }
    finally { setExecuting(false); }
  }

  return (
    <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, padding: '12px 14px', margin: '4px 0 8px' }}>
      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 7, fontWeight: 200, letterSpacing: '0.22em', textTransform: 'uppercase', color: GOLD, margin: '0 0 8px' }}>✦ Action Preview</p>
      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#F8F7F5', margin: '0 0 12px', lineHeight: 1.5 }}>{msg.actionPreview}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={execute} disabled={executing} style={{ flex: 1, height: 36, background: GOLD, border: 'none', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#111', cursor: executing ? 'default' : 'pointer', opacity: executing ? 0.7 : 1, touchAction: 'manipulation' }}>
          {executing ? '...' : 'Confirm'}
        </button>
        <button onClick={onDismiss} style={{ height: 36, padding: '0 14px', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 300, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(248,247,245,0.4)', cursor: 'pointer', touchAction: 'manipulation' }}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ onClose, userType, userId }: {
  onClose: () => void; userType: 'vendor' | 'couple'; userId: string;
}) {
  const [msgs, setMsgs]     = useState<Msg[]>([]);
  const [input, setInput]   = useState('');
  const [busy, setBusy]     = useState(false);
  const [ctx, setCtx]       = useState<any>(null);
  const [ctxLoading, setCtxLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Fetch context on open
  useEffect(() => {
    if (!userId) { setCtxLoading(false); return; }
    const ep = userType === 'vendor'
      ? `/api/v2/dreamai/vendor-context/${userId}`
      : `/api/v2/dreamai/couple-context/${userId}`;
    fetch(API + ep)
      .then(r => r.json())
      .then(d => { setCtx(d); setCtxLoading(false); })
      .catch(() => setCtxLoading(false));
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [userId, userType]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  const chips = userType === 'vendor'
    ? ['Who owes me money?', 'Any new enquiries?', 'Draft a payment reminder', 'What should I do today?']
    : ["What's left to plan?", 'Who should I book next?', "How's my budget?", 'What are my tasks this week?'];

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || busy) return;
    setInput('');
    setMsgs(p => [...p, { role: 'user', text: msg }]);
    setBusy(true);
    try {
      const r = await fetch(API + '/api/v2/dreamai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userType, message: msg, context: ctx }),
      });
      const d = await r.json();
      const replyText = d.reply || d.response || 'Something went wrong. Please try again.';

      // Parse action tag — strip ALL action tags from display text
      const actionMatch = replyText.match(/\[ACTION:(\w+)\|([^|]+)\|([^|]+)\|(\{[^\]]+\})\]/);
      const cleanText = replyText.replace(/\[ACTION:[^\]]+\]/g, '').trim();
      if (actionMatch) {
        const [, type, label, preview, paramsStr] = actionMatch;
        let params = {};
        try { params = JSON.parse(paramsStr); } catch {}
        setMsgs(p => [...p, { role: 'assistant', text: cleanText, actionType: type, actionLabel: label, actionPreview: preview, actionParams: params }]);
      } else {
        setMsgs(p => [...p, { role: 'assistant', text: cleanText }]);
      }
    } catch {
      setMsgs(p => [...p, { role: 'assistant', text: 'Could not connect.' }]);
    }
    setBusy(false);
  }

  return (
    <>
      <style>{`
        @keyframes fabIn{from{opacity:0;transform:translate(-50%,-48%) scale(0.95)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes dot{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}
      `}</style>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(12,10,9,0.65)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)' }} />
      <div style={{ position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:1001,width:'calc(100vw - 40px)',maxWidth:420,maxHeight:'78vh',background:'#0C0A09',borderRadius:20,display:'flex',flexDirection:'column',overflow:'hidden',animation:'fabIn 260ms cubic-bezier(0.22,1,0.36,1)' }}>

        {/* Header */}
        <div style={{ padding:'14px 18px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'0.5px solid rgba(255,255,255,0.08)',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ width:7,height:7,borderRadius:'50%',background:GOLD }} />
            <p style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.22em',textTransform:'uppercase',color:GOLD,margin:0 }}>DreamAi</p>
            {!ctxLoading && ctx && (
              <span style={{ fontFamily:"'Jost',sans-serif",fontSize:7,fontWeight:200,letterSpacing:'0.15em',textTransform:'uppercase',color:'#4A7C59',background:'rgba(74,124,89,0.1)',padding:'2px 7px',borderRadius:100 }}>Live</span>
            )}
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'rgba(248,247,245,0.35)',fontSize:18,cursor:'pointer',padding:4,lineHeight:1,touchAction:'manipulation' }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex:1,overflowY:'auto',padding:'14px 18px',display:'flex',flexDirection:'column',gap:8,minHeight:0 }}>

          {/* Empty state */}
          {msgs.length === 0 && !ctxLoading && (
            <p style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontWeight:300,fontSize:17,color:'rgba(248,247,245,0.45)',margin:'0 0 8px' }}>
              {userType === 'vendor' ? 'Ask anything about your business.' : 'Ask anything about your wedding.'}
            </p>
          )}
          {msgs.length === 0 && ctxLoading && (
            <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'rgba(248,247,245,0.3)',margin:0 }}>Loading your data...</p>
          )}

          {/* Message thread */}
          {msgs.map((m, i) => (
            <div key={i}>
              <div style={{ display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',marginBottom:m.actionType?2:0 }}>
                <div style={{ maxWidth:'82%',padding:'9px 13px',borderRadius:m.role==='user'?'13px 13px 2px 13px':'13px 13px 13px 2px',background:m.role==='user'?GOLD:'rgba(255,255,255,0.06)',fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,lineHeight:1.5,color:m.role==='user'?'#0C0A09':'#F8F7F5',whiteSpace:'pre-wrap' }}>
                  {m.text}
                </div>
              </div>
              {m.actionType && m.actionPreview && (
                <ActionCard
                  msg={m} userType={userType} userId={userId}
                  onConfirm={result => {
                    setMsgs(p => p.map((msg, idx) => idx === i ? { ...msg, actionType: undefined } : msg));
                    setMsgs(p => [...p, { role: 'assistant', text: result }]);
                  }}
                  onDismiss={() => setMsgs(p => p.map((msg, idx) => idx === i ? { ...msg, actionType: undefined } : msg))}
                />
              )}
            </div>
          ))}

          {/* Typing */}
          {busy && <div style={{ display:'flex',gap:4,padding:'4px 0' }}>{[0,1,2].map(i=><div key={i} style={{ width:5,height:5,borderRadius:'50%',background:GOLD,animation:`dot 1.2s ${i*0.2}s ease-in-out infinite` }} />)}</div>}
          <div ref={bottomRef} />
        </div>

        {/* Quick chips */}
        {msgs.length === 0 && !ctxLoading && (
          <div style={{ padding:'0 18px 10px',display:'flex',gap:7,overflowX:'auto',scrollbarWidth:'none',flexShrink:0 }}>
            {chips.map((c,i) => (
              <button key={i} onClick={() => send(c)} style={{ flexShrink:0,height:32,padding:'0 11px',background:'#111111',border:'0.5px solid '+GOLD,borderRadius:100,cursor:'pointer',touchAction:'manipulation',fontFamily:"'Jost',sans-serif",fontSize:8,fontWeight:300,letterSpacing:'0.15em',textTransform:'uppercase',color:GOLD,whiteSpace:'nowrap' }}>{c}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ padding:'8px 18px 14px',display:'flex',gap:8,alignItems:'center',borderTop:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0 }}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask anything..." style={{ flex:1,background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'9px 14px',fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:'#F8F7F5',outline:'none' }} />
          <button onClick={()=>send()} disabled={!input.trim()||busy} style={{ width:38,height:38,borderRadius:'50%',border:'none',flexShrink:0,background:input.trim()&&!busy?GOLD:'rgba(255,255,255,0.07)',cursor:input.trim()&&!busy?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 150ms ease',touchAction:'manipulation' }}>
            <span style={{ fontSize:13,color:input.trim()&&!busy?'#0C0A09':'rgba(255,255,255,0.25)',lineHeight:1 }}>↑</span>
          </button>
        </div>
      </div>
    </>
  );
}

// ─── FAB ─────────────────────────────────────────────────────────────────────
export default function DreamAiFAB({ userType='vendor', userId }: { userType?:'vendor'|'couple'; userId?: string; }) {
  const pathname = usePathname();
  const [open, setOpen]       = useState(false);
  const [urgent, setUrgent]   = useState(false);
  const [pos, setPos]         = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const startPosRef   = useRef({ x: 0, y: 0 });
  const startPtrRef   = useRef({ x: 0, y: 0 });
  const movedRef      = useRef(false);
  const dragActiveRef = useRef(false);
  const longTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedId = userId || (() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem('vendor_session')||localStorage.getItem('vendor_web_session')
               ||localStorage.getItem('couple_session')||localStorage.getItem('couple_web_session');
      if (!raw) return '';
      const s = JSON.parse(raw);
      return s.vendorId||s.userId||s.id||'';
    } catch { return ''; }
  })();

  useEffect(() => {
    if (!resolvedId || userType !== 'vendor') return;
    fetch(API + '/api/v2/vendor/today/' + resolvedId)
      .then(r=>r.json()).then(d=>setUrgent((d.data?.needs_attention||[]).length>0)).catch(()=>{});
  }, [resolvedId, userType]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (open) return;
    movedRef.current = false;
    dragActiveRef.current = false;
    startPosRef.current = { x: pos.x, y: pos.y };
    startPtrRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    longTimerRef.current = setTimeout(() => {
      if (!movedRef.current) { dragActiveRef.current = true; setDragging(true); }
    }, 500);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - startPtrRef.current.x;
    const dy = e.clientY - startPtrRef.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
    if (dragActiveRef.current) setPos({ x: startPosRef.current.x + dx, y: startPosRef.current.y + dy });
  };

  const onPointerUp = () => {
    if (longTimerRef.current) { clearTimeout(longTimerRef.current); longTimerRef.current = null; }
    if (dragActiveRef.current) { dragActiveRef.current = false; setDragging(false); return; }
    if (!movedRef.current) setOpen(true);
  };

  if (HIDDEN.some(r => pathname?.includes(r))) return null;

  return (
    <>
      {open && <Modal onClose={() => setOpen(false)} userType={userType} userId={resolvedId} />}
      <button
        onClick={() => { if (!movedRef.current && !dragActiveRef.current) setOpen(true); }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          if (longTimerRef.current) { clearTimeout(longTimerRef.current); longTimerRef.current = null; }
          dragActiveRef.current = false;
          setDragging(false);
        }}
        style={{
          position: 'fixed',
          bottom: 'calc(env(safe-area-inset-bottom,0px) + 88px)',
          right: 24,
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          width: 52, height: 52, borderRadius: '50%',
          background: dragging ? 'rgba(17,17,17,0.9)' : '#111111',
          border: `1.5px solid ${dragging ? GOLD : 'rgba(201,168,76,0.3)'}`,
          cursor: dragging ? 'grabbing' : 'pointer',
          zIndex: 997,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          touchAction: 'none',
          userSelect: 'none', WebkitUserSelect: 'none',
          transition: 'border-color 200ms ease, background 200ms ease',
          animation: urgent && !dragging ? 'fabRing 2s ease-out infinite' : 'none',
          outline: 'none', WebkitTapHighlightColor: 'transparent',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ pointerEvents:'none', display:'block' }}>
          <path d="M8 0L9.5 6.5L16 8L9.5 9.5L8 16L6.5 9.5L0 8L6.5 6.5Z" fill={GOLD} />
        </svg>
      </button>
      <style>{`@keyframes fabRing{0%{box-shadow:0 0 0 0 rgba(201,168,76,0.45)}70%{box-shadow:0 0 0 10px rgba(201,168,76,0)}100%{box-shadow:0 0 0 0 rgba(201,168,76,0)}}`}</style>
    </>
  );
}
