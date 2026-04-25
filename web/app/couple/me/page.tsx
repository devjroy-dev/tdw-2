'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Settings, LogOut, ChevronRight, Users, Zap, Crown, Star } from 'lucide-react';

const API = 'https://dream-wedding-production-89ae.up.railway.app';

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

export default function CoupleMe() {
  const router = useRouter();
  const [name, setName]           = useState('');
  const [userId, setUserId]       = useState('');
  const [tier, setTier]           = useState<'Basic'|'Gold'|'Platinum'>('Basic');
  const [weddingDate, setWeddingDate] = useState<string|null>(null);
  const [tokens, setTokens]       = useState<number|null>(null);
  const [toast, setToast]         = useState('');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('couple_session') || localStorage.getItem('couple_web_session');
      if (!raw) { window.location.replace('/couple/pin-login'); return; }
      const s = JSON.parse(raw);
      if (!s?.id) { window.location.replace('/couple/pin-login'); return; }
      const n = s?.name || s?.dreamer_name || '';
      if (n) setName(n);
      setUserId(s.id);

      // Fetch profile + tokens in parallel
      Promise.all([
        fetch(`${API}/api/v2/couple/profile/${s.id}`).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/v2/couple/tokens/${s.id}`).then(r => r.json()).catch(() => null),
      ]).then(([profile, tokenData]) => {
        if (profile?.couple) {
          const p = profile.couple;
          const t = p.dreamer_type || p.tier || 'free';
          if (t === 'elite' || t === 'platinum') setTier('Platinum');
          else if (t === 'premium' || t === 'gold') setTier('Gold');
          else setTier('Basic');
          if (p.wedding_date) setWeddingDate(p.wedding_date);
          if (n === '' && p.name) setName(p.name);
        }
        if (tokenData?.remaining !== undefined) setTokens(tokenData.remaining);
        else if (tokenData?.balance !== undefined) setTokens(tokenData.balance);
      }).finally(() => setLoading(false));
    } catch {
      window.location.replace('/couple/pin-login');
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(''), 3000);
  };

  const initials = getInitials(name);
  const daysUntil = weddingDate ? getDaysUntil(weddingDate) : null;

  const tierColour = tier === 'Platinum' ? '#111111' : tier === 'Gold' ? '#C9A84C' : '#888580';
  const tierIcon = tier === 'Platinum' ? Crown : tier === 'Gold' ? Star : null;
  const TierIcon = tierIcon;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=DM+Sans:wght@300;400&family=Jost:wght@200;300;400&display=swap');
        @keyframes slideDown { from{opacity:0;transform:translateY(-40px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
      `}</style>

      {toast && (
        <div style={{
          position:'fixed',top:24,left:'50%',transform:'translateX(-50%)',
          background:'#111111',color:'#F8F7F5',
          fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,
          padding:'10px 16px',borderRadius:8,zIndex:400,
          animation:'slideDown 280ms cubic-bezier(0.22,1,0.36,1)',
          whiteSpace:'nowrap',pointerEvents:'none',
        }}>{toast}</div>
      )}

      <div style={{ background:'#F8F7F5',minHeight:'100dvh',padding:'32px 20px 120px' }}>

        {/* Profile section */}
        <div style={{ animation:'fadeUp 400ms cubic-bezier(0.22,1,0.36,1)' }}>

          {/* Avatar */}
          <div style={{
            width:72,height:72,borderRadius:'50%',background:'#111111',
            margin:'0 auto 12px',display:'flex',alignItems:'center',justifyContent:'center',
            border: tier === 'Platinum' ? '2px solid #111111' : tier === 'Gold' ? '2px solid #C9A84C' : 'none',
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

          {/* Stats row — wedding date + tokens */}
          <div style={{ display:'flex',gap:10,marginBottom:20 }}>

            {/* Wedding date card */}
            <div
              onClick={() => showToast('Wedding date editing coming soon.')}
              style={{
                flex:1,background:'#FFFFFF',borderRadius:12,border:'0.5px solid #E2DED8',
                padding:'14px 16px',cursor:'pointer',touchAction:'manipulation',
              }}
            >
              <p style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',color:'#888580',margin:'0 0 6px' }}>
                Wedding
              </p>
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
                <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,color:'#C9A84C',margin:0 }}>
                  Add date
                </p>
              )}
            </div>

            {/* DreamAi tokens card */}
            <div style={{
              flex:1,background:'#FFFFFF',borderRadius:12,border:'0.5px solid #E2DED8',
              padding:'14px 16px',
            }}>
              <p style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',color:'#888580',margin:'0 0 6px' }}>
                DreamAi
              </p>
              <div style={{ display:'flex',alignItems:'baseline',gap:4 }}>
                <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:300,color:'#111111',margin:'0 0 2px',lineHeight:1.1 }}>
                  {loading ? '—' : tokens ?? '—'}
                </p>
              </div>
              <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:10,fontWeight:300,color:'#888580',margin:0 }}>
                queries left
              </p>
            </div>
          </div>

          {/* Upgrade CTA */}
          {tier !== 'Platinum' && (
            <div
              onClick={() => showToast('Upgrade available soon — Razorpay integration in progress.')}
              style={{
                background: tier === 'Basic' ? '#111111' : 'linear-gradient(135deg,#C9A84C,#a8893a)',
                borderRadius:12,padding:'16px 20px',marginBottom:20,
                cursor:'pointer',touchAction:'manipulation',
                display:'flex',alignItems:'center',justifyContent:'space-between',
              }}
            >
              <div>
                <p style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:300,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(248,247,245,0.6)',margin:'0 0 4px' }}>
                  {tier === 'Basic' ? 'Upgrade to Gold' : 'Upgrade to Platinum'}
                </p>
                <p style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:300,color:'#F8F7F5',margin:0 }}>
                  {tier === 'Basic' ? '₹999 one-time' : '₹2,999 one-time'}
                </p>
                <p style={{ fontFamily:"'DM Sans',sans-serif",fontSize:11,fontWeight:300,color:'rgba(248,247,245,0.55)',margin:'4px 0 0' }}>
                  {tier === 'Basic' ? 'Unlock discovery tokens & more' : 'Unlock Couture, DreamAi & Memory Box'}
                </p>
              </div>
              <ChevronRight size={18} color="rgba(248,247,245,0.5)" strokeWidth={1.5} />
            </div>
          )}

          {/* Menu rows */}
          <div style={{
            background:'#FFFFFF',borderRadius:12,border:'0.5px solid #E2DED8',
            overflow:'hidden',marginBottom:16,
          }}>
            {[
              { Icon: Heart, label:'My Muse', action: () => router.push('/couple/muse') },
              { Icon: Users, label:'My Circle', action: () => router.push('/couple/circle') },
              { Icon: Zap,  label:'DreamAi Queries', action: () => showToast('Buy more queries coming soon.') },
              { Icon: Settings, label:'Settings', action: () => showToast('Coming soon.') },
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
            <span style={{ fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:300,color:'#888580' }}>
              Sign out
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
