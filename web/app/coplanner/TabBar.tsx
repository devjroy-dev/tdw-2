'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useCircleSession, CREAM, GOLD, MUTED, HAIRLINE, FONT_EYEBROW } from './CircleSessionContext';

type Tab = {
  href: string;
  label: string;
  matches: (path: string) => boolean;
};

const ALL_TABS: (Tab & { gated?: 'dreamai' })[] = [
  { href: '/coplanner',          label: 'HOME',     matches: p => p === '/coplanner' },
  { href: '/coplanner/muse',     label: 'MUSE',     matches: p => p.startsWith('/coplanner/muse') },
  { href: '/coplanner/threads',  label: 'THREADS',  matches: p => p.startsWith('/coplanner/threads') },
  { href: '/coplanner/dreamai',  label: 'DREAM AI', matches: p => p.startsWith('/coplanner/dreamai'), gated: 'dreamai' },
  { href: '/coplanner/settings', label: 'SETTINGS', matches: p => p.startsWith('/coplanner/settings') },
];

export default function TabBar() {
  const session  = useCircleSession();
  const pathname = usePathname() || '';
  const router   = useRouter();

  const tabs = ALL_TABS.filter(t => {
    if (t.gated === 'dreamai') return session.permissions?.dreamai_access_granted === true;
    return true;
  });

  return (
    <nav style={{
      position: 'fixed',
      left: 0, right: 0, bottom: 0,
      zIndex: 50,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      background: 'rgba(12,10,9,0.78)',
      backdropFilter: 'blur(24px) saturate(1.4)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
      borderTop: `0.5px solid ${HAIRLINE}`,
    }}>
      <div style={{
        maxWidth: 480, margin: '0 auto',
        display: 'flex', alignItems: 'stretch', justifyContent: 'space-between',
        padding: '0 8px',
      }}>
        {tabs.map(t => {
          const active = t.matches(pathname);
          return (
            <button
              key={t.href}
              onClick={() => router.push(t.href)}
              style={{
                flex: 1,
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '14px 0 12px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                color: active ? CREAM : MUTED,
              }}>
              <span style={{
                fontFamily: FONT_EYEBROW, fontWeight: 300, fontSize: 9,
                letterSpacing: '0.22em',
              }}>{t.label}</span>
              <span style={{
                width: 18, height: 1,
                background: active ? GOLD : 'transparent',
              }} />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
