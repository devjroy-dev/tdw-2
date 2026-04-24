'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

const BASE = 'https://dream-wedding-production-89ae.up.railway.app';
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');`;

function formatDate(d: string) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}); }
function fmtINR(n: number) { return '₹'+n.toLocaleString('en-IN'); }
function timeAgo(d: string) { const diff=Date.now()-new Date(d).getTime(); const h=Math.floor(diff/3600000); const dd=Math.floor(diff/86400000); if(h<1)return'Just now'; if(h<24)return`${h}h ago`; if(dd<7)return`${dd}d ago`; return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'}); }

function Shimmer() { return <div style={{ height:60, borderRadius:12, background:'linear-gradient(90deg,#EEECE8 25%,#F8F7F5 50%,#EEECE8 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', marginBottom:10 }}/>; }
function Toast({ msg, onDone }: { msg: string; onDone:()=>void }) { useEffect(()=>{ const t=setTimeout(onDone,3000); return()=>clearTimeout(t); },[onDone]); return <div style={{ position:'fixed', top:16, left:'50%', transform:'translateX(-50%)', background:'#111', color:'#F8F7F5', fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, padding:'10px 16px', borderRadius:8, zIndex:300, whiteSpace:'nowrap' }}>{msg}</div>; }

function ProgressRing({ pct }: { pct: number }) {
  const r=19; const circ=2*Math.PI*r; const dash=Math.min(pct/100,1)*circ;
  return (
    <svg width={44} height={44} style={{ transform:'rotate(-90deg)', flexShrink:0 }}>
      <circle cx={22} cy={22} r={r} fill="none" stroke="#E2DED8" strokeWidth={3}/>
      <circle cx={22} cy={22} r={r} fill="none" stroke="#C9A84C" strokeWidth={3} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      <text x={22} y={22} fill="#111" fontSize={9} fontFamily="DM Sans" textAnchor="middle" dominantBaseline="middle" transform="rotate(90,22,22)">{pct}%</text>
    </svg>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom:24 }}>
      <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.22em', textTransform:'uppercase', color:'#C8C4BE', margin:'0 0 10px' }}>{label}</p>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:14, padding:'14px 16px', marginBottom:8 }}>{children}</div>;
}

function getVendorSession() {
  if (typeof window==='undefined') return null;
  try { const r=localStorage.getItem('vendor_session')||localStorage.getItem('vendor_web_session'); return r?JSON.parse(r):null; } catch { return null; }
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;
  const [vendorId, setVendorId] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview'|'invoices'|'messages'|'deliveries'>('overview');

  useEffect(()=>{
    const s = getVendorSession();
    if (!s?.vendorId&&!s?.id) { router.replace('/vendor/login'); return; }
    const vid = s.vendorId||s.id;
    setVendorId(vid);
    fetch(`${BASE}/api/v2/vendor/clients/${vid}/${clientId}`)
      .then(r=>r.json()).then(d=>{ if(d.success){setData(d.data);setNotes(d.data.client?.notes||'');} setLoading(false); }).catch(()=>setLoading(false));
  },[clientId,router]);

  async function saveNotes() {
    if (savingNotes) return;
    setSavingNotes(true);
    try {
      await fetch(`${BASE}/api/vendor-clients/${clientId}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({notes})});
      setToast('Notes saved');
    } catch { setToast('Could not save'); } finally { setSavingNotes(false); }
  }

  if (loading) return (
    <>
      <style>{`${FONTS} *{box-sizing:border-box;} body{margin:0;background:#F8F7F5;} @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{ padding:'24px 20px' }}><Shimmer/><Shimmer/><Shimmer/></div>
    </>
  );

  if (!data) return (
    <>
      <style>{`${FONTS} *{box-sizing:border-box;} body{margin:0;background:#F8F7F5;}`}</style>
      <div style={{ padding:'60px 20px', textAlign:'center' }}>
        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:300, fontStyle:'italic', color:'#888580' }}>Client not found.</p>
      </div>
    </>
  );

  const { client, invoices, contract, deliveries, enquiry } = data;
  const totalInvoiced = (invoices||[]).reduce((s:number,i:any)=>s+(i.amount||0),0);
  const totalPaid = (invoices||[]).reduce((s:number,i:any)=>s+(i.paid_amount||0),0);
  const totalDue = totalInvoiced - totalPaid;
  const deliveriesDone = (deliveries||[]).filter((d:any)=>d.status==='delivered').length;

  const contractPct = contract?.status==='signed'?25:0;
  const financialPct = totalInvoiced>0?Math.min(25,(totalPaid/totalInvoiced)*25):0;
  const deliveryPct = (deliveries||[]).length>0?Math.min(25,(deliveriesDone/(deliveries||[]).length)*25):0;
  const daysSinceMsg = enquiry?.last_message_at?Math.floor((Date.now()-new Date(enquiry.last_message_at).getTime())/86400000):999;
  const commsPct = daysSinceMsg<=14?25:0;
  const progress = Math.round(financialPct+contractPct+deliveryPct+commsPct);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase',
    padding:'5px 12px', borderRadius:100, cursor:'pointer', border:'none', touchAction:'manipulation',
    background:active?'#111':'transparent', color:active?'#F8F7F5':'#888580',
    outline:active?'none':'1px solid #E2DED8',
  });

  return (
    <>
      <style>{`${FONTS} *{box-sizing:border-box;} body{margin:0;background:#F8F7F5;} ::-webkit-scrollbar{display:none;} @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {toast&&<Toast msg={toast} onDone={()=>setToast('')}/>}

      <div style={{ minHeight:'100dvh', background:'#F8F7F5', paddingBottom:40 }}>
        {/* Header */}
        <div style={{ background:'#FFFFFF', borderBottom:'1px solid #E2DED8', padding:'16px 20px' }}>
          <button onClick={()=>router.back()} style={{ background:'none', border:'none', cursor:'pointer', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#888580', padding:0, marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
            ‹ Clients
          </button>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <ProgressRing pct={progress}/>
            <div style={{ flex:1 }}>
              <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:300, color:'#111', margin:'0 0 3px' }}>{client.name}</p>
              <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#888580', margin:0 }}>
                {client.event_type||'Wedding'}{client.event_date?` · ${formatDate(client.event_date)}`:''}
              </p>
            </div>
          </div>
          {/* Contact actions */}
          <div style={{ display:'flex', gap:8, marginTop:14 }}>
            {client.phone&&<a href={`tel:${client.phone}`} style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', color:'#111', background:'#F4F1EC', border:'none', borderRadius:100, padding:'7px 14px', textDecoration:'none' }}>Call</a>}
            {client.phone&&<a href={`https://wa.me/${client.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', color:'#F8F7F5', background:'#25D366', border:'none', borderRadius:100, padding:'7px 14px', textDecoration:'none' }}>WhatsApp</a>}
            {enquiry&&<a href={`/vendor/leads/${enquiry.id}`} style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', color:'#111', background:'#F4F1EC', border:'none', borderRadius:100, padding:'7px 14px', textDecoration:'none' }}>Messages</a>}
          </div>
        </div>

        {/* Sub-nav */}
        <div style={{ display:'flex', gap:8, padding:'12px 20px', overflowX:'auto', scrollbarWidth:'none' }}>
          {(['overview','invoices','messages','deliveries'] as const).map(t=>(
            <button key={t} onClick={()=>setActiveTab(t)} style={chipStyle(activeTab===t)}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
          ))}
        </div>

        <div style={{ padding:'8px 20px' }}>

          {/* Overview */}
          {activeTab==='overview'&&(
            <>
              {/* Financial summary */}
              <Section label="Money">
                <div style={{ background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:14, padding:'14px 16px', display:'flex', justifyContent:'space-around' }}>
                  {[{label:'Invoiced',val:totalInvoiced},{label:'Paid',val:totalPaid},{label:'Due',val:totalDue}].map(s=>(
                    <div key={s.label} style={{ textAlign:'center' }}>
                      <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:20, fontWeight:300, color:s.label==='Due'&&s.val>0?'#C9A84C':'#111', margin:'0 0 3px' }}>{fmtINR(s.val)}</p>
                      <p style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', margin:0 }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Contract */}
              <Section label="Contract">
                <Card>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300, color:'#111', margin:0 }}>
                      {contract?`${contract.template_type||'Agreement'} · ${contract.status}` : 'No contract yet'}
                    </p>
                    <span style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', padding:'3px 8px', borderRadius:100, background:contract?.status==='signed'?'#F4F1EC':'#FFF8EC', color:contract?.status==='signed'?'#8C8480':'#C9A84C' }}>
                      {contract?.status||'pending'}
                    </span>
                  </div>
                </Card>
              </Section>

              {/* Deliveries */}
              <Section label="Deliveries">
                <Card>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300, color:'#111', margin:'0 0 4px' }}>
                    {deliveriesDone} of {(deliveries||[]).length} delivered
                  </p>
                  {(deliveries||[]).length===0&&<p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580', margin:0 }}>No deliveries logged yet.</p>}
                </Card>
              </Section>

              {/* Last message */}
              {enquiry&&(
                <Section label="Last Message">
                  <Card>
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#3C3835', margin:'0 0 4px', lineHeight:1.5 }}>{enquiry.last_message_preview||'No messages yet'}</p>
                    <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, color:'#888580', margin:0 }}>{timeAgo(enquiry.last_message_at)}</p>
                  </Card>
                </Section>
              )}

              {/* Private notes */}
              <Section label="Private Notes">
                <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={4} placeholder="Notes visible only to you..." style={{ width:'100%', background:'#FFFFFF', border:'1px solid #E2DED8', borderRadius:14, padding:'14px 16px', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#111', resize:'none', outline:'none', lineHeight:1.6 }} onFocus={e=>{e.currentTarget.style.borderColor='#C9A84C';}} onBlur={e=>{e.currentTarget.style.borderColor='#E2DED8';}}/>
                {notes!==(data.client?.notes||'')&&(
                  <button onClick={saveNotes} disabled={savingNotes} style={{ marginTop:8, fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:400, letterSpacing:'0.15em', textTransform:'uppercase', background:'#111', color:'#F8F7F5', border:'none', borderRadius:100, padding:'8px 18px', cursor:'pointer' }}>
                    {savingNotes?'...':'SAVE NOTES'}
                  </button>
                )}
              </Section>
            </>
          )}

          {/* Invoices */}
          {activeTab==='invoices'&&(
            <Section label="Invoices">
              {(invoices||[]).length===0?(
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300, color:'#888580', textAlign:'center', marginTop:40 }}>No invoices yet.</p>
              ):(invoices||[]).map((inv:any)=>(
                <Card key={inv.id}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:300, color:'#111', margin:'0 0 3px' }}>{inv.invoice_number||`Invoice #${inv.id?.slice(0,6)}`}</p>
                      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'#888580', margin:0 }}>{inv.due_date?`Due ${formatDate(inv.due_date)}`:''}</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:15, fontWeight:400, color:'#111', margin:'0 0 3px' }}>{fmtINR(inv.amount||0)}</p>
                      <span style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.1em', textTransform:'uppercase', padding:'2px 7px', borderRadius:100, background:inv.status==='paid'?'#F4F1EC':'#FFF8EC', color:inv.status==='paid'?'#8C8480':'#C9A84C' }}>{inv.status}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </Section>
          )}

          {/* Messages */}
          {activeTab==='messages'&&(
            <Section label="Messages">
              {enquiry?(
                <Card>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#3C3835', margin:'0 0 10px', lineHeight:1.5 }}>{enquiry.last_message_preview||'Thread active'}</p>
                  <a href={`/vendor/leads/${enquiry.id}`} style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:400, letterSpacing:'0.15em', textTransform:'uppercase', color:'#F8F7F5', background:'#111', borderRadius:100, padding:'7px 14px', textDecoration:'none' }}>Open Thread</a>
                </Card>
              ):(
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300, color:'#888580', textAlign:'center', marginTop:40 }}>No message thread linked.</p>
              )}
            </Section>
          )}

          {/* Deliveries */}
          {activeTab==='deliveries'&&(
            <Section label="Deliveries">
              {(deliveries||[]).length===0?(
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300, color:'#888580', textAlign:'center', marginTop:40 }}>No deliveries logged.</p>
              ):(deliveries||[]).map((d:any)=>(
                <Card key={d.id}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:14, fontWeight:300, color:'#111', margin:0 }}>{d.item_name||d.description||'Delivery item'}</p>
                    <span style={{ fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:300, letterSpacing:'0.1em', textTransform:'uppercase', padding:'2px 7px', borderRadius:100, background:d.status==='delivered'?'#F4F1EC':'#FFF8EC', color:d.status==='delivered'?'#8C8480':'#C9A84C' }}>{d.status}</span>
                  </div>
                </Card>
              ))}
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
