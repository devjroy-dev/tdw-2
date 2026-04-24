'use client';

import { createContext, useContext, useState } from 'react';
import { usePathname } from 'next/navigation';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';

// ─── Mode Context ─────────────────────────────────────────────────────────────
export type CoupleAppMode = 'PLAN' | 'DISCOVER';

export const CoupleModeContext = createContext<{
  mode: CoupleAppMode;
  setMode: (m: CoupleAppMode) => void;
}>({ mode: 'PLAN', setMode: () => {} });

export const useCoupleMode = () => useContext(CoupleModeContext);

// ─── Auth routes — no shell ───────────────────────────────────────────────────
const AUTH_ROUTES = ['/couple/pin', '/couple/pin-login', '/couple/login'];

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function CoupleLayout({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<CoupleAppMode>(() => {
    if (typeof window === 'undefined') return 'PLAN';
    try {
      const saved = localStorage.getItem('couple_app_mode');
      return (saved === 'DISCOVER' ? 'DISCOVER' : 'PLAN') as CoupleAppMode;
    } catch { return 'PLAN'; }
  });
  const pathname = usePathname();

  const setModePersisted = (m: CoupleAppMode) => {
    try { localStorage.setItem('couple_app_mode', m); } catch {}
    setMode(m);
  };

  // MODE 1 — Auth routes: render children only
  if (AUTH_ROUTES.some(r => pathname === r || pathname?.startsWith(r + '/'))) {
    return (
      <CoupleModeContext.Provider value={{ mode, setMode: setModePersisted }}>
        {children}
      </CoupleModeContext.Provider>
    );
  }

  // MODE 2 — Feed routes: fully immersive, NO TopBar, NO BottomNav
  // Feed is position:fixed; inset:0 and manages its own UI completely
  // Only the feed itself is immersive — hub and other discover pages keep the shell
  if (pathname === '/couple/discover/feed' || pathname?.startsWith('/couple/discover/feed?')) {
    return (
      <CoupleModeContext.Provider value={{ mode, setMode: setModePersisted }}>
        {children}
      </CoupleModeContext.Provider>
    );
  }

  // MODE 3 — All other routes: full padded shell
  return (
    <CoupleModeContext.Provider value={{ mode, setMode: setModePersisted }}>
      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        background: '#F8F7F5',
        minHeight: '100dvh',
      }}>
        <TopBar />
        <main style={{
          paddingTop: 56,
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom))',
          minHeight: '100dvh',
        }}>
          {children}
        </main>
        <BottomNav />
      </div>
    </CoupleModeContext.Provider>
  );
}
