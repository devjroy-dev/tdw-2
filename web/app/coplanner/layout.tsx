'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  API, INK, CREAM, GOLD, MUTED, FONT_DISPLAY, FONT_BODY,
  CircleSession, CircleSessionContext,
} from './CircleSessionContext';
import TabBar from './TabBar';

const SESSION_KEY = 'circle_session';
const LAST_PATH_KEY = 'circle_last_path';

export default function CoplannerLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname() || '';
  const [session, setSession] = useState<CircleSession | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'no_session' | 'error'>('loading');

  // Persist last path so a returning install lands where Mom left off.
  useEffect(() => {
    if (state !== 'ready' || !pathname) return;
    try { localStorage.setItem(LAST_PATH_KEY, pathname); } catch {}
  }, [pathname, state]);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      let cached: CircleSession | null = null;
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (raw) cached = JSON.parse(raw) as CircleSession;
      } catch {}

      if (!cached || !cached.user_id) {
        if (!cancelled) setState('no_session');
        return;
      }

      if (!cancelled) {
        setSession(cached);
        setState('ready');
      }

      // Refresh permissions in the background. Don't block the UI.
      try {
        const r = await fetch(`${API}/api/v2/circle/session/${cached.user_id}`);
        const d = await r.json();
        if (cancelled) return;
        if (d.success && d.data) {
          localStorage.setItem(SESSION_KEY, JSON.stringify(d.data));
          setSession(d.data as CircleSession);
        }
      } catch {
        // Network blip — keep using cached session.
      }
    };

    hydrate();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (state === 'no_session') router.replace('/');
  }, [state, router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: INK,
      color: CREAM,
      fontFamily: FONT_BODY,
    }}>
      {state === 'loading' && (
        <FullScreenMessage title="" sub="Loading…" />
      )}

      {state === 'no_session' && (
        <FullScreenMessage
          title="Sign in"
          sub="Your Circle session has expired. Use your invite link to come back in."
        />
      )}

      {state === 'ready' && session && (
        <CircleSessionContext.Provider value={session}>
          <main style={{
            maxWidth: 480, margin: '0 auto',
            padding: '24px 20px 96px',
            minHeight: '100vh',
          }}>
            {children}
          </main>
          <TabBar />
        </CircleSessionContext.Provider>
      )}
    </div>
  );
}

function FullScreenMessage({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: 32,
    }}>
      {title && (
        <p style={{
          fontFamily: FONT_DISPLAY, fontStyle: 'italic', fontWeight: 300,
          fontSize: 28, color: CREAM, margin: '0 0 8px', textAlign: 'center',
        }}>{title}</p>
      )}
      <p style={{
        fontFamily: FONT_BODY, fontWeight: 300, fontSize: 13,
        color: MUTED, textAlign: 'center', lineHeight: 1.6, maxWidth: 320,
      }}>{sub}</p>
      <span style={{ color: GOLD, fontSize: 1, opacity: 0 }}>·</span>
    </div>
  );
}
