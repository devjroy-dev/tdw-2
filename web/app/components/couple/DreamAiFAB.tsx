'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const API  = 'https://dream-wedding-production-89ae.up.railway.app';
const GOLD = '#C9A84C';
const HIDDEN = ['/pin', '/pin-login', '/login', '/setup', '/demo'];

interface Msg { role: 'user'|'assistant'; text: string; }

function Modal({ onClose, userType, userId }: {
  onClose: () => void; userType: 'vendor'|'couple'; userId: string;
}) {
  const [msgs, setMsgs]     = useState<Msg[]>([]);
  const [input, setInput]   = useState('');
  const [busy, setBusy]     = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 300); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  async function send(text?: string) {
    const msg = (text || input).trim();
    if (!msg || busy) return;
    setInput('');
    setMsgs(p => [...p, { role: 'user', text: msg }]);
    setBusy(true);
    try {
      const r = await fetch(API + '/api/v2/dreamai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: userId, couple_id: userId, message: msg }),
      });
      const d = await r.json();
      setMsgs(p => [...p, { role: 'assistant', text: d.reply || d.response || 'Done.' }]);
    } catch {
      setMsgs(p => [...p, { role: 'assistant', text: 'Could not connect.' }]);
    }
    setBusy(false);
  }

  const chips = [
    'Tips & tricks',
    ...(userType === 'vendor'
      ? ["Who owes me money?", "Any unanswered enquiries?", "Draft a payment reminder"]
      : ["What's left to plan?", "Who should I book next?", "What's my budget?"]),
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes fabIn{from{opacity:0;transform:translate(-50%,-48%) scale(0.95)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
        @keyframes dot{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}
      `}</style>
      <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:1000,background:'rgba(12,10,9,0.65)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)' }} />
      <div style={{ position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',zIndex:1001,width:'calc(100vw - 40px)',maxWidth:420,maxHeight:'75vh',background:'#0C0A09',borderRadius:20,display:'flex',flexDirection:'column',overflow:'hidden',animation:'fabIn 260ms cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ padding:'14px 18px 12px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'0.5px solid rgba(255,255,255,0.08)',flexShrink:0 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <div style={{ width:7,height:7,borderRadius:'50%',background:GOLD }} />
            <p style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.22em',textTransform:'uppercase',color:GOLD,margin:0 }}>DreamAi</p>
          </div>
          <button onClick={onClose} style={{ background:'none',border:'none',color:'rgba(248,247,245,0.35)',fontSize:18,cursor:'pointer',padding:4,lineHeight:1,touchAction:'manipulation' }}>✕</button>
        </div>
        <div style={{ flex:1,overflowY:'auto',padding:'14px 18px',display:'flex',flexDirection:'column',gap:10,minHeight:0 }}>
          {msgs.length === 0 && <p style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontWeight:300,fontSize:17,color:'rgba(248,247,245,0.45)',margin:0 }}>What can I help with?</p>}
          {msgs.map((m,i) => (
            <div key={i} style={{ display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
              <div style={{ maxWidth:'82%',padding:'9px 13px',borderRadius:m.role==='user'?'13px 13px 2px 13px':'13px 13px 13px 2px',background:m.role==='user'?GOLD:'rgba(255,255,255,0.06)',fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,lineHeight:1.5,color:m.role==='user'?'#0C0A09':'#F8F7F5' }}>{m.text}</div>
            </div>
          ))}
          {busy && <div style={{ display:'flex',gap:4,padding:'4px 0' }}>{[0,1,2].map(i=><div key={i} style={{ width:5,height:5,borderRadius:'50%',background:GOLD,animation:`dot 1.2s ${i*0.2}s ease-in-out infinite` }} />)}</div>}
          <div ref={bottomRef} />
        </div>
        {msgs.length === 0 && (
          <div style={{ padding:'0 18px 10px',display:'flex',gap:7,overflowX:'auto',scrollbarWidth:'none',flexShrink:0 }}>
            {chips.map((c,i) => (
              <button key={i} onClick={() => send(c)} style={{ flexShrink:0,height:32,padding:'0 11px',background:'#111111',border:'0.5px solid '+GOLD,borderRadius:100,cursor:'pointer',touchAction:'manipulation',fontFamily:"'Jost',sans-serif",fontSize:8,fontWeight:300,letterSpacing:'0.15em',textTransform:'uppercase',color:GOLD,whiteSpace:'nowrap' }}>{c}</button>
            ))}
          </div>
        )}
        <div style={{ padding:'8px 18px 14px',display:'flex',gap:8,alignItems:'center',borderTop:'0.5px solid rgba(255,255,255,0.06)',flexShrink:0 }}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask anything..." style={{ flex:1,background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:100,padding:'9px 14px',fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:'#F8F7F5',outline:'none' }} />
          <button onClick={()=>send()} disabled={!input.trim()||busy} style={{ width:38,height:38,borderRadius:'50%',border:'none',flexShrink:0,background:input.trim()&&!busy?GOLD:'rgba(255,255,255,0.07)',cursor:input.trim()&&!busy?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',transition:'background 150ms ease' }}>
            <span style={{ fontSize:13,color:input.trim()&&!busy?'#0C0A09':'rgba(255,255,255,0.25)',lineHeight:1 }}>↑</span>
          </button>
        </div>
      </div>
    </>
  );
}

export default function DreamAiFAB({ userType='vendor', userId }: { userType?:'vendor'|'couple'; userId?: string; }) {
  const pathname  = usePathname();
  const [open, setOpen]     = useState(false);
  const [urgent, setUrgent] = useState(false);
  const tappedRef = useRef(false);

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

  if (HIDDEN.some(r => pathname?.includes(r))) return null;

  return (
    <>
      {open && <Modal onClose={() => setOpen(false)} userType={userType} userId={resolvedId} />}
      <button
        onClick={() => setOpen(true)}
        onPointerDown={e => { e.preventDefault(); tappedRef.current = true; }}
        onPointerUp={e => { e.preventDefault(); if (tappedRef.current) { tappedRef.current = false; } }}
        onPointerCancel={() => { tappedRef.current = false; }}
        style={{
          position:'fixed',
          bottom:'calc(env(safe-area-inset-bottom,0px) + 88px)', right:24,
          width:52, height:52, borderRadius:'50%',
          background:'#111111',
          border:'1.5px solid rgba(201,168,76,0.3)',
          cursor:'pointer', zIndex:997,
          display:'flex', alignItems:'center', justifyContent:'center',
          touchAction:'manipulation',
          userSelect:'none', WebkitUserSelect:'none',
          animation: urgent ? 'fabRing 2s ease-out infinite' : 'none',
          outline:'none', WebkitTapHighlightColor:'transparent',
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
