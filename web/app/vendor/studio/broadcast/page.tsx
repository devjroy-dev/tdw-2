'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const BASE = 'https://dream-wedding-production-89ae.up.railway.app';
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');`;
const MAX_CHARS = 500;

function Toast({ msg, onDone }: { msg: string; onDone: ()=>void }) {
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[onDone]);
  return <div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',background:'#111',color:'#F8F7F5',fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,padding:'10px 16px',borderRadius:8,zIndex:300,whiteSpace:'nowrap'}}>{msg}</div>;
}

function getVendorSession() {
  if (typeof window==='undefined') return null;
  try { const r=localStorage.getItem('vendor_session')||localStorage.getItem('vendor_web_session'); return r?JSON.parse(r):null; } catch { return null; }
}

const SEGMENTS = [
  { key:'all', label:'All Clients', desc:'Everyone in your client list' },
  { key:'upcoming', label:'Upcoming Weddings', desc:'Events in the next 90 days' },
  { key:'post_wedding', label:'Post-Wedding', desc:'Past clients — ask for reviews' },
];

export default function BroadcastPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [segment, setSegment] = useState('all');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{sent:number;total:number;failed_count:number}|null>(null);

  useEffect(()=>{
    const s=getVendorSession();
    if(!s?.vendorId&&!s?.id){router.replace('/vendor/login');return;}
    const vid=s.vendorId||s.id;
    setVendorId(vid);
    fetch(`${BASE}/api/broadcasts/${vid}`).then(r=>r.json()).then(d=>{setBroadcasts(d.data||d||[]);setLoading(false);}).catch(()=>setLoading(false));
  },[router]);

  async function send() {
    if (!message.trim()||sending||!vendorId) return;
    setSending(true); setResult(null);
    try {
      const r=await fetch(`${BASE}/api/v2/vendor/broadcast-whatsapp`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vendor_id:vendorId,message:message.trim(),segment})});
      const d=await r.json();
      if (d.success) {
        setResult({sent:d.sent||0,total:d.total||0,failed_count:d.failed_count||0});
        setMessage('');
        setBroadcasts(p=>[{id:Date.now(),message:message.trim(),template:segment,sent_count:d.sent,recipient_count:d.total,created_at:new Date().toISOString()},...p]);
        setToast(`Sent to ${d.sent} of ${d.total} clients`);
      } else setToast(d.error||'Could not send');
    } catch { setToast('Network error'); } finally { setSending(false); }
  }

  function formatDate(d: string) { return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }

  return (
    <>
      <style>{`${FONTS} *{box-sizing:border-box;} body{margin:0;background:#F8F7F5;} ::-webkit-scrollbar{display:none;}`}</style>
      {toast&&<Toast msg={toast} onDone={()=>setToast('')}/>}

      <div style={{padding:'24px 20px 100px'}}>
        <div style={{marginBottom:24}}>
          <p style={{fontFamily:"'Jost',sans-serif",fontWeight:200,fontSize:9,color:'#888580',letterSpacing:'0.25em',textTransform:'uppercase',margin:'0 0 4px'}}>Studio</p>
          <p style={{fontFamily:"'Cormorant Garamond',serif",fontWeight:300,fontSize:28,color:'#111',margin:0}}>Broadcast</p>
        </div>

        {/* Segment picker */}
        <p style={{fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:200,letterSpacing:'0.22em',textTransform:'uppercase',color:'#888580',margin:'0 0 10px'}}>Send To</p>
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:20}}>
          {SEGMENTS.map(s=>(
            <button key={s.key} onClick={()=>setSegment(s.key)} style={{background:segment===s.key?'#111':'#FFFFFF',border:`1px solid ${segment===s.key?'#111':'#E2DED8'}`,borderRadius:12,padding:'12px 16px',cursor:'pointer',touchAction:'manipulation',textAlign:'left',transition:'all 200ms'}}>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:segment===s.key?'#F8F7F5':'#111',margin:'0 0 2px'}}>{s.label}</p>
              <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:segment===s.key?'rgba(248,247,245,0.6)':'#888580',margin:0}}>{s.desc}</p>
            </button>
          ))}
        </div>

        {/* Message composer */}
        <p style={{fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:200,letterSpacing:'0.22em',textTransform:'uppercase',color:'#888580',margin:'0 0 8px'}}>Message</p>
        <div style={{background:'#FFFFFF',border:'1px solid #E2DED8',borderRadius:14,padding:14,marginBottom:8}}>
          <textarea value={message} onChange={e=>setMessage(e.target.value.slice(0,MAX_CHARS))} rows={5} placeholder="Type your message here..." style={{width:'100%',background:'transparent',border:'none',outline:'none',fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:'#111',resize:'none',lineHeight:1.6}}/>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <span style={{fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,color:message.length>MAX_CHARS*0.9?'#C9A84C':'#C8C4BE'}}>{message.length}/{MAX_CHARS}</span>
          </div>
        </div>
        <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:300,color:'#888580',margin:'0 0 16px'}}>
          "Reply STOP to unsubscribe" is automatically appended to every message.
        </p>

        {/* Send button */}
        <button onClick={send} disabled={!message.trim()||sending} style={{width:'100%',height:52,background:'#111',color:'#F8F7F5',border:'none',borderRadius:100,fontFamily:"'Jost',sans-serif",fontSize:11,fontWeight:300,letterSpacing:'0.2em',textTransform:'uppercase',cursor:'pointer',opacity:(!message.trim()||sending)?0.5:1,marginBottom:20}}>
          {sending?'Sending via WhatsApp…':'Send via WhatsApp'}
        </button>

        {/* Result */}
        {result&&(
          <div style={{background:'#F4F1EC',border:'1px solid #E2DED8',borderRadius:12,padding:'14px 16px',marginBottom:20,textAlign:'center'}}>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:300,color:'#111',margin:'0 0 4px'}}>{result.sent} of {result.total} sent</p>
            {result.failed_count>0&&<p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:'#888580',margin:0}}>{result.failed_count} failed (no phone number)</p>}
          </div>
        )}

        {/* History */}
        {!loading&&broadcasts.length>0&&(
          <>
            <p style={{fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:200,letterSpacing:'0.22em',textTransform:'uppercase',color:'#888580',margin:'0 0 10px'}}>History</p>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {broadcasts.slice(0,10).map((b: any)=>(
                <div key={b.id} style={{background:'#FFFFFF',border:'1px solid #E2DED8',borderRadius:12,padding:'12px 14px'}}>
                  <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#111',margin:'0 0 6px',lineHeight:1.4,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{b.message}</p>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,color:'#888580',letterSpacing:'0.08em'}}>{b.created_at?formatDate(b.created_at):''}</span>
                    <span style={{fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,color:'#888580'}}>{b.sent_count||0}/{b.recipient_count||0} sent</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <nav style={{position:'fixed',bottom:0,left:0,right:0,background:'#F8F7F5',borderTop:'1px solid #E2DED8',display:'flex',alignItems:'center',justifyContent:'space-around',paddingBottom:'env(safe-area-inset-bottom)',zIndex:100}}>
        {[{key:'today',label:'Today',href:'/vendor/today'},{key:'clients',label:'Clients',href:'/vendor/clients'},{key:'money',label:'Money',href:'/vendor/money'},{key:'studio',label:'Studio',href:'/vendor/studio'}].map(item=>(
          <a key={item.key} href={item.href} style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'12px 16px',gap:4,textDecoration:'none'}}>
            <span style={{fontFamily:"'Jost',sans-serif",fontSize:10,fontWeight:item.key==='studio'?400:300,letterSpacing:'0.15em',textTransform:'uppercase',color:item.key==='studio'?'#111':'#888580'}}>{item.label}</span>
            {item.key==='studio'&&<span style={{width:4,height:4,borderRadius:'50%',background:'#C9A84C',display:'block'}}/>}
          </a>
        ))}
      </nav>
    </>
  );
}
