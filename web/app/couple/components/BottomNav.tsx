'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, CheckSquare, Heart, User,
  Layers, Sparkles, MessageCircle, Palette,
} from 'lucide-react';
import { useCoupleMode } from '../layout';

// PLAN MODE: TODAY | PLAN | BESPOKE | ME
const PLAN_TABS = [
  { label: 'TODAY',    Icon: Home,        href: '/couple/today',   action: 'navigate' },
  { label: 'PLAN',     Icon: CheckSquare, href: '/couple/plan',    action: 'navigate' },
  { label: 'BESPOKE',  Icon: Palette,     href: '/couple/bespoke', action: 'navigate' },
  { label: 'ME',       Icon: User,        href: '/couple/me',      action: 'navigate' },
] as const;

// DISCOVER MODE: FEED | COUTURE | MUSE | MESSAGES  
const DISCOVER_TABS = [
  { label: 'FEED',     Icon: Layers,        href: '/couple/discover', action: 'navigate' },
  { label: 'COUTURE',  Icon: Sparkles,      href: null,               action: 'toast'    },
  { label: 'MUSE',     Icon: Heart,         href: '/couple/muse',     action: 'navigate' },
  { label: 'MESSAGES', Icon: MessageCircle, href: null,               action: 'toast'    },
] as const;

export default function CoupleBottomNav() {
  const { mode } = useCoupleMode();
  const pathname = usePathname();
  const router = useRouter();
  const [toast, setToast] = useState('');

  const isPlan = mode === 'PLAN';
  const tabs = isPlan ? PLAN_TABS : DISCOVER_TABS;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleTab = (tab: typeof tabs[number]) => {
    if (tab.action === 'toast') {
      showToast('Coming soon.');
      return;
    }
    if (tab.href) router.push(tab.href);
  };

  return (
    <>
      <style>{`
        @keyframes slideDown2 { from{opacity:0;transform:translateY(-40px) translateX(-50%)} to{opacity:1;transform:translateY(0) translateX(-50%)} }
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 24, left: '50%',
          transform: 'translateX(-50%)',
          background: '#111111', color: '#F8F7F5',
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 300,
          padding: '10px 16px', borderRadius: 8, zIndex: 400,
          animation: 'slideDown2 280ms cubic-bezier(0.22,1,0.36,1)',
          whiteSpace: 'nowrap', pointerEvents: 'none',
        }}>{toast}</div>
      )}

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
        background: isPlan ? '#F8F7F5' : '#0C0A09',
        borderTop: isPlan ? '1px solid #E2DED8' : '0px solid transparent',
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex', alignItems: 'stretch', justifyContent: 'space-around',
        height: 64, boxSizing: 'content-box',
        transition: 'background 320ms cubic-bezier(0.22,1,0.36,1)',
      }}>
        {tabs.map(tab => {
          const isActive = tab.href
            ? pathname === tab.href || pathname?.startsWith(tab.href + '/')
            : false;

          const iconColor = isPlan
            ? (isActive ? '#111111' : '#888580')
            : (isActive ? '#F8F7F5' : 'rgba(248,247,245,0.35)');

          const labelColor = iconColor;

          return (
            <button
              key={tab.label}
              onClick={() => handleTab(tab as typeof tabs[number])}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 4, background: 'none', border: 'none',
                cursor: 'pointer', padding: 0, position: 'relative',
                touchAction: 'manipulation',
                transition: 'opacity 180ms cubic-bezier(0.22,1,0.36,1)',
              }}
              aria-label={tab.label}
            >
              {/* Active indicator */}
              {isPlan ? (
                <span style={{
                  position: 'absolute', bottom: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24, height: 2, borderRadius: 1,
                  background: isActive ? '#C9A84C' : 'transparent',
                  transition: 'background 180ms cubic-bezier(0.22,1,0.36,1)',
                }} />
              ) : (
                <span style={{
                  position: 'absolute', top: 0, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 24, height: 2, borderRadius: 1,
                  background: isActive ? '#C9A84C' : 'transparent',
                  transition: 'background 180ms cubic-bezier(0.22,1,0.36,1)',
                }} />
              )}

              <tab.Icon
                size={20} strokeWidth={1.5} color={iconColor}
                style={{ transition: 'color 180ms cubic-bezier(0.22,1,0.36,1)' }}
              />
              <span style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: 9, fontWeight: 200, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: labelColor,
                marginTop: 2, lineHeight: 1,
                transition: 'color 180ms cubic-bezier(0.22,1,0.36,1)',
              }}>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
