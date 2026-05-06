'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

function getSession() {
  if (typeof window==='undefined') return null;
  try { const r=localStorage.getItem('couple_session')||localStorage.getItem('couple_web_session'); return r?JSON.parse(r):null; } catch { return null; }
}
function fmtINR(n: number) { return '₹'+n.toLocaleString('en-IN'); }

const FILTER_CATS = ['All','Lehenga','Saree','Gown','Jewellery','Accessories'];

interface Product { id: string; title: string; category: string; price_from?: number; images?: string[]; is_featured?: boolean; }
interface Designer { id: string; name: string; category?: string; city?: string; about?: string; tagline?: string; starting_price?: number; featured_photos?: string[]; portfolio_images?: string[]; rating?: number; appointment_fee: number; products: Product[]; vibe_tags?: string[]; }

function Shimmer({ h, br=12 }: { h: number; br?: number }) {
  return <div style={{ height:h, borderRadius:br, background:'linear-gradient(90deg,#1A1614 25%,#2A2220 50%,#1A1614 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite', marginBottom:12 }}/>;
}

function Toast({ msg, onDone }: { msg: string; onDone:()=>void }) {
  useEffect(()=>{const t=setTimeout(onDone,3000);return()=>clearTimeout(t);},[onDone]);
  return <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', background:'#FFFFFF', color:'#111', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, padding:'10px 20px', borderRadius:100, zIndex:9999, whiteSpace:'nowrap' }}>{msg}</div>;
}

function AppointmentSheet({ designer, userId, onClose, onBooked }: { designer: Designer; userId: string; onClose:()=>void; onBooked:()=>void; }) {
  const [visible, setVisible] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState(false);
  const [step, setStep] = useState<'form'|'confirm'|'done'>('form');

  useEffect(()=>{ setTimeout(()=>setVisible(true),10); },[]);
  function close() { setVisible(false); setTimeout(onClose,320); }

  async function book() {
    if (booking) return;
    setBooking(true);
    try {
      const r=await fetch(`${API}/api/v2/couture/appointments`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({vendor_id:designer.id,couple_id:userId,appointment_date:date||null,appointment_time:time||null,notes:notes||null})});
      const d=await r.json();
      if (d.success) setStep('done');
    } catch {} finally { setBooking(false); }
  }

  const fee = designer.appointment_fee || 3500;
  const lbl: React.CSSProperties = { fontFamily:"'Jost',sans-serif", fontSize:8, fontWeight:200, letterSpacing:'0.2em', textTransform:'uppercase', color:'#888580', display:'block', marginBottom:4 };
  const fld: React.CSSProperties = { width:'100%', border:'none', borderBottom:'1px solid #E2DED8', background:'transparent', fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#111', padding:'6px 0', marginBottom:14, outline:'none' };

  return (
    <>
      <div onClick={close} style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,0.6)', opacity:visible?1:0, transition:'opacity 280ms' }}/>
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:501, background:'#FFFFFF', borderRadius:'20px 20px 0 0', padding:'20px 24px 0', transform:visible?'translateY(0)':'translateY(100%)', transition:'transform 320ms cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ width:36, height:4, borderRadius:2, background:'#E2DED8', margin:'0 auto 20px' }}/>

        {step==='done' ? (
          <div style={{ textAlign:'center', paddingBottom:'calc(40px + env(safe-area-inset-bottom))' }}>
            <p style={{ fontSize:32, margin:'0 0 12px' }}>✦</p>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:26, fontWeight:300, color:'#111', margin:'0 0 8px' }}>Appointment Requested</p>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#888580', margin:'0 0 28px' }}>{designer.name} will confirm within 48 hours.</p>
            <button onClick={()=>{onBooked();close();}} style={{ width:'100%', height:52, background:'#111', color:'#F8F7F5', border:'none', borderRadius:100, fontFamily:"'Jost',sans-serif", fontSize:11, fontWeight:300, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', marginBottom:'calc(0px + env(safe-area-inset-bottom))' }}>Done</button>
          </div>
        ) : step==='confirm' ? (
          <div style={{ paddingBottom:'calc(24px + env(safe-area-inset-bottom))' }}>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300, color:'#111', margin:'0 0 6px' }}>Confirm Appointment</p>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#888580', margin:'0 0 20px' }}>with {designer.name}</p>
            <div style={{ background:'#F8F7F5', borderRadius:12, padding:'14px 16px', marginBottom:16 }}>
              {[{label:'Appointment fee',val:fmtINR(fee)},{label:'Non-refundable platform fee',val:fmtINR(500)},{label:'Held until confirmed',val:fmtINR(fee-500)}].map((r,i)=>(
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:i<2?'0.5px solid #E2DED8':'none' }}>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#888580', margin:0 }}>{r.label}</p>
                  <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:400, color:'#111', margin:0 }}>{r.val}</p>
                </div>
              ))}
            </div>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:300, color:'#888580', margin:'0 0 20px', lineHeight:1.5 }}>
              ₹500 is non-refundable. Remaining {fmtINR(fee-500)} is held and released after your appointment.
            </p>
            <button onClick={book} disabled={booking} style={{ width:'100%', height:52, background:'#C9A84C', color:'#111', border:'none', borderRadius:100, fontFamily:"'Jost',sans-serif", fontSize:11, fontWeight:400, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', marginBottom:10, opacity:booking?0.6:1 }}>
              {booking?'Booking...':'Confirm · '+fmtINR(fee)}
            </button>
            <button onClick={()=>setStep('form')} style={{ width:'100%', height:44, background:'transparent', border:'1px solid #E2DED8', borderRadius:100, fontFamily:"'Jost',sans-serif", fontSize:10, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', cursor:'pointer' }}>Back</button>
          </div>
        ) : (
          <div style={{ paddingBottom:'calc(24px + env(safe-area-inset-bottom))' }}>
            <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300, color:'#111', margin:'0 0 6px' }}>Book Appointment</p>
            <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#888580', margin:'0 0 20px' }}>with {designer.name} · {fmtINR(fee)}</p>
            <label style={lbl}>Preferred Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={fld}/>
            <label style={lbl}>Preferred Time</label>
            <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={fld}/>
            <label style={lbl}>Notes (optional)</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Measurements, inspirations, questions..." style={{ ...fld, height:'auto', resize:'none', lineHeight:1.5, marginBottom:20 }}/>
            <button onClick={()=>setStep('confirm')} style={{ width:'100%', height:52, background:'#111', color:'#F8F7F5', border:'none', borderRadius:100, fontFamily:"'Jost',sans-serif", fontSize:11, fontWeight:300, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', marginBottom:10 }}>
              Review Appointment
            </button>
            <button onClick={close} style={{ width:'100%', height:44, background:'transparent', border:'1px solid #E2DED8', borderRadius:100, fontFamily:"'Jost',sans-serif", fontSize:10, fontWeight:300, letterSpacing:'0.15em', textTransform:'uppercase', color:'#888580', cursor:'pointer' }}>Cancel</button>
          </div>
        )}
      </div>
    </>
  );
}

// Designer card — editorial full-bleed
function DesignerCard({ designer, onBook }: { designer: Designer; onBook: ()=>void; }) {
  const heroImg = designer.featured_photos?.[0] || designer.portfolio_images?.[0];
  const [imgIdx, setImgIdx] = useState(0);
  const allImgs = [...(designer.featured_photos||[]), ...(designer.portfolio_images||[])].slice(0,5);

  return (
    <div style={{ marginBottom:32 }}>
      {/* Hero image — full bleed */}
      <div style={{ position:'relative', width:'100%', aspectRatio:'3/4', borderRadius:16, overflow:'hidden', marginBottom:14, background:'#1A1614' }}>
        {allImgs.length>0 && (
          <div style={{ position:'absolute', inset:0, backgroundImage:`url(${allImgs[imgIdx]})`, backgroundSize:'cover', backgroundPosition:'center', transition:'opacity 400ms' }}/>
        )}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }}/>

        {/* Image tap zones */}
        {allImgs.length>1 && (
          <>
            <button onClick={()=>setImgIdx(i=>Math.max(0,i-1))} style={{ position:'absolute', left:0, top:0, bottom:0, width:'40%', background:'none', border:'none', cursor:'pointer' }}/>
            <button onClick={()=>setImgIdx(i=>Math.min(allImgs.length-1,i+1))} style={{ position:'absolute', right:0, top:0, bottom:0, width:'40%', background:'none', border:'none', cursor:'pointer' }}/>
          </>
        )}

        {/* Dot indicators */}
        {allImgs.length>1 && (
          <div style={{ position:'absolute', bottom:56, left:0, right:0, display:'flex', justifyContent:'center', gap:4 }}>
            {allImgs.map((_,i)=>(
              <div key={i} style={{ width:i===imgIdx?16:4, height:4, borderRadius:2, background:i===imgIdx?'#FFFFFF':'rgba(255,255,255,0.4)', transition:'all 300ms' }}/>
            ))}
          </div>
        )}

        {/* Name overlay */}
        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'0 16px 16px' }}>
          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:28, fontWeight:300, color:'#FFFFFF', margin:'0 0 2px', lineHeight:1.1 }}>{designer.name}</p>
          {designer.city && <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.2em', textTransform:'uppercase', color:'rgba(255,255,255,0.6)', margin:0 }}>{designer.city}</p>}
        </div>
      </div>

      {/* Tagline */}
      {designer.tagline && (
        <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:16, fontWeight:300, fontStyle:'italic', color:'#555250', margin:'0 0 10px', lineHeight:1.4, padding:'0 4px' }}>{designer.tagline}</p>
      )}

      {/* Products horizontal scroll */}
      {designer.products.length>0 && (
        <div style={{ display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none', paddingBottom:4, marginBottom:14 }}>
          {designer.products.map(p=>{
            const img=p.images?.[0];
            return (
              <div key={p.id} style={{ flexShrink:0, width:100 }}>
                <div style={{ width:100, height:130, borderRadius:10, background:'#E2DED8', backgroundImage:img?`url(${img})`:'none', backgroundSize:'cover', backgroundPosition:'center', marginBottom:6 }}/>
                <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:11, fontWeight:300, color:'#111', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.title}</p>
                {p.price_from&&<p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, color:'#888580', margin:0 }}>from {fmtINR(p.price_from)}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Book CTA */}
      <button onClick={onBook} style={{ width:'100%', height:48, background:'#111', color:'#F8F7F5', border:'none', borderRadius:100, fontFamily:"'Jost',sans-serif", fontSize:10, fontWeight:300, letterSpacing:'0.2em', textTransform:'uppercase', cursor:'pointer', touchAction:'manipulation' }}>
        Book Appointment · {fmtINR(designer.appointment_fee || 3500)}
      </button>
    </div>
  );
}

export default function CouturePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [toast, setToast] = useState('');
  const [bookingDesigner, setBookingDesigner] = useState<Designer|null>(null);

  useEffect(()=>{
    try { const s=getSession(); if(!s?.id){router.replace('/couple/login');return;} setSession(s); } catch { router.replace('/couple/login'); }
  },[router]);

  useEffect(()=>{
    fetch(`${API}/api/v2/couture/designers`).then(r=>r.json()).then(d=>{ if(d.success) setDesigners(d.data||[]); setLoading(false); }).catch(()=>setLoading(false));
  },[]);

  const filtered = filter==='All' ? designers : designers.filter(d=>
    d.products.some(p=>p.category?.toLowerCase()===filter.toLowerCase())
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        *{box-sizing:border-box;} html,body{margin:0;padding:0;background:#0C0A09;} ::-webkit-scrollbar{display:none;}
        @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade-in{animation:fadeIn 400ms cubic-bezier(0.22,1,0.36,1) both;}
      `}</style>

      {toast&&<Toast msg={toast} onDone={()=>setToast('')}/>}

      {bookingDesigner&&session&&(
        <AppointmentSheet designer={bookingDesigner} userId={session.id} onClose={()=>setBookingDesigner(null)} onBooked={()=>setToast('Appointment requested!')}/>
      )}

      <div style={{ minHeight:'100dvh', background:'#0C0A09', paddingBottom:40 }}>

        {/* Header — full bleed editorial */}
        <div style={{ position:'relative', padding:'60px 24px 40px', borderBottom:'0.5px solid rgba(255,255,255,0.1)' }}>
          <button onClick={()=>router.back()} style={{ position:'absolute', top:16, left:16, width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.1)', backdropFilter:'blur(8px)', border:'0.5px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#FFFFFF', fontSize:18 }}>‹</button>

          <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:200, letterSpacing:'0.35em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', margin:'0 0 8px' }}>The Dream Wedding</p>
          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:40, fontWeight:300, color:'#FFFFFF', margin:'0 0 8px', lineHeight:1.1 }}>Couture</p>
          <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.5)', margin:'0 0 4px' }}>Handpicked by Swati Roy.</p>
          <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:12, fontWeight:300, color:'rgba(255,255,255,0.35)', margin:0 }}>The finest Indian bridal designers. Appointment only.</p>
        </div>

        {/* Filter chips */}
        <div style={{ display:'flex', gap:8, padding:'16px 20px', overflowX:'auto', scrollbarWidth:'none' }}>
          {FILTER_CATS.map(cat=>(
            <button key={cat} onClick={()=>setFilter(cat)} style={{ flexShrink:0, fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.12em', textTransform:'uppercase', padding:'6px 14px', borderRadius:100, cursor:'pointer', border:'none', background:filter===cat?'#C9A84C':'rgba(255,255,255,0.1)', color:filter===cat?'#111':'rgba(255,255,255,0.6)', transition:'all 200ms' }}>
              {cat}
            </button>
          ))}
        </div>

        {/* Designers */}
        <div className="fade-in" style={{ padding:'8px 20px 40px' }}>
          {loading ? (
            <><Shimmer h={400}/><Shimmer h={400}/></>
          ) : filtered.length===0 ? (
            <div style={{ textAlign:'center', paddingTop:80 }}>
              <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:22, fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.3)', margin:0 }}>
                {designers.length===0 ? 'Couture launches soon.' : 'No designers in this category yet.'}
              </p>
            </div>
          ) : (
            filtered.map(d=>(
              <DesignerCard key={d.id} designer={d} onBook={()=>setBookingDesigner(d)}/>
            ))
          )}
        </div>
      </div>
    </>
  );
}
