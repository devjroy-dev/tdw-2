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
  const [mode, setMode] = useState<CoupleAppMode>('PLAN');
  const pathname = usePathname();

  // MODE 1 — Auth routes: render children only
  if (AUTH_ROUTES.some(r => pathname === r || pathname?.startsWith(r + '/'))) {
    return (
      <CoupleModeContext.Provider value={{ mode, setMode }}>
        {children}
      </CoupleModeContext.Provider>
    );
  }

  // MODE 2 — Discover route: fully immersive, NO TopBar, NO BottomNav
  // Discovery component is position:fixed; inset:0 and manages its own UI completely
  if (pathname === '/couple/discover') {
    return (
      <CoupleModeContext.Provider value={{ mode, setMode }}>
        {children}
      </CoupleModeContext.Provider>
    );
  }

  // MODE 3 — All other routes: full padded shell
  return (
    <CoupleModeContext.Provider value={{ mode, setMode }}>
      <div style={{
        fontFamily: "'DM Sans', sans-serif",
        background: mode === 'PLAN' ? '#F8F7F5' : '#0C0A09',
        minHeight: '100dvh',
        transition: 'background 320ms cubic-bezier(0.22,1,0.36,1)',
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
