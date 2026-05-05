'use client';
import { useEffect, useRef, useState } from 'react';
import { CitySearchDropdown, ALL_CITIES } from '../../components/CitySearchDropdown';

const INDIA_CITY_SET = new Set([
  'Delhi','Mumbai','Bangalore','Chennai','Hyderabad','Kolkata','Jaipur','Udaipur','Pune','Ahmedabad',
  'Chandigarh','Lucknow','Kochi','Goa','Amritsar','Surat','Jodhpur','Agra','Varanasi','Bhopal','Indore',
  'Nagpur','Coimbatore','Madurai','Visakhapatnam','Mangalore','Mysore','Pondicherry','Dehradun','Shimla',
  'Mussoorie','Nainital','Rishikesh','Haridwar','Jammu','Srinagar','Guwahati','Shillong','Bhubaneswar',
  'Raipur','Ranchi','Patna','Allahabad','Meerut','Kanpur','Ludhiana','Jalandhar','Patiala','Faridabad',
  'Gurgaon','Noida','Thane','Navi Mumbai','Aurangabad','Nashik','Kolhapur','Rajkot','Vadodara','Gandhinagar',
  'Bhavnagar','Trivandrum','Thrissur','Kozhikode','Calicut','Hubli','Belgaum','Vijayawada','Guntur',
  'Warangal','Tirupati','Salem','Tiruchirappalli','Vellore',
]);
const isIndiaCity = (v: string) => INDIA_CITY_SET.has(v) || v === 'India';
import { useRouter } from 'next/navigation';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const GOLD = '#C9A84C';

const FALLBACK_SLIDES = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=1200&q=90&fit=crop',
  'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=1200&q=90&fit=crop',
];

// Wedding date options
type DateMode = 'exact' | 'rough' | 'exploring' | null;
const SEASONS = [
  { label: 'Jan – Mar', value: 'Q1' },
  { label: 'Apr – Jun', value: 'Q2' },
  { label: 'Jul – Sep', value: 'Q3' },
  { label: 'Oct – Dec', value: 'Q4' },
];

export default function CoupleOnboardingPage() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const partnerRef = useRef<HTMLInputElement>(null);

  const [name, setName]               = useState('');
  const [residenceCountry, setResidenceCountry] = useState('India');
  const [weddingCountry, setWeddingCountry]     = useState('India');
  const [weddingStyle, setWeddingStyle]         = useState('Hindu');
  const [partnerName, setPartnerName] = useState('');
  const [dateMode, setDateMode]       = useState<DateMode>(null);
  const [exactDate, setExactDate]     = useState('');
  const [roughSeason, setRoughSeason] = useState('');
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState('');
  const [slide, setSlide]             = useState(0);
  const [slides, setSlides]           = useState<string[]>(FALLBACK_SLIDES);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  useEffect(() => {
    // Guard: must have a couple session
    try {
      const raw = localStorage.getItem('couple_web_session') || localStorage.getItem('couple_session');
      const s = JSON.parse(raw || '{}');
      if (!s?.id && !s?.userId) { router.replace('/'); return; }
      // If already has name — skip to pin
      if (s?.name) { router.replace('/couple/pin'); return; }
    } catch { router.replace('/'); return; }
    setTimeout(() => nameRef.current?.focus(), 300);
  }, []);

  // Carousel + live cover photos
  useEffect(() => {
    fetch(API + '/api/v2/cover-photos')
      .then(r => r.json())
      .then(d => { if (d.photos?.length) setSlides(d.photos.map((p: any) => p.image_url)); })
      .catch(() => {});
    const t = setInterval(() => setSlide(p => (p + 1) % FALLBACK_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, []);

  const buildWeddingDate = (): string | null => {
    if (dateMode === 'exact' && exactDate) return exactDate;
    if (dateMode === 'rough' && roughSeason) {
      // Store as a readable marker — backend just stores it as a string in wedding_date
      const year = new Date().getFullYear();
      const map: Record<string, string> = { Q1: `${year}-02-01`, Q2: `${year}-05-01`, Q3: `${year}-08-01`, Q4: `${year}-11-01` };
      return map[roughSeason] || null;
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!name.trim()) { showToast('Please enter your name'); nameRef.current?.focus(); return; }
    setLoading(true);
    try {
      const raw = localStorage.getItem('couple_web_session') || localStorage.getItem('couple_session');
      const session = JSON.parse(raw || '{}');
      const userId = session.id || session.userId;
      const phone = session.phone;

      const r = await fetch(API + '/api/v2/couple/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          phone,
          name: name.trim(),
          partner_name: partnerName.trim() || null,
          wedding_date: buildWeddingDate(),
          residence_country: residenceCountry,
          wedding_country: weddingCountry,
          wedding_style: weddingStyle.toLowerCase(),
          user_segment: (isIndiaCity(residenceCountry) && isIndiaCity(weddingCountry)) ? 'india' : (!isIndiaCity(residenceCountry)) ? (isIndiaCity(weddingCountry) ? 'nri' : 'global') : 'india',
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error || 'Failed');

      // Update both session keys with name
      const updated = { ...session, name: name.trim(), partner_name: partnerName.trim() || null };
      localStorage.setItem('couple_web_session', JSON.stringify(updated));
      localStorage.setItem('couple_session', JSON.stringify(updated));

      router.replace('/couple/pin');
    } catch { showToast('Could not save. Try again.'); }
    finally { setLoading(false); }
  };

  const WEDDING_STYLES = ['Hindu','Muslim','Christian','Sikh','Jain','Buddhist','Jewish','Civil','Fusion','Other'];
  const canSubmit = name.trim().length > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { margin: 0; background: #0C0A09; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-32px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(1) opacity(0.4); }
      `}</style>

      {toast && (
        <div style={{ position:'fixed',top:24,left:'50%',transform:'translateX(-50%)',background:'rgba(201,168,76,0.12)',backdropFilter:'blur(12px)',border:'0.5px solid rgba(201,168,76,0.3)',color:GOLD,fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:13,padding:'10px 20px',borderRadius:100,zIndex:9999,whiteSpace:'nowrap',animation:'slideDown 280ms cubic-bezier(0.22,1,0.36,1)' }}>{toast}</div>
      )}

      {/* Background carousel */}
      <div style={{ position:'fixed',inset:0,background:'#0C0A09',overflow:'hidden' }}>
        {slides.map((src, i) => (
          <div key={i} style={{ position:'absolute',inset:0,backgroundImage:'url('+src+')',backgroundSize:'cover',backgroundPosition:'center',opacity: i === slide ? 0.5 : 0,transition:'opacity 1200ms ease' }} />
        ))}
        <div style={{ position:'absolute',inset:0,background:'rgba(12,10,9,0.5)' }} />

        {/* Glass panel */}
        <div style={{ position:'absolute',bottom:0,left:0,right:0,animation:'fadeIn 400ms cubic-bezier(0.22,1,0.36,1)' }}>
          <div style={{ background:'rgba(12,10,9,0.32)',backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',borderTop:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'20px 20px 0 0',padding:'28px 28px calc(env(safe-area-inset-bottom, 16px) + 32px)',maxHeight:'85vh',overflowY:'auto' }}>

            {/* Header */}
            <p style={{ fontFamily:"'Cormorant Garamond',serif",fontStyle:'italic',fontWeight:300,fontSize:14,color:'rgba(248,247,245,0.5)',margin:'0 0 2px' }}>The Dream Wedding</p>
            <p style={{ fontFamily:"'Jost',sans-serif",fontWeight:200,fontSize:6,letterSpacing:'0.32em',textTransform:'uppercase',color:GOLD,margin:'0 0 22px' }}>YOUR JOURNEY BEGINS</p>

            <p style={{ fontFamily:"'Cormorant Garamond',serif",fontWeight:300,fontSize:26,color:'#F8F7F5',margin:'0 0 4px',lineHeight:1.15 }}>Let's get to know you.</p>
            <p style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:13,color:'rgba(248,247,245,0.4)',margin:'0 0 28px',lineHeight:1.5 }}>A few details so we can make this feel personal.</p>

            {/* Your name */}
            <p style={{ fontFamily:"'Jost',sans-serif",fontWeight:200,fontSize:8,letterSpacing:'0.22em',textTransform:'uppercase',color:'rgba(248,247,245,0.4)',margin:'0 0 8px' }}>YOUR NAME <span style={{ color:GOLD }}>*</span></p>
            <input
              ref={nameRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) partnerRef.current?.focus(); }}
              placeholder="Your name"
              autoComplete="given-name"
              style={{ width:'100%',border:'none',borderBottom:'1px solid rgba(255,255,255,0.25)',background:'transparent',outline:'none',fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:16,color:'#F8F7F5',padding:'8px 0',marginBottom:24 }}
            />

            {/* Partner name */}
            <p style={{ fontFamily:"'Jost',sans-serif",fontWeight:200,fontSize:8,letterSpacing:'0.22em',textTransform:'uppercase',color:'rgba(248,247,245,0.4)',margin:'0 0 8px' }}>PARTNER'S NAME <span style={{ color:'rgba(248,247,245,0.25)',fontSize:7 }}>(OPTIONAL)</span></p>
            <input
              ref={partnerRef}
              type="text"
              value={partnerName}
              onChange={e => setPartnerName(e.target.value)}
              placeholder="Partner's name (optional)"
              autoComplete="off"
              style={{ width:'100%',border:'none',borderBottom:'1px solid rgba(255,255,255,0.18)',background:'transparent',outline:'none',fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:16,color:'#F8F7F5',padding:'8px 0',marginBottom:28 }}
            />

            {/* Wedding date */}
            <p style={{ fontFamily:"'Jost',sans-serif",fontWeight:200,fontSize:8,letterSpacing:'0.22em',textTransform:'uppercase',color:'rgba(248,247,245,0.4)',margin:'0 0 14px' }}>WEDDING DATE</p>

            {/* Date mode selector */}
            <div style={{ display:'flex',flexDirection:'column',gap:10,marginBottom: dateMode ? 18 : 28 }}>
              {[
                { mode: 'exact' as DateMode, label: 'Yes — I have a date' },
                { mode: 'rough' as DateMode, label: 'Roughly — give or take a season' },
                { mode: 'exploring' as DateMode, label: 'Just exploring for now' },
              ].map(opt => (
                <button
                  key={opt.mode!}
                  onClick={() => { setDateMode(opt.mode); setExactDate(''); setRoughSeason(''); }}
                  style={{ display:'flex',alignItems:'center',gap:10,background:'transparent',border:'none',cursor:'pointer',padding:0,touchAction:'manipulation' }}
                >
                  <div style={{ width:18,height:18,borderRadius:'50%',border: dateMode === opt.mode ? `1.5px solid ${GOLD}` : '1px solid rgba(255,255,255,0.3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all 160ms ease' }}>
                    {dateMode === opt.mode && <div style={{ width:8,height:8,borderRadius:'50%',background:GOLD }} />}
                  </div>
                  <span style={{ fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:14,color: dateMode === opt.mode ? '#F8F7F5' : 'rgba(248,247,245,0.5)',transition:'color 160ms ease' }}>{opt.label}</span>
                </button>
              ))}
            </div>

            {/* Exact date picker */}
            {dateMode === 'exact' && (
              <div style={{ marginBottom:24 }}>
                <input
                  type="date"
                  value={exactDate}
                  onChange={e => setExactDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={{ background:'rgba(255,255,255,0.06)',border:'0.5px solid rgba(255,255,255,0.2)',borderRadius:10,padding:'12px 16px',color:'#F8F7F5',fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:15,width:'100%',outline:'none' }}
                />
              </div>
            )}

            {/* Season picker */}
            {dateMode === 'rough' && (
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:24 }}>
                {SEASONS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setRoughSeason(s.value)}
                    style={{ padding:'11px 0',borderRadius:10,border: roughSeason === s.value ? `1px solid ${GOLD}` : '0.5px solid rgba(255,255,255,0.18)',background: roughSeason === s.value ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)',fontFamily:"'DM Sans',sans-serif",fontWeight:300,fontSize:13,color: roughSeason === s.value ? GOLD : 'rgba(248,247,245,0.55)',cursor:'pointer',touchAction:'manipulation',transition:'all 160ms ease' }}
                  >{s.label}</button>
                ))}
              </div>
            )}

            {/* Directive 2.9 — Segment detection */}
            <div style={{ marginBottom:16 }}>
              <CitySearchDropdown
                label="Where do you live?"
                value={residenceCountry}
                onChange={setResidenceCountry}
                placeholder="Select city or country"
                theme="dark"
              />
            </div>
            <div style={{ marginBottom:20 }}>
              <CitySearchDropdown
                label="Where will your wedding take place?"
                value={weddingCountry}
                onChange={setWeddingCountry}
                placeholder="Select city or country"
                theme="dark"
              />
            </div>
            {/* P1.1 — Wedding style dropdown */}
            <div style={{ marginBottom:24 }}>
              <p style={{ fontFamily:"'Jost',sans-serif", fontSize:9, fontWeight:300, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(248,247,245,0.4)', margin:'0 0 6px' }}>What's your wedding style?</p>
              <select
                value={weddingStyle}
                onChange={e => setWeddingStyle(e.target.value)}
                style={{ width:'100%', height:44, fontFamily:"'DM Sans',sans-serif", fontSize:13, fontWeight:300, color:'#111111', background:'#F8F7F5', border:'0.5px solid #E2DED8', borderRadius:10, padding:'0 12px', outline:'none' }}
              >
                {WEDDING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* CTA */}
            <button
              onClick={handleSubmit}
              disabled={loading || !canSubmit}
              style={{ width:'100%',height:52,background: canSubmit ? GOLD : 'rgba(201,168,76,0.3)',color: canSubmit ? '#0C0A09' : 'rgba(12,10,9,0.4)',border:'none',borderRadius:100,cursor: canSubmit ? 'pointer' : 'default',fontFamily:"'Jost',sans-serif",fontSize:10,fontWeight:400,letterSpacing:'0.2em',textTransform:'uppercase',touchAction:'manipulation',transition:'all 200ms ease' }}
            >{loading ? 'Saving…' : 'Let\'s go →'}</button>

          </div>
        </div>
      </div>
    </>
  );
}
