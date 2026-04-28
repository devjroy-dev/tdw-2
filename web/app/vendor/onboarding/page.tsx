'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const GOLD = '#C9A84C';

const FALLBACK_SLIDES: string[] = [
  
  
  
  
];

const CATEGORIES = [
  'Photographer',
  'Videographer',
  'MUA',
  'Decorator',
  'Venue',
  'Event Manager',
  'Choreographer',
  'Designer',
  'Jeweller',
  'Other',
];

export default function VendorOnboardingPage() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName]         = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState('');
  const [slide, setSlide]       = useState(1);
  const [slides, setSlides]     = useState<string[]>(FALLBACK_SLIDES);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2800); };

  useEffect(() => {
    // If session already has a name — skip onboarding
    try {
      const s = JSON.parse(localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || '{}');
      if (!s?.id && !s?.vendorId) { router.replace('/'); return; }
      if (s?.name || s?.vendorName) { router.replace('/vendor/pin'); return; }
    } catch { router.replace('/'); return; }
    setTimeout(() => nameRef.current?.focus(), 200);
  }, []);

  // Fetch live cover photos
  useEffect(() => {
    fetch(API + '/api/v2/cover-photos')
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setSlides(d.photos.map((p: any) => p.image_url)); })
      .catch(() => {});
    const t = setInterval(() => setSlide(p => (p + 1) % FALLBACK_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) { showToast('Please enter your name'); nameRef.current?.focus(); return; }
    if (!category) { showToast('Please select your category'); return; }
    setLoading(true);
    try {
      const session = JSON.parse(localStorage.getItem('vendor_web_session') || localStorage.getItem('vendor_session') || '{}');
      const vendorId = session.vendorId || session.id;
      const phone = session.phone;

      // Save name + category to backend
      const r = await fetch(API + '/api/v2/vendor/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, phone, name: name.trim(), category }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || 'Failed');

      // Update session with name + category
      const updated = {
        ...session,
        name: name.trim(),
        vendorName: name.trim(),
        category,
      };
      localStorage.setItem('vendor_web_session', JSON.stringify(updated));
      localStorage.setItem('vendor_session', JSON.stringify(updated));

      router.replace('/vendor/pin');
    } catch { showToast('Could not save. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; background: #0C0A09; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-32px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
      `}</style>

      {toast && (
        <div style={{ position:'fixed',top:24,left:'50%',transform:'translateX(-50%)',background:'rgba(201,168,76,0.12)',backdropFilter:'blur(12px)',border:'0.5px solid rgba(201,168,76,0.3)',color:GOLD,fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:13,padding:'10px 20px',borderRadius:100,zIndex:9999,whiteSpace:'nowrap',animation:'slideDown 280ms cubic-bezier(0.22,1,0.36,1)' }}>{toast}</div>
      )}

      {/* Background carousel */}
      <div style={{ position:'fixed',inset:0,background:'#0C0A09',overflow:'hidden' }}>
        {slides.map((src, i) => (
          <div key={i} style={{ position:'absolute',inset:0,backgroundImage:'url('+src+')',backgroundSize:'cover',backgroundPosition:'center',opacity: i === slide ? 0.55 : 0,transition:'opacity 1200ms ease' }} />
        ))}
        <div style={{ position:'absolute',inset:0,background:'rgba(12,10,9,0.45)' }} />

        {/* Glass panel */}
        <div style={{ position:'absolute',bottom:0,left:0,right:0,animation:'fadeIn 400ms cubic-bezier(0.22,1,0.36,1)' }}>
          <div style={{ background:'rgba(12,10,9,0.3)',backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',borderTop:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'20px 20px 0 0',padding:'28px 28px calc(env(safe-area-inset-bottom, 16px) + 32px)' }}>

            {/* Header */}
            <p style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontWeight:300,fontSize:15,color:'rgba(248,247,245,0.5)',margin:'0 0 2px' }}>The Dream Wedding</p>
            <p style={{ fontFamily:"'Jost',sans-serif",fontWeight:200,fontSize:6,letterSpacing:'0.32em',textTransform:'uppercase',color:GOLD,margin:'0 0 24px' }}>MAKER PORTAL</p>

            <p style={{ fontFamily:"'Cormorant Garamond',serif",fontWeight:300,fontSize:26,color:'#F8F7F5',margin:'0 0 4px',lineHeight:1.15 }}>Welcome to TDW.</p>
            <p style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:13,color:'rgba(248,247,245,0.4)',margin:'0 0 28px',lineHeight:1.5 }}>Tell us a little about yourself to get started.</p>

            {/* Name input */}
            <p style={{ fontFamily:"'Jost',sans-serif",fontWeight:200,fontSize:8,letterSpacing:'0.22em',textTransform:'uppercase',color:'rgba(248,247,245,0.4)',margin:'0 0 8px' }}>YOUR NAME</p>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) e.currentTarget.blur(); }}
              placeholder="Full name"
              autoComplete="name"
              style={{
                width:'100%', border:'none',
                borderBottom:'1px solid rgba(255,255,255,0.25)',
                background:'transparent', outline:'none',
                fontFamily:"'DM Sans',sans-serif", fontWeight:300,
                fontSize:16, color:'#F8F7F5',
                padding:'8px 0', marginBottom:24,
              }}
            />

            {/* Category */}
            <p style={{ fontFamily:"'Jost',sans-serif",fontWeight:200,fontSize:8,letterSpacing:'0.22em',textTransform:'uppercase',color:'rgba(248,247,245,0.4)',margin:'0 0 12px' }}>YOUR CATEGORY</p>
            <div style={{ display:'flex',flexWrap:'wrap',gap:8,marginBottom:32 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  style={{
                    padding:'7px 14px',
                    borderRadius:100,
                    border: category === cat ? `1px solid ${GOLD}` : '0.5px solid rgba(255,255,255,0.2)',
                    background: category === cat ? 'rgba(201,168,76,0.15)' : 'transparent',
                    fontFamily:"'Jost',sans-serif",
                    fontSize:9, fontWeight:300,
                    letterSpacing:'0.12em',
                    textTransform:'uppercase',
                    color: category === cat ? GOLD : 'rgba(248,247,245,0.6)',
                    cursor:'pointer',
                    touchAction:'manipulation',
                    transition:'all 180ms ease',
                  }}
                >{cat}</button>
              ))}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading || !name.trim() || !category}
              style={{
                width:'100%', height:52,
                background: (!name.trim() || !category) ? 'rgba(201,168,76,0.3)' : GOLD,
                color: (!name.trim() || !category) ? 'rgba(12,10,9,0.4)' : '#0C0A09',
                border:'none', borderRadius:100,
                cursor: (!name.trim() || !category) ? 'default' : 'pointer',
                fontFamily:"'Jost',sans-serif", fontSize:10, fontWeight:400,
                letterSpacing:'0.2em', textTransform:'uppercase',
                touchAction:'manipulation',
                transition:'all 200ms ease',
              }}
            >{loading ? 'Saving…' : 'Continue →'}</button>

          </div>
        </div>
      </div>
    </>
  );
}
