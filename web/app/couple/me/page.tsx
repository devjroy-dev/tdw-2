'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Settings, LogOut, ChevronRight, Users, Zap, Crown, Star, X, Home, Sparkles } from 'lucide-react';
import { CitySearchDropdown, ALL_CITIES } from '../../components/CitySearchDropdown';

const API = 'https://dream-wedding-production-89ae.up.railway.app';
const GOLD = '#C9A84C';
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

function getInitials(name?: string): string {
  if (!name) return 'D';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}
function getDaysUntil(dateStr: string): number {
  const now = new Date(); now.setHours(0,0,0,0);
  const d = new Date(dateStr); d.setHours(0,0,0,0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

// ─── Toggle component ─────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 44, height: 26, borderRadius: 13, cursor: 'pointer',
        background: on ? GOLD : '#D8D4CE',
        position: 'relative', transition: 'background 200ms ease',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: on ? 21 : 3,
        width: 20, height: 20, borderRadius: '50%', background: '#FFFFFF',
        transition: 'left 200ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  );
}

export default function CoupleMe() {
  const router = useRouter();
  const [name, setName]               = useState('');
  const [userId, setUserId]           = useState('');
  const [tier, setTier]               = useState<'Lite'|'Signature'|'Platinum'>('Lite');
  const [weddingDate, setWeddingDate] = useState<string|null>(null);
  const [tokens, setTokens]           = useState<number|null>(null);
  const [toast, setToast]             = useState('');
  const [loading, setLoading]         = useState(true);

  // Settings sheet state
  const [settingsOpen, setSettingsOpen]         = useState(false);
  const [dreamAiHome, setDreamAiHome]           = useState(false);
  const [residenceCity, setResidenceCity]       = useState('');
  const [weddingCity, setWeddingCity]           = useState('');
  const [segmentSaving, setSegmentSaving]       = useState(false);
  const [segmentSaved, setSegmentSaved]         = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session') || localStorage.getItem('couple_web_session');
      if (!raw) { window.location.replace('/couple/pin-login'); return; }
      const s = JSON.parse(raw);
      if (!s?.id) { window.location.replace('/couple/pin-login'); return; }
      const n = s?.name || s?.dreamer_name || '';
      if (n) setName(n);
      setUserId(s.id);

      // Read home screen preference from localStorage
      const savedHome = localStorage.getItem('couple_default_home');
      setDreamAiHome(savedHome === 'dreamai');

      Promise.all([
        fetch(`${API}/api/v2/couple/profile/${s.id}`).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/v2/couple/tokens/${s.id}`).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/users/${s.id}`).then(r => r.json()).catch(() => null),
      ]).then(([profile, tokenData, userData]) => {
        if (profile?.couple) {
          const p = profile.couple;
          const t = p.dreamer_type || p.tier || 'lite';
          if (t === 'platinum') setTier('Platinum');
          else if (t === 'signature') setTier('Signature');
          else setTier('Lite');
          if (p.wedding_date) setWeddingDate(p.wedding_date);
          if (n === '' && p.name) setName(p.name);
        }
        if (tokenData?.remaining !== undefined) setTokens(tokenData.remaining);
        else if (tokenData?.balance !== undefined) setTokens(tokenData.balance);

        // Pre-populate segment fields
        if (userData?.data) {
          setResidenceCity(userData.data.residence_country || 'India');
          setWeddingCity(userData.data.wedding_country || 'India');
        }
      }).finally(() => setLoading(false));
    } catch {
      window.location.replace('/couple/pin-login');
    }
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // Toggle 1 — default home screen
  function handleHomeToggle() {
    const next = !dreamAiHome;
    setDreamAiHome(next);
    localStorage.setItem('couple_default_home', next ? 'dreamai' : 'today');
    showToast(next ? 'DreamAi set as home screen.' : 'Today set as home screen.');
  }

  // Toggle 2 — save segment edit
  async function handleSegmentSave() {
    if (!userId || !residenceCity || !weddingCity) return;
    setSegmentSaving(true);
    try {
      const newSegment = (isIndiaCity(residenceCity) && isIndiaCity(weddingCity))
        ? 'india'
        : (!isIndiaCity(residenceCity))
          ? (isIndiaCity(weddingCity) ? 'nri' : 'global')
          : 'india';

      await fetch(`${API}/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          residence_country: residenceCity,
          wedding_country: weddingCity,
          user_segment: newSegment,
        }),
      });
      setSegmentSaved(true);
      setTimeout(() => setSegmentSaved(false), 2000);
      showToast('Location updated.');
    } catch {
      showToast('Could not save. Try again.');
    } finally {
      setSegmentSaving(false);
    }
  }

  const initials = getInitials(name);
  const daysUntil = weddingDate ? getDaysUntil(weddingDate) : null;
  const tierColour = tier === 'Platinum' ? '#111111' : tier === 'Signature' ? GOLD : '#888580';
  const tierIcon = tier === 'Platinum' ? Crown : tier === 'Signature' ? Star : null;
  const TierIcon = tierIcon;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes slideDown { from{opacity:0;transform:translateY(-40px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
      `}</style>

      {toast && (
        <div style={{
          position:'fixed',top:24,left:'50%',transform:'translateX(-50%)',
          background:'#111111',color:'#F8F7F5',
          fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,
          padding:'10px 16px',borderRadius:8,zIndex:500,
          animation:'slideDown 280ms cubic-bezier(0.22,1,0.36,1)',
          whiteSpace:'nowrap',pointerEvents:'none',
        }}>{toast}</div>
      )}

      {/* ─── Settings sheet ───────────────────────────────────────────────── */}
      {settingsOpen && (
        <div style={{ position:'fixed',inset:0,zIndex:400 }}>
          {/* Backdrop */}
          <div
            onClick={() => setSettingsOpen(false)}
            style={{ position:'absolute',inset:0,background:'rgba(12,10,9,0.5)' }}
          />
          {/* Sheet */}
          <div style={{
            position:'absolute',bottom:0,left:0,right:0,
            background:'#F8F7F5',borderRadius:'20px 20px 0 0',
            padding:'28px 24px calc(env(safe-area-inset-bottom,16px) + 32px)',
            maxHeight:'85vh',overflowY:'auto',
            animation:'slideUp 300ms cubic-bezier(0.22,1,0.36,1)',
          }}>
            {/* Handle */}
            <div style={{ width:36,height:3,borderRadius:2,background:'#D8D4CE',margin:'0 auto 24px' }} />

            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28 }}>
              <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:300,color:'#111111',margin:0 }}>
                Settings
              </p>
              <button
                onClick={() => setSettingsOpen(false)}
                style={{ background:'none',border:'none',cursor:'pointer',padding:4 }}
              >
                <X size={20} color="#888580" strokeWidth={1.5} />
              </button>
            </div>

            {/* ── Toggle 1: Default home screen ── */}
            <div style={{ marginBottom:32 }}>
              <p style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.2em',textTransform:'uppercase',color:'#888580',margin:'0 0 14px' }}>
                Home Screen
              </p>
              <div style={{
                background:'#FFFFFF',borderRadius:12,border:'0.5px solid #E2DED8',
                padding:'16px 18px',display:'flex',alignItems:'center',gap:14,
              }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:3 }}>
                    {dreamAiHome
                      ? <Sparkles size={14} color={GOLD} strokeWidth={1.5} />
                      : <Home size={14} color="#888580" strokeWidth={1.5} />
                    }
                    <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:'#111111',margin:0 }}>
                      {dreamAiHome ? 'DreamAi' : 'Today'}
                    </p>
                  </div>
                  <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:300,color:'#888580',margin:0 }}>
                    {dreamAiHome
                      ? 'App opens to DreamAi by default'
                      : 'App opens to Today screen by default'}
                  </p>
                </div>
                <Toggle on={dreamAiHome} onToggle={handleHomeToggle} />
              </div>
            </div>

            {/* ── Toggle 2: Segment / location edit ── */}
            <div style={{ marginBottom:32 }}>
              <p style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.2em',textTransform:'uppercase',color:'#888580',margin:'0 0 14px' }}>
                Your Location
              </p>
              <div style={{ background:'#FFFFFF',borderRadius:12,border:'0.5px solid #E2DED8',padding:'16px 18px' }}>
                <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:'#888580',margin:'0 0 16px',lineHeight:1.5 }}>
                  Update if you've moved or made an error during signup. This affects your pricing and catalogue view.
                </p>
                <div style={{ marginBottom:14 }}>
                  <CitySearchDropdown
                    label="Where do you live?"
                    value={residenceCity}
                    onChange={setResidenceCity}
                    placeholder="Select city or country"
                    theme="light"
                  />
                </div>
                <div style={{ marginBottom:18 }}>
                  <CitySearchDropdown
                    label="Where will your wedding take place?"
                    value={weddingCity}
                    onChange={setWeddingCity}
                    placeholder="Select city or country"
                    theme="light"
                  />
                </div>
                <button
                  onClick={handleSegmentSave}
                  disabled={segmentSaving}
                  style={{
                    width:'100%',height:44,borderRadius:100,border:'none',cursor:'pointer',
                    background: segmentSaved ? '#2D7A4F' : '#111111',
                    color:'#F8F7F5',
                    fontFamily:"'Jost',sans-serif",fontSize:10,fontWeight:400,letterSpacing:'0.18em',textTransform:'uppercase',
                    transition:'background 250ms ease',
                    touchAction:'manipulation',
                  }}
                >
                  {segmentSaving ? 'Saving…' : segmentSaved ? '✓ Saved' : 'Save location'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── Main page ───────────────────────────────────────────────────── */}
      <div style={{ background:'#F8F7F5',minHeight:'100dvh',padding:'32px 20px 120px' }}>
        <div style={{ animation:'fadeUp 400ms cubic-bezier(0.22,1,0.36,1)' }}>

          {/* Avatar */}
          <div style={{
            width:72,height:72,borderRadius:'50%',background:'#111111',
            margin:'0 auto 12px',display:'flex',alignItems:'center',justifyContent:'center',
            border: tier === 'Platinum' ? '2px solid #111111' : tier === 'Signature' ? `2px solid ${GOLD}` : 'none',
          }}>
            <span style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:300,color:'#F8F7F5' }}>
              {initials}
            </span>
          </div>

          {/* Name */}
          <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:300,color:'#111111',textAlign:'center',margin:'0 0 6px' }}>
            {name || 'Dreamer'}
          </p>

          {/* Tier badge */}
          <div style={{ display:'flex',justifyContent:'center',marginBottom:28 }}>
            <div style={{
              display:'inline-flex',alignItems:'center',gap:5,
              padding:'4px 12px',borderRadius:20,
              border:`0.5px solid ${tierColour}`,
            }}>
              {TierIcon && <TierIcon size={11} color={tierColour} strokeWidth={1.5} />}
              <span style={{ fontFamily:"'Jost',sans-serif",fontSize:10,fontWeight:300,letterSpacing:'0.15em',textTransform:'uppercase',color:tierColour }}>
                {tier}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display:'flex',gap:10,marginBottom:20 }}>
            <div
              onClick={() => showToast('Wedding date editing coming soon.')}
              style={{ flex:1,background:'#FFFFFF',borderRadius:12,border:'0.5px solid #E2DED8',padding:'14px 16px',cursor:'pointer',touchAction:'manipulation' }}
            >
              <p style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',color:'#888580',margin:'0 0 6px' }}>Wedding</p>
              {weddingDate ? (
                <>
                  <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:300,color:'#111111',margin:'0 0 2px',lineHeight:1.1 }}>
                    {daysUntil !== null && daysUntil > 0 ? `${daysUntil}` : daysUntil === 0 ? 'Today' : '—'}
                  </p>
                  <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:300,color:'#888580',margin:0 }}>
                    {daysUntil !== null && daysUntil > 0 ? 'days to go' : formatDate(weddingDate)}
                  </p>
                </>
              ) : (
                <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:GOLD,margin:0 }}>Add date</p>
              )}
            </div>

            <div style={{ flex:1,background:'#FFFFFF',borderRadius:12,border:'0.5px solid #E2DED8',padding:'14px 16px' }}>
              <p style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',color:'#888580',margin:'0 0 6px' }}>DreamAi</p>
              <div style={{ display:'flex',alignItems:'baseline',gap:4 }}>
                <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:300,color:'#111111',margin:'0 0 2px',lineHeight:1.1 }}>
                  {loading ? '—' : tokens ?? '—'}
                </p>
              </div>
              <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:300,color:'#888580',margin:0 }}>queries left</p>
            </div>
          </div>

          {/* Upgrade CTA */}
          {tier !== 'Platinum' && (
            <div
              onClick={() => showToast('Upgrade available soon — Razorpay integration in progress.')}
              style={{
                background: tier === 'Lite' ? '#111111' : `linear-gradient(135deg,${GOLD},#a8893a)`,
                borderRadius:12,padding:'16px 20px',marginBottom:20,
                cursor:'pointer',touchAction:'manipulation',
                display:'flex',alignItems:'center',justifyContent:'space-between',
              }}
            >
              <div>
                <p style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(248,247,245,0.6)',margin:'0 0 4px' }}>
                  {tier === 'Lite' ? 'Upgrade to Signature' : 'Upgrade to Platinum'}
                </p>
                <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:300,color:'#F8F7F5',margin:0 }}>
                  {tier === 'Lite' ? '₹999 one-time' : '₹2,999 one-time'}
                </p>
                <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:300,color:'rgba(248,247,245,0.55)',margin:'4px 0 0' }}>
                  {tier === 'Lite' ? 'Unlock discovery tokens & more' : 'Unlock Couture, DreamAi & Memory Box'}
                </p>
              </div>
              <ChevronRight size={18} color="rgba(248,247,245,0.5)" strokeWidth={1.5} />
            </div>
          )}

          {/* Menu rows */}
          <div style={{ background:'#FFFFFF',borderRadius:12,border:'0.5px solid #E2DED8',overflow:'hidden',marginBottom:16 }}>
            {[
              { Icon: Heart,    label:'My Muse',        action: () => router.push('/couple/muse') },
              { Icon: Users,    label:'My Circle',      action: () => router.push('/couple/circle') },
              { Icon: Zap,      label:'DreamAi Queries',action: () => showToast('Buy more queries coming soon.') },
              { Icon: Settings, label:'Settings',       action: () => setSettingsOpen(true) },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                onClick={row.action}
                style={{
                  display:'flex',alignItems:'center',gap:14,padding:'16px 20px',
                  cursor:'pointer',touchAction:'manipulation',
                  borderBottom: i < arr.length - 1 ? '0.5px solid #E2DED8' : 'none',
                }}
              >
                <row.Icon size={18} color="#888580" strokeWidth={1.5} />
                <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:'#111111',flex:1 }}>
                  {row.label}
                </span>
                <ChevronRight size={16} color="#C8C4BE" strokeWidth={1.5} />
              </div>
            ))}
          </div>

          {/* Sign out */}
          <div
            onClick={() => {
              localStorage.removeItem('couple_session');
              localStorage.removeItem('couple_web_session');
              window.location.replace('/');
            }}
            style={{ display:'flex',alignItems:'center',gap:14,padding:'16px 0',cursor:'pointer',touchAction:'manipulation' }}
          >
            <LogOut size={18} color="#888580" strokeWidth={1.5} />
            <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:'#888580' }}>Sign out</span>
          </div>

        </div>
      </div>
    </>
  );
}
