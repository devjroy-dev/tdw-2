'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const BASE = 'https://dream-wedding-production-89ae.up.railway.app';
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');`;

function getInitials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(); }
function formatDate(d: string) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
function fmtINR(n: number) { return '₹'+n.toLocaleString('en-IN'); }

function Shimmer({ h, br=8 }: { h: number; br?: number }) {
  return <div style={{ height:h, borderRadius:br, background:'linear-gradient(90deg,#EEECE8 25%,#F8F7F5 50%,#EEECE8 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', marginBottom:10 }} />;
}

function Toast({ msg, onDone }: { msg: string; onDone: ()=>void }) {
  useEffect(()=>{ const t=setTimeout(onDone,3000); return ()=>clearTimeout(t); },[onDone]);
  return <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', background:'#111111', color:'#F8F7F5', fontFamily:'DM Sans,sans-serif', fontSize:12, fontWeight:300, padding:'10px 16px', borderRadius:8, zIndex:200, whiteSpace:'nowrap' }}>{msg}</div>;
}

function ProgressRing({ pct, size=44 }: { pct: number; size?: number }) {
  const r = (size-5)/2;
  const circ = 2*Math.PI*r;
  const dash = Math.min(pct/100,1)*circ;
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E2DED8" strokeWidth={3}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#C9A84C" strokeWidth={3} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" style={{ transition:'stroke-dasharray 600ms cubic-bezier(0.22,1,0.36,1)' }}/>
    </svg>
  );
}

interface Client { id: string; name: string; phone?: string; event_type?: string; event_date?: string; status?: string; total_invoiced?: number; total_paid?: number; total_due?: number; progress?: number; last_activity?: string; }

function getVendorSession() {
  if (typeof window==='undefined') return null;
  try { const r=localStorage.getItem('vendor_session')||localStorage.getItem('vendor_web_session'); return r?JSON.parse(r):null; } catch { return null; }
}

export default function ClientsPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name:'', phone:'', event_type:'Wedding', event_date:'' });
  const [adding, setAdding] = useState(false);

  useEffect(()=>{
    const s = getVendorSession();
    if (!s?.vendorId&&!s?.id) { router.replace('/vendor/login'); return; }
    const vid = s.vendorId||s.id;
    setVendorId(vid);
    fetch(`${BASE}/api/v2/vendor/clients/${vid}`).then(r=>r.json()).then(d=>{ setClients(d.data||[]); setLoading(false); }).catch(()=>setLoading(false));
  },[router]);

  const filtered = clients.filter(c => !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));

  async function addClient() {
    if (!form.name.trim()||adding) return;
    setAdding(true);
    try {
      const r = await fetch(`${BASE}/api/vendor-clients`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ vendor_id:vendorId, ...form }) });
      const d = await r.json();
      if (d.success||d.id) { setClients(p=>[...(d.data?[d.data]:[d]),...p]); setShowAdd(false); setForm({name:'',phone:'',event_type:'Wedding',event_date:''}); setToast('Client added'); }
      else setToast(d.error||'Error adding client');
    } catch { setToast('Network error'); } finally { setAdding(false); }
  }

  const lbl: React.CSSProperties = { fontFamily:"'Jost',sans-serif", fontWeight:200, fontSize:8, color:'#555250', letterSpacing:'0.2em', textTransform:'uppercase', display:'block', marginBottom:4 };
  const fld: React.CSSProperties = { width:'100%', background:'transparent', border:'none', borderBottom:'1px solid #E2DED8', outline:'none', fontFamily:"'DM Sans',sans-serif", fontWeight:300, fontSize:13, color:'#111111', padding:'6px 0', marginBottom:14 };

  return (
    <>
      <style>{`${FONTS} *{box-sizing:border-box;} body{margin:0;background:#F8F7F5;} ::-webkit-scrollbar{display:none;} @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {toast&&<Toast msg={toast} onDone={()=>setToast('')}/>}

      {showAdd&&(
        <>
          <div onClick={()=>setShowAdd(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:400 }}/>
          <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:401, background:'#FFFFFF', borderRadius:'16px 16px 0 0', padding:28 }}>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:300, fontSize:24, color:'#111', margin:'0 0 20px' }}>Add Client</p>
            <label style={lbl}>Name *</label>
            <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} style={fld} placeholder="Client name"/>
            <label style={lbl}>Phone</label>
            <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} style={fld} inputMode="tel" placeholder="Optional"/>
            <label style={lbl}>Event Type</label>
            <select value={form.event_type} onChange={e=>setForm(f=>({...f,event_type:e.target.value}))} style={{...fld,appearance:'none'}}>
              {['Wedding','Pre-Wedding','Engagement','Reception','Mehendi','Sangeet','Other'].map(t=><option key={t}>{t}</option>)}
            </select>
            <label style={lbl}>Event Date</label>
            <input type="date" value={form.event_date} onChange={e=>setForm(f=>({...f,event_date:e.target.value}))} style={fld}/>
            <div style={{ display:'flex', gap:12, marginTop:4 }}>
              <button onClick={addClient} disabled={!form.name.trim()||adding} style={{ flex:1, height:48, background:'#111', color:'#F8F7F5', border:'none', borderRadius:100, fontFamily:"'Jost',sans-serif", fontSize:10, fontWeight:300, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer' }}>{adding?'Adding…':'Add Client'}</button>
              <button onClick={()=>setShowAdd(false)} style={{ background:'none', border:'none', fontFamily:"'DM Sans',sans-serif", fontWeight:300, fontSize:13, color:'#555250', cursor:'pointer' }}>Cancel</button>
            </div>
          </div>
        </>
      )}

      <div style={{ padding:'24px 20px 100px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 }}>
          <div>
            <p style={{ fontFamily:"'Jost',sans-serif", fontWeight:200, fontSize:9, color:'#555250', letterSpacing:'0.25em', textTransform:'uppercase', margin:'0 0 4px' }}>Business</p>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontWeight:300, fontSize:28, color:'#111', margin:0 }}>Clients</p>
          </div>
          <button onClick={()=>setShowAdd(true)} style={{ height:36, background:'#111', color:'#F8F7F5', border:'none', borderRadius:100, padding:'0 16px', fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.18em', textTransform:'uppercase', cursor:'pointer' }}>+ Add</button>
        </div>

        <input placeholder="Search clients…" value={search} onChange={e=>setSearch(e.target.value)} style={{ width:'100%', background:'transparent', border:'none', borderBottom:'1px solid #E2DED8', outline:'none', fontFamily:"'DM Sans',sans-serif", fontWeight:300, fontSize:13, color:'#111', padding:'8px 0', marginBottom:20 }}/>

        {loading ? (
          <>{[1,2,3].map(i=><Shimmer key={i} h={80} br={12}/>)}</>
        ) : filtered.length===0 ? (
          <div style={{ textAlign:'center', marginTop:60 }}>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:300, fontStyle:'italic', color:'#888580', margin:'0 0 8px' }}>{search?'No clients found.':'No clients yet.'}</p>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#888580', margin:0 }}>Add your first client or convert a lead.</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {filtered.map(c=>(
              <button key={c.id} onClick={()=>router.push(`/vendor/clients/${c.id}`)} style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12, cursor:'pointer', textAlign:'left', width:'100%' }}>
                <ProgressRing pct={c.progress||0} size={44}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:17, fontWeight:300, color:'#111', margin:'0 0 3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.name}</p>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580', margin:0 }}>
                    {c.event_type||'Wedding'}{c.event_date?` · ${formatDate(c.event_date)}`:''}
                  </p>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  {(c.total_invoiced||0)>0&&<p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:400, color:'#111', margin:'0 0 2px' }}>{fmtINR(c.total_invoiced||0)}</p>}
                  {(c.total_due||0)>0&&<p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.1em', textTransform:'uppercase', color:'#C9A84C', margin:0 }}>{fmtINR(c.total_due||0)} due</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <nav style={{ position:'fixed', bottom:0, left:0, right:0, background:'#F8F7F5', borderTop:'1px solid #E2DED8', display:'flex', alignItems:'center', justifyContent:'space-around', paddingBottom:'env(safe-area-inset-bottom)', zIndex:100 }}>
        {[{key:'today',label:'Today',href:'/vendor/today'},{key:'clients',label:'Clients',href:'/vendor/clients'},{key:'money',label:'Money',href:'/vendor/money'},{key:'studio',label:'Studio',href:'/vendor/studio'}].map(item=>(
          <a key={item.key} href={item.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'12px 16px', gap:4, textDecoration:'none' }}>
            <span style={{ fontFamily:"'Jost',sans-serif", fontSize:10, fontWeight:item.key==='clients'?400:300, letterSpacing:'0.15em', textTransform:'uppercase', color:item.key==='clients'?'#111':'#888580' }}>{item.label}</span>
            {item.key==='clients'&&<span style={{ width:4, height:4, borderRadius:'50%', background:'#C9A84C', display:'block' }}/>}
          </a>
        ))}
      </nav>
    </>
  );
}
