'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

interface HeroData { state: 'no_date'|'date_only'|'event'|'past'; days_until: number|null; event_name: string|null; wedding_date: string|null; }
interface Moment { type: string; priority: number; title: string; body: string; action: string; task_id?: string; enquiry_id?: string; expense_id?: string; event_id?: string; due_date?: string; amount?: number; event_name?: string; }
interface MuseSave { id: string; vendor_id: string; created_at: string; vendor: { id: string; name: string; category: string; city?: string; featured_photos?: string[]; portfolio_images?: string[]; starting_price?: number; } | null; }
interface EventItem { id: string; event_name: string; event_date: string; venue?: string; }
interface Payment { id: string; vendor_name?: string; actual_amount?: number; due_date?: string; description?: string; }
interface QuietActivity { type: string; text: string; at: string; enquiry_id?: string; }
interface TodayData { hero: HeroData; three_moments: Moment[]; muse_saves: MuseSave[]; this_week_events: EventItem[]; upcoming_payments: Payment[]; budget: { total: number; committed: number; paid: number }; next_event: EventItem|null; quiet_activity: QuietActivity[]; priority_tasks: any[]; }
interface Session { id: string; name?: string; dreamer_type?: string; }
interface ChatMessage { role: 'user'|'ai'; text: string; actionType?: string; actionLabel?: string; actionPreview?: string; actionParams?: Record<string,any>; }

function getSession(): Session|null {
  if (typeof window === 'undefined') return null;
  try { const raw = localStorage.getItem('couple_session')||localStorage.getItem('couple_web_session'); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function numberToWords(n: number): string {
  if (n <= 0) return 'Zero';
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (n < 20) return ones[n];
  if (n < 100) return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');
  if (n < 1000) return ones[Math.floor(n/100)]+' hundred'+(n%100?' '+numberToWords(n%100):'');
  return ones[Math.floor(n/1000)]+' thousand'+(n%1000?' '+numberToWords(n%1000):'');
}

function formatDate(d: string) { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}); }
function formatShortDate(d: string) { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}); }
function fmtINR(n: number) { return '₹'+n.toLocaleString('en-IN'); }
function timeAgo(dateStr: string) { const diff=Date.now()-new Date(dateStr).getTime(); const h=Math.floor(diff/3600000); const d=Math.floor(diff/86400000); if(h<1)return'Just now'; if(h<24)return`${h}h ago`; if(d<7)return`${d}d ago`; return formatShortDate(dateStr); }

function Shimmer({ h, w='100%', br=8 }: { h: number; w?: string|number; br?: number }) {
  return <div style={{ height:h, width:w, borderRadius:br, background:'linear-gradient(90deg,#EEECE8 25%,#F8F7F5 50%,#EEECE8 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }} />;
}

function Toast({ msg, onDone }: { msg: string|null; onDone: () => void }) {
  useEffect(() => { if (msg) { const t=setTimeout(onDone,3000); return ()=>clearTimeout(t); } },[msg,onDone]);
  if (!msg) return null;
  return <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', background:'#111', color:'#F8F7F5', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, padding:'10px 20px', borderRadius:100, zIndex:9999, whiteSpace:'nowrap' }}>{msg}</div>;
}

// Robust ACTION tag parser — couple side
function parseActionTag(text: string) {
  const start = text.indexOf('[ACTION:');
  if (start === -1) return null;
  const end = text.lastIndexOf(']');
  if (end === -1 || end <= start) return null;
  const tagContent = text.slice(start + 8, end);
  const firstPipe = tagContent.indexOf('|');
  const secondPipe = tagContent.indexOf('|', firstPipe + 1);
  const lastBrace = tagContent.lastIndexOf('{');
  if (firstPipe === -1 || secondPipe === -1 || lastBrace === -1) return null;
  const type = tagContent.slice(0, firstPipe);
  const label = tagContent.slice(firstPipe + 1, secondPipe);
  const preview = tagContent.slice(secondPipe + 1, lastBrace - 1).trim();
  const paramsStr = tagContent.slice(lastBrace);
  let params: Record<string,any> = {};
  try { params = JSON.parse(paramsStr); } catch {}
  const cleanText = (text.slice(0, start) + text.slice(end + 1)).trim();
  return { type, label, preview, params, cleanText };
}

function CoupleActionCard({ msg, userId, onConfirm, onDismiss }: {
  msg: ChatMessage; userId: string;
  onConfirm: (result: string) => void; onDismiss: () => void;
}) {
  const [executing, setExecuting] = useState(false);
  const eps: Record<string, string> = {
    complete_task: '/api/v2/dreamai/action/complete-task',
    add_expense:   '/api/v2/dreamai/action/add-expense',
    send_whatsapp: '/api/v2/dreamai/action/send-whatsapp-reminder',
    send_enquiry:  '/api/v2/dreamai/action/send-enquiry',
  };
  async function execute() {
    if (!msg.actionType) return;
    const ep = eps[msg.actionType];
    if (!ep) { onConfirm('Action not available yet.'); return; }
    setExecuting(true);
    try {
      const r = await fetch(API + ep, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couple_id: userId, ...(msg.actionParams || {}) }),
      });
      const d = await r.json();
      onConfirm(d.message || 'Done.');
    } catch { onConfirm('Could not complete. Please try again.'); }
    finally { setExecuting(false); }
  }
  return (
    <div style={{ background: '#FFFEF8', border: '1px solid #C9A84C', borderRadius: 12, padding: '12px 14px', margin: '4px 0 8px' }}>
      <p style={{ fontFamily: "'Jost',sans-serif", fontSize: 7, fontWeight: 200, letterSpacing: '0.22em', textTransform: 'uppercase' as const, color: '#C9A84C', margin: '0 0 6px' }}>✦ Action Preview</p>
      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, fontWeight: 300, color: '#111', margin: '0 0 12px', lineHeight: 1.5 }}>{msg.actionPreview}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={execute} disabled={executing} style={{ flex: 1, height: 36, background: '#C9A84C', border: 'none', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase' as const, color: '#111', cursor: 'pointer' }}>
          {executing ? '...' : 'Confirm'}
        </button>
        <button onClick={onDismiss} style={{ height: 36, padding: '0 14px', background: 'transparent', border: '0.5px solid #E2DED8', borderRadius: 100, fontFamily: "'Jost',sans-serif", fontSize: 9, color: '#888580', cursor: 'pointer' }}>Cancel</button>
      </div>
    </div>
  );
}

function DreamAiSheet({ visible, onClose, context, userId, prefill }: { visible: boolean; onClose: ()=>void; context: any; userId: string; prefill?: string; }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (visible && prefill) setInput(prefill); },[visible,prefill]);
  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[messages,loading]);

  async function send(text: string) {
    const msg = text.trim(); if (!msg || loading) return;
    setInput(''); setMessages(p => [...p, { role: 'user', text: msg }]); setLoading(true);
    try {
      const res = await fetch(`${API}/api/v2/dreamai/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, userType: 'couple', message: msg, context, history: messages.slice(-10) }),
      });
      const json = await res.json();
      const replyText = json.reply || 'Something went wrong.';
      const parsed = parseActionTag(replyText);
      const cleanText = parsed ? parsed.cleanText : replyText.replace(/\[ACTION:[^\]]*\]/g, '').trim();
      if (parsed) {
        setMessages(p => [...p, { role: 'ai', text: cleanText, actionType: parsed.type, actionLabel: parsed.label, actionPreview: parsed.preview, actionParams: parsed.params }]);
      } else {
        setMessages(p => [...p, { role: 'ai', text: cleanText }]);
      }
    } catch { setMessages(p => [...p, { role: 'ai', text: 'Unable to reach DreamAi.' }]); }
    finally { setLoading(false); }
  }

  const s: React.CSSProperties = { position:'fixed', inset:0, zIndex:300 };
  return (
    <>
      <div onClick={onClose} style={{ ...s, background:'rgba(17,17,17,0.4)', opacity:visible?1:0, pointerEvents:visible?'auto':'none', transition:'opacity 280ms cubic-bezier(0.22,1,0.36,1)' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:301, height:'92dvh', background:'#FFFFFF', borderRadius:'24px 24px 0 0', transform:visible?'translateY(0)':'translateY(100%)', transition:'transform 320ms cubic-bezier(0.22,1,0.36,1)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}><div style={{ width:36, height:4, borderRadius:2, background:'#E2DED8' }} /></div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 20px 12px', borderBottom:'0.5px solid #E2DED8' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}><span style={{ fontSize:16 }}>✦</span><span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300, color:'#111' }}>DreamAi</span></div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#888580', fontSize:13, padding:4 }}>✕</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'8px 20px 16px' }}>
          {messages.length===0 && <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:300, fontStyle:'italic', color:'#888580', textAlign:'center', marginTop:48 }}>Ask anything about your wedding.</p>}
          {messages.map((m,i)=>(
            <div key={i} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
                <div style={{ maxWidth:'80%', background:m.role==='user'?'#FFFFFF':'#F8F7F5', border:m.role==='user'?'0.5px solid #C9A84C':'0.5px solid #E2DED8', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', padding:'10px 14px' }}>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300, color:'#111', margin:0, lineHeight:1.5 }}>{m.text}</p>
                </div>
              </div>
              {m.role==='ai' && m.actionType && !dismissed.has(i) && (
                <CoupleActionCard
                  msg={m} userId={userId}
                  onConfirm={(result) => { setMessages(p => [...p, { role: 'ai', text: result }]); setDismissed(d => new Set(d).add(i)); }}
                  onDismiss={() => setDismissed(d => new Set(d).add(i))}
                />
              )}
            </div>
          ))}
          {loading && (
            <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:12 }}>
              <div style={{ background:'#F8F7F5', border:'0.5px solid #E2DED8', borderRadius:'16px 16px 16px 4px', padding:'12px 18px', display:'flex', gap:5, alignItems:'center' }}>
                {[0,1,2].map(i => (
                  <div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#888580', animation:`typingDot 1.2s ease-in-out ${i*0.2}s infinite` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div style={{ display:'flex', gap:10, padding:'12px 16px', borderTop:'0.5px solid #E2DED8', paddingBottom:'calc(12px + env(safe-area-inset-bottom))', background:'#FFFFFF' }}>
          <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send(input);}} placeholder="Ask anything about your wedding..." style={{ flex:1, height:44, fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300, color:'#111', background:'#F8F7F5', border:'0.5px solid #E2DED8', borderRadius:22, padding:'0 16px', outline:'none' }} />
          <button onClick={()=>send(input)} disabled={loading||!input.trim()} style={{ width:44, height:44, borderRadius:'50%', background:input.trim()?'#C9A84C':'#E2DED8', border:'none', cursor:input.trim()?'pointer':'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><span style={{ color:'#FFF', fontSize:16 }}>↑</span></button>
        </div>
      </div>
    </>
  );
}


function MomentCard({ moment, onAction }: { moment: Moment; onAction: (m: Moment)=>void; }) {
  const accent = moment.priority <= 1 ? '#C9A84C' : '#8C8480';
  return (
    <div style={{ background:'#FFFFFF', border:'0.5px solid #E2DED8', borderLeft:`3px solid ${accent}`, borderRadius:'0 12px 12px 0', padding:16, marginBottom:10 }}>
      <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.2em', textTransform:'uppercase', color:accent, margin:'0 0 6px' }}>{moment.title}</p>
      <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:300, color:'#111', margin:'0 0 12px', lineHeight:1.3 }}>{moment.body}</p>
      <button onClick={()=>onAction(moment)} style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:400, letterSpacing:'0.15em', textTransform:'uppercase', color:'#F8F7F5', background:'#111', border:'none', borderRadius:100, padding:'7px 14px', cursor:'pointer', touchAction:'manipulation' }}>{moment.action}</button>
    </div>
  );
}

export default function TodayPage() {
  const [session, setSession] = useState<Session|null>(null);
  const [data, setData] = useState<TodayData|null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string|null>(null);
  const [dreamAiOpen, setDreamAiOpen] = useState(false);
  const [dreamAiPrefill, setDreamAiPrefill] = useState('');
  const [dreamAiContext, setDreamAiContext] = useState<any>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const showToast = useCallback((msg: string) => setToast(msg), []);

  const router = useRouter();

  useEffect(() => {
    try {
      const s=getSession();
      if(!s?.id){window.location.replace('/couple/login');return;}
      setSession(s);
      // PWA restore — redirect to last visited path if different from today
      const lastPath = localStorage.getItem('couple_last_path');
      const currentPath = window.location.pathname;
      if (lastPath && lastPath !== currentPath && lastPath !== '/couple/today') {
        router.replace(lastPath);
        return;
      }
    } catch { window.location.replace('/couple/login'); }
  },[router]);

  useEffect(() => {
    if (!session) return;
    fetch(`${API}/api/v2/couple/today/${session.id}`).then(r=>r.json()).then(json=>{setData(json);setLoading(false);}).catch(()=>{showToast('Could not load your dashboard.');setLoading(false);});
  },[session,showToast]);

  useEffect(() => {
    if (!session) return;
    fetch(`${API}/api/v2/dreamai/couple-context/${session.id}`).then(r=>r.json()).then(setDreamAiContext).catch(()=>{});
  },[session]);

  async function completeTask(taskId: string) {
    setCompletedIds(p=>new Set([...p,taskId]));
    try { await fetch(`${API}/api/v2/couple/tasks/${taskId}/complete`,{method:'PATCH'}); } catch {}
  }

  function handleMomentAction(m: Moment) {
    if (m.task_id) { completeTask(m.task_id); showToast('Task marked done'); return; }
    if (m.enquiry_id) { window.location.href=`/couple/messages?thread=${m.enquiry_id}`; return; }
    if (m.expense_id) { window.location.href='/couple/plan'; return; }
    if (m.event_name) { window.location.href='/couple/discover/hub'; return; }
  }

  function openDreamAi(prefill?: string) { setDreamAiPrefill(prefill||''); setDreamAiOpen(true); }

  const moments = (data?.three_moments||[]).filter(m=>!m.task_id||!completedIds.has(m.task_id!));
  const initial = (session?.name?.[0]||'D').toUpperCase();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        *{box-sizing:border-box;} html,body{margin:0;padding:0;background:#F8F7F5;}
        ::-webkit-scrollbar{display:none;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes typingDot{0%,80%,100%{opacity:0.2;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}
        .fade-in{animation:fadeIn 320ms cubic-bezier(0.22,1,0.36,1) both;}
      `}</style>

      <Toast msg={toast} onDone={()=>setToast(null)} />
      <DreamAiSheet visible={dreamAiOpen} onClose={()=>setDreamAiOpen(false)} context={dreamAiContext} userId={session?.id||''} prefill={dreamAiPrefill} />

      <div style={{ minHeight:'100dvh', background:'#F8F7F5', paddingBottom:'calc(80px + env(safe-area-inset-bottom))' }}>



        <div className="fade-in" style={{ padding:'0 20px' }}>
          {loading ? (
            <div style={{ paddingTop:32, display:'flex', flexDirection:'column', gap:12 }}>
              <Shimmer h={80} br={12}/><Shimmer h={120} br={12}/><Shimmer h={64} br={12}/>
            </div>
          ) : (
            <>
              {/* Hero */}
              <div style={{ textAlign:'center', padding:'32px 0 28px' }}>
                {data?.hero.state==='no_date' && (
                  <>
                    <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:36, fontWeight:300, fontStyle:'italic', color:'#111', margin:'0 0 10px', lineHeight:1.2 }}>Your wedding story starts here.</p>
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#888580', margin:'0 0 20px' }}>Add your wedding date to unlock your personalised countdown.</p>
                    <a href="/couple/me" style={{ fontFamily:"'Jost',sans-serif", fontSize:10, fontWeight:400, letterSpacing:'0.15em', textTransform:'uppercase', color:'#C9A84C', textDecoration:'none', border:'0.5px solid #C9A84C', borderRadius:100, padding:'8px 18px' }}>Set your date →</a>
                  </>
                )}
                {data?.hero.state==='past' && (
                  <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:300, fontStyle:'italic', color:'#111', margin:0, lineHeight:1.3 }}>
                    Your wedding was {Math.abs(data.hero.days_until||0)} days ago. We hope it was everything you dreamed.
                  </p>
                )}
                {(data?.hero.state==='date_only'||data?.hero.state==='event') && data?.hero.days_until!==null && (
                  <>
                    <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:38, fontWeight:300, color:'#111', margin:'0 0 8px', lineHeight:1.15 }}>
                      {numberToWords(data.hero.days_until)} days to your {data.hero.event_name||'wedding'}.
                    </p>
                    {data.hero.wedding_date && (
                      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#888580', margin:0 }}>
                        {formatDate(data.hero.state==='event'&&data.next_event?.event_date ? data.next_event.event_date : data.hero.wedding_date)}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Three Moments */}
              {moments.length>0 && (
                <div style={{ marginBottom:28 }}>
                  <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.25em', textTransform:'uppercase', color:'#C8C4BE', margin:'0 0 12px' }}>Needs Your Attention</p>
                  {moments.map((m,i)=><MomentCard key={i} moment={m} onAction={handleMomentAction}/>)}
                </div>
              )}

              {/* From Your Muse */}
              {data?.muse_saves&&data.muse_saves.length>0 && (
                <div style={{ marginBottom:28 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.25em', textTransform:'uppercase', color:'#C8C4BE', margin:0 }}>From Your Muse</p>
                    <button onClick={()=>openDreamAi(`I saved ${data.muse_saves[0]?.vendor?.name||'a vendor'} to my Muse. Should I enquire?`)} style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'0.5px solid #E2DED8', borderRadius:100, padding:'3px 10px', cursor:'pointer', touchAction:'manipulation' }}>
                      <span style={{ fontSize:9 }}>✦</span>
                      <span style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', color:'#888580' }}>Ask DreamAi</span>
                    </button>
                  </div>
                  <div style={{ display:'flex', gap:10, overflowX:'auto', scrollbarWidth:'none', paddingBottom:4 }}>
                    {data.muse_saves.map(save=>{
                      const img=save.vendor?.featured_photos?.[0]||save.vendor?.portfolio_images?.[0];
                      return (
                        <a key={save.id} href={save.vendor_id?`/couple/vendor/${save.vendor_id}`:'/couple/muse'} style={{ flexShrink:0, width:120, textDecoration:'none' }}>
                          <div style={{ width:120, height:150, borderRadius:12, overflow:'hidden', background:'#E2DED8', marginBottom:6, backgroundImage:img?`url(${img})`:'none', backgroundSize:'cover', backgroundPosition:'center' }}/>
                          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:14, fontWeight:300, color:'#111', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{save.vendor?.name||'—'}</p>
                          <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.1em', textTransform:'uppercase', color:'#888580', margin:0 }}>{save.vendor?.category||''}</p>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* This Week */}
              {data?.this_week_events&&data.this_week_events.length>0 && (
                <div style={{ marginBottom:28 }}>
                  <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.25em', textTransform:'uppercase', color:'#C8C4BE', margin:'0 0 12px' }}>This Week</p>
                  {data.this_week_events.map(ev=>(
                    <div key={ev.id} style={{ background:'#FFFFFF', border:'0.5px solid #E2DED8', borderRadius:12, padding:16, marginBottom:8, display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ textAlign:'center', flexShrink:0 }}>
                        <p style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', margin:'0 0 2px' }}>{new Date(ev.event_date).toLocaleDateString('en-IN',{month:'short'}).toUpperCase()}</p>
                        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:24, fontWeight:300, color:'#111', margin:0, lineHeight:1 }}>{new Date(ev.event_date).getDate()}</p>
                      </div>
                      <div>
                        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:300, color:'#111', margin:'0 0 2px' }}>{ev.event_name}</p>
                        {ev.venue&&<p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580', margin:0 }}>{ev.venue}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upcoming Payments */}
              {data?.upcoming_payments&&data.upcoming_payments.length>0 && (
                <div style={{ marginBottom:28 }}>
                  <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.25em', textTransform:'uppercase', color:'#C8C4BE', margin:'0 0 12px' }}>Upcoming Payments</p>
                  {data.upcoming_payments.map((p,i)=>(
                    <div key={p.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:i<data.upcoming_payments.length-1?'0.5px solid #E2DED8':'none' }}>
                      <div>
                        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:300, color:'#111', margin:'0 0 2px' }}>{p.vendor_name||'—'}</p>
                        {p.description&&<p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580', margin:0 }}>{p.description}</p>}
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:400, color:'#C9A84C', margin:'0 0 2px' }}>{fmtINR(p.actual_amount||0)}</p>
                        {p.due_date&&<p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:300, color:'#888580', margin:0 }}>Due {formatShortDate(p.due_date)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quiet Activity */}
              {data?.quiet_activity&&data.quiet_activity.length>0 && (
                <div style={{ marginBottom:28 }}>
                  <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.25em', textTransform:'uppercase', color:'#C8C4BE', margin:'0 0 12px' }}>Recent Activity</p>
                  {data.quiet_activity.map((a,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:i<data.quiet_activity.length-1?'0.5px solid #E2DED8':'none' }}>
                      <span style={{ fontSize:14, flexShrink:0 }}>✦</span>
                      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#3C3835', margin:0, flex:1, lineHeight:1.4 }}>{a.text}</p>
                      <span style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, color:'#C8C4BE', flexShrink:0 }}>{timeAgo(a.at)}</span>
                    </div>
                  ))}
                </div>
              )}

              {moments.length===0&&(!data?.muse_saves||data.muse_saves.length===0)&&(!data?.this_week_events||data.this_week_events.length===0) && (
                <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:18, fontWeight:300, fontStyle:'italic', color:'#888580', textAlign:'center', marginTop:16 }}>You're all caught up.</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom nav */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'#F8F7F5', borderTop:'1px solid #E2DED8', display:'flex', alignItems:'center', justifyContent:'space-around', paddingBottom:'env(safe-area-inset-bottom)', zIndex:100 }}>
        {[{key:'today',label:'Today',href:'/couple/today'},{key:'plan',label:'Plan',href:'/couple/plan'},{key:'bespoke',label:'Bespoke',href:'/couple/bespoke'},{key:'me',label:'Me',href:'/couple/me'}].map(item=>(
          <a key={item.key} href={item.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 20px', gap:4, textDecoration:'none' }}>
            <span style={{ fontFamily:"'Jost',sans-serif", fontSize:10, fontWeight:item.key==='today'?400:300, letterSpacing:'0.15em', textTransform:'uppercase', color:item.key==='today'?'#111':'#888580' }}>{item.label}</span>
            {item.key==='today'&&<span style={{ width:4, height:4, borderRadius:'50%', background:'#C9A84C', display:'block' }}/>}
          </a>
        ))}
      </nav>
    </>
  );
}
