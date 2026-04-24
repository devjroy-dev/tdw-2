'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const BASE = 'https://dream-wedding-production-89ae.up.railway.app';
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');`;

function Toast({ msg, onDone }: { msg: string; onDone: ()=>void }) {
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[onDone]);
  return <div style={{position:'fixed',top:16,left:'50%',transform:'translateX(-50%)',background:'#111',color:'#F8F7F5',fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,padding:'10px 16px',borderRadius:8,zIndex:300,whiteSpace:'nowrap'}}>{msg}</div>;
}

function getVendorSession() {
  if (typeof window==='undefined') return null;
  try { const r=localStorage.getItem('vendor_session')||localStorage.getItem('vendor_web_session'); return r?JSON.parse(r):null; } catch { return null; }
}

const TEMPLATES = [
  { key:'photography', label:'Photography & Videography' },
  { key:'mua', label:'Makeup Artist Services' },
  { key:'event_management', label:'Event Management' },
  { key:'general', label:'General Services' },
];

export default function ContractsPage() {
  const router = useRouter();
  const [vendorId, setVendorId] = useState('');
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ template_type:'photography', client_name:'', event_date:'', amount:'', custom_terms:'' });
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<any>(null);

  useEffect(()=>{
    const s=getVendorSession();
    if(!s?.vendorId&&!s?.id){router.replace('/vendor/login');return;}
    const vid=s.vendorId||s.id;
    setVendorId(vid);
    fetch(`${BASE}/api/contracts/${vid}`).then(r=>r.json()).then(d=>{setContracts(d.data||d||[]);setLoading(false);}).catch(()=>setLoading(false));
  },[router]);

  async function generate() {
    if (!form.client_name.trim()||generating) return;
    setGenerating(true);
    try {
      const r=await fetch(`${BASE}/api/v2/vendor/contracts/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vendor_id:vendorId,...form,amount:form.amount?Number(form.amount):null})});
      const d=await r.json();
      if (d.success) { setGenerated(d.data); setContracts(p=>[d.data,...p]); setToast('Contract generated'); }
      else setToast(d.error||'Error generating');
    } catch { setToast('Network error'); } finally { setGenerating(false); }
  }

  function downloadContract(c: any) {
    const blob=new Blob([c.contract_text||''],{type:'text/plain'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download=`contract-${c.client_name?.replace(/\s+/g,'-')||'draft'}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  const lbl: React.CSSProperties = {fontFamily:"'Jost',sans-serif",fontSize:8,fontWeight:200,letterSpacing:'0.2em',textTransform:'uppercase',color:'#888580',display:'block',marginBottom:4};
  const fld: React.CSSProperties = {width:'100%',background:'transparent',border:'none',borderBottom:'1px solid #E2DED8',outline:'none',fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:13,color:'#111',padding:'6px 0',marginBottom:14};

  return (
    <>
      <style>{`${FONTS} *{box-sizing:border-box;} body{margin:0;background:#F8F7F5;} ::-webkit-scrollbar{display:none;}`}</style>
      {toast&&<Toast msg={toast} onDone={()=>setToast('')}/>}

      {/* Generated contract preview */}
      {generated&&(
        <>
          <div onClick={()=>setGenerated(null)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:400}}/>
          <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:401,background:'#FFFFFF',borderRadius:'16px 16px 0 0',maxHeight:'80vh',display:'flex',flexDirection:'column'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #E2DED8',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:300,color:'#111',margin:0}}>Contract Generated</p>
              <button onClick={()=>setGenerated(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#888580',fontSize:18}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'16px 20px'}}>
              <pre style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:'#3C3835',lineHeight:1.7,whiteSpace:'pre-wrap',margin:0}}>{generated.contract_text}</pre>
            </div>
            <div style={{padding:'12px 20px',paddingBottom:'calc(12px + env(safe-area-inset-bottom))',borderTop:'1px solid #E2DED8',display:'flex',gap:10}}>
              <button onClick={()=>downloadContract(generated)} style={{flex:1,height:48,background:'#111',color:'#F8F7F5',border:'none',borderRadius:100,fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.2em',textTransform:'uppercase',cursor:'pointer'}}>Download .txt</button>
              <button onClick={()=>setGenerated(null)} style={{height:48,padding:'0 20px',background:'transparent',border:'1px solid #E2DED8',borderRadius:100,fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.15em',textTransform:'uppercase',color:'#888580',cursor:'pointer'}}>Close</button>
            </div>
          </div>
        </>
      )}

      {/* Generate form sheet */}
      {showForm&&(
        <>
          <div onClick={()=>setShowForm(false)} style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:400}}/>
          <div style={{position:'fixed',bottom:0,left:0,right:0,zIndex:401,background:'#FFFFFF',borderRadius:'16px 16px 0 0',padding:'20px 20px 0',maxHeight:'85vh',overflowY:'auto'}}>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:300,color:'#111',margin:'0 0 20px'}}>New Contract</p>
            <label style={lbl}>Template</label>
            <select value={form.template_type} onChange={e=>setForm(f=>({...f,template_type:e.target.value}))} style={{...fld,appearance:'none'}}>
              {TEMPLATES.map(t=><option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <label style={lbl}>Client Name *</label>
            <input value={form.client_name} onChange={e=>setForm(f=>({...f,client_name:e.target.value}))} style={fld} placeholder="Client name"/>
            <label style={lbl}>Event Date</label>
            <input type="date" value={form.event_date} onChange={e=>setForm(f=>({...f,event_date:e.target.value}))} style={fld}/>
            <label style={lbl}>Total Amount (₹)</label>
            <input value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} inputMode="numeric" style={fld} placeholder="Optional"/>
            <label style={lbl}>Additional Terms</label>
            <textarea value={form.custom_terms} onChange={e=>setForm(f=>({...f,custom_terms:e.target.value}))} rows={3} placeholder="Any custom clauses..." style={{...fld,height:'auto',resize:'none',lineHeight:1.5}}/>
            <div style={{display:'flex',gap:10,paddingBottom:'calc(20px + env(safe-area-inset-bottom))'}}>
              <button onClick={generate} disabled={!form.client_name.trim()||generating} style={{flex:1,height:48,background:'#111',color:'#F8F7F5',border:'none',borderRadius:100,fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.2em',textTransform:'uppercase',cursor:'pointer',opacity:(!form.client_name.trim()||generating)?0.5:1}}>{generating?'Generating…':'Generate Contract'}</button>
              <button onClick={()=>setShowForm(false)} style={{background:'none',border:'none',fontFamily:"'DM Sans',sans-serif",fontSize:13,color:'#888580',cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </>
      )}

      <div style={{padding:'24px 20px 100px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:24}}>
          <div>
            <p style={{fontFamily:"'Jost',sans-serif",fontWeight:200,fontSize:9,color:'#888580',letterSpacing:'0.25em',textTransform:'uppercase',margin:'0 0 4px'}}>Studio</p>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontWeight:300,fontSize:28,color:'#111',margin:0}}>Contracts</p>
          </div>
          <button onClick={()=>setShowForm(true)} style={{height:36,background:'#111',color:'#F8F7F5',border:'none',borderRadius:100,padding:'0 16px',fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',cursor:'pointer'}}>+ New</button>
        </div>

        {loading ? (
          <div style={{height:60,borderRadius:12,background:'linear-gradient(90deg,#EEECE8 25%,#F8F7F5 50%,#EEECE8 75%)',backgroundSize:'200% 100%',animation:'shimmer 1.4s infinite'}}/>
        ) : contracts.length===0 ? (
          <div style={{textAlign:'center',marginTop:60}}>
            <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:300,fontStyle:'italic',color:'#888580',margin:'0 0 8px'}}>No contracts yet.</p>
            <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:13,fontWeight:300,color:'#888580',margin:0}}>Generate your first contract above.</p>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {contracts.map((c: any)=>(
              <div key={c.id} style={{background:'#FFFFFF',border:'1px solid #E2DED8',borderRadius:14,padding:'14px 16px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div>
                  <p style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:300,color:'#111',margin:'0 0 3px'}}>{c.client_name}</p>
                  <p style={{fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:'#888580',margin:0}}>{c.template_type?.replace(/_/g,' ')||'Agreement'}</p>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontFamily:"'Jost',sans-serif",fontSize:8,fontWeight:300,letterSpacing:'0.1em',textTransform:'uppercase',padding:'2px 8px',borderRadius:100,background:c.status==='signed'?'#E8F5E9':'#F4F1EC',color:c.status==='signed'?'#4A7C59':'#8C8480'}}>{c.status||'draft'}</span>
                  {c.contract_text&&<button onClick={()=>downloadContract(c)} style={{background:'none',border:'0.5px solid #E2DED8',borderRadius:6,padding:'4px 8px',fontFamily:"'Jost',sans-serif",fontSize:8,fontWeight:300,letterSpacing:'0.1em',textTransform:'uppercase',color:'#888580',cursor:'pointer'}}>↓</button>}
                </div>
              </div>
            ))}
          </div>
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
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </>
  );
}
