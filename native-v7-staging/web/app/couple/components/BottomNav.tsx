'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Home, CheckSquare, Users, Heart, Layers, MessageCircle } from 'lucide-react';
import { useCoupleMode } from '../layout';
import { useState } from 'react';

// PLAN MODE: TODAY | PLAN | CIRCLE
const PLAN_TABS = [
  { label: 'TODAY',   Icon: Home,          href: '/couple/today'         },
  { label: 'PLAN',    Icon: CheckSquare,   href: '/couple/plan'          },
  { label: 'CIRCLE',  Icon: Users,         href: '/couple/circle'        },
];

// DISCOVER MODE: MUSE | FEED | MESSAGES
const DISCOVER_TABS = [
  { label: 'MUSE',     Icon: Heart,         href: '/couple/muse'          },
  { label: 'FEED',     Icon: Layers,        href: '/couple/discover/hub'  },
  { label: 'MESSAGES', Icon: MessageCircle, href: '/couple/messages'      },
];

export default function CoupleBottomNav() {
  const { mode } = useCoupleMode();
  const pathname = usePathname();
  const router = useRouter();
  const [toast, setToast] = useState('');

  const isPlan = mode === 'PLAN';
  const tabs = isPlan ? PLAN_TABS : DISCOVER_TABS;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const handleTab = (href: string | null) => {
    if (!href) { showToast('Coming soon.'); return; }
    router.push(href);
  };

  return (
    <>
      <style>{`@keyframes slideDown2{from{opacity:0;transform:translateY(-40px) translateX(-50%)}to{opacity:1;transform:translateY(0) translateX(-50%)}}`}</style>

      {toast && (
        <div style={{ position:'fixed',top:24,left:'50%',transform:'translateX(-50%)',background:'#111111',color:'#F8F7F5',fontFamily:"'DM Sans',sans-serif",fontSize:12,fontWeight:300,padding:'10px 16px',borderRadius:8,zIndex:400,animation:'slideDown2 280ms cubic-bezier(0.22,1,0.36,1)',whiteSpace:'nowrap',pointerEvents:'none' }}>
          {toast}
        </div>
      )}

      <nav style={{
        position:'fixed', bottom:0, left:0, right:0, zIndex:100,
        background: '#F8F7F5',
        borderTop: '0.5px solid #E2DED8',
        paddingBottom:'env(safe-area-inset-bottom)',
        display:'flex', alignItems:'stretch', justifyContent:'space-around',
        height:64, boxSizing:'content-box',
        transition:'background 320ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        {tabs.map(tab => {
          const isActive = tab.href
            ? pathname === tab.href || pathname?.startsWith(tab.href + '/')
            : false;

          const iconColor = isActive ? '#111111' : '#888580';

          return (
            <button
              key={tab.label}
              onClick={() => handleTab(tab.href)}
              style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:4,background:'none',border:'none',cursor:'pointer',padding:0,position:'relative',touchAction:'manipulation',transition:'opacity 180ms ease' }}
              aria-label={tab.label}
            >
              {/* Active bar — bottom for plan, top for discover */}
              <span style={{
                position:'absolute',
                ...(isPlan ? { bottom:0 } : { top:0 }),
                left:'50%', transform:'translateX(-50%)',
                width:24, height:2, borderRadius:1,
                background: isActive ? '#C9A84C' : 'transparent',
                transition:'background 180ms ease',
              }} />

              <tab.Icon size={20} strokeWidth={1.5} color={iconColor} style={{ transition:'color 180ms ease' }} />
              <span style={{ fontFamily:"'Jost',sans-serif",fontSize:9,fontWeight:200,letterSpacing:'0.2em',textTransform:'uppercase',color:iconColor,marginTop:2,lineHeight:1,transition:'color 180ms ease' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
